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
import {
  DEMO_REVIEWER_ACCOUNTS,
  readReviewerSession,
  writeReviewerSession,
  type PublicReviewerSession,
} from "@/lib/auth-utils";

interface PublicAuthContextValue {
  ready: boolean;
  reviewer: PublicReviewerSession | null;
  loginAsDemo: (account: PublicReviewerSession) => void;
  logout: () => void;
}

const PublicAuthContext = createContext<PublicAuthContextValue | null>(null);

export function PublicAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [reviewer, setReviewer] = useState<PublicReviewerSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReviewer(readReviewerSession());
    setReady(true);
  }, []);

  const loginAsDemo = useCallback((account: PublicReviewerSession) => {
    writeReviewerSession(account);
    setReviewer(account);
  }, []);

  const logout = useCallback(() => {
    writeReviewerSession(null);
    setReviewer(null);
    router.push("/");
  }, [router]);

  const value = useMemo(
    () => ({
      ready,
      reviewer,
      loginAsDemo,
      logout,
    }),
    [ready, reviewer, loginAsDemo, logout],
  );

  return (
    <PublicAuthContext.Provider value={value}>
      {children}
    </PublicAuthContext.Provider>
  );
}

export function usePublicAuth() {
  const ctx = useContext(PublicAuthContext);
  if (!ctx) {
    throw new Error("usePublicAuth must be used within PublicAuthProvider");
  }
  return ctx;
}

export { DEMO_REVIEWER_ACCOUNTS };
