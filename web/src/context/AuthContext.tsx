"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/context/DataContext";
import {
  DEMO_GOOGLE_ACCOUNTS,
  isSupabaseConfigured,
  mapSupabaseUser,
  readMockAuthSession,
  signInWithGoogleRedirect,
  writeMockAuthSession,
  type AuthSessionUser,
} from "@/lib/auth-utils";
import { supabase } from "@/lib/supabase";
import type { AccountProfile } from "@/lib/types";

type AuthStatus =
  | "loading"
  | "unauthenticated"
  | "pending"
  | "approved"
  | "rejected";

interface AuthContextValue {
  status: AuthStatus;
  sessionUser: AuthSessionUser | null;
  accountProfile: AccountProfile | null;
  isSupabaseAuth: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithDemoAccount: (account: AuthSessionUser) => void;
  logout: () => Promise<void>;
  refreshAccount: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { hydrated, upsertAccountFromAuth, accountProfiles } = useData();
  const [sessionUser, setSessionUser] = useState<AuthSessionUser | null>(null);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(
    null,
  );
  const [bootstrapped, setBootstrapped] = useState(false);

  const syncProfile = useCallback(
    (user: AuthSessionUser | null) => {
      if (!user) {
        setAccountProfile(null);
        return;
      }
      const profile = upsertAccountFromAuth(user);
      setAccountProfile(profile);
    },
    [upsertAccountFromAuth],
  );

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function init() {
      try {
        if (isSupabaseConfigured() && supabase) {
          const sessionResult = await Promise.race([
            supabase.auth.getSession(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("AUTH_TIMEOUT")), 8000),
            ),
          ]);

          if (cancelled) return;

          if (sessionResult.data.session?.user) {
            const mapped = mapSupabaseUser(sessionResult.data.session.user);
            setSessionUser(mapped);
            syncProfile(mapped);
          } else {
            setSessionUser(null);
            setAccountProfile(null);
          }

          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, session) => {
            if (cancelled) return;
            if (session?.user) {
              const mapped = mapSupabaseUser(session.user);
              setSessionUser(mapped);
              syncProfile(mapped);
            } else {
              setSessionUser(null);
              setAccountProfile(null);
            }
          });
          unsubscribe = () => subscription.unsubscribe();
          return;
        }

        const mock = readMockAuthSession();
        if (cancelled) return;
        setSessionUser(mock);
        if (mock) syncProfile(mock);
      } catch {
        if (!cancelled) {
          setSessionUser(null);
          setAccountProfile(null);
        }
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    }

    void init();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [hydrated, syncProfile]);

  useEffect(() => {
    if (!accountProfile) return;
    const latest = accountProfiles.find(
      (p) =>
        (accountProfile.googleId && p.googleId === accountProfile.googleId) ||
        (accountProfile.email && p.email === accountProfile.email),
    );
    if (latest) setAccountProfile(latest);
  }, [accountProfiles, accountProfile?.googleId, accountProfile?.email]);

  const status: AuthStatus = useMemo(() => {
    if (!bootstrapped || !hydrated) return "loading";
    if (!sessionUser) return "unauthenticated";
    if (!accountProfile) return "unauthenticated";
    if (accountProfile.status === "pending") return "pending";
    if (accountProfile.status === "rejected") return "rejected";
    return "approved";
  }, [bootstrapped, hydrated, sessionUser, accountProfile]);

  const loginWithGoogle = useCallback(async () => {
    if (isSupabaseConfigured() && supabase) {
      await signInWithGoogleRedirect(supabase);
      return;
    }
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }, []);

  const loginWithDemoAccount = useCallback(
    (account: AuthSessionUser) => {
      writeMockAuthSession(account);
      setSessionUser(account);
      syncProfile(account);
      router.replace("/dashboard");
    },
    [router, syncProfile],
  );

  const logout = useCallback(async () => {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    writeMockAuthSession(null);
    setSessionUser(null);
    setAccountProfile(null);
    router.replace("/login");
  }, [router]);

  const refreshAccount = useCallback(() => {
    if (sessionUser) syncProfile(sessionUser);
  }, [sessionUser, syncProfile]);

  return (
    <AuthContext.Provider
      value={{
        status,
        sessionUser,
        accountProfile,
        isSupabaseAuth: isSupabaseConfigured(),
        loginWithGoogle,
        loginWithDemoAccount,
        logout,
        refreshAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { DEMO_GOOGLE_ACCOUNTS };
