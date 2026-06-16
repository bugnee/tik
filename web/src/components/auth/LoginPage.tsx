"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, LogIn, Plane } from "lucide-react";
import { DEMO_GOOGLE_ACCOUNTS, useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { AppReadyGate } from "@/components/layout/Providers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getClientPortalAccounts } from "@/lib/selectors";
import type { AuthSessionUser } from "@/lib/auth-utils";

function LoginScreen() {
  const router = useRouter();
  const data = useData();
  const { status, loginWithGoogle, loginWithDemoAccount, isSupabaseAuth } =
    useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const clientPortalAccounts = useMemo(
    () => getClientPortalAccounts(data),
    [data],
  );

  const staticDemoIds = useMemo(
    () => new Set(DEMO_GOOGLE_ACCOUNTS.map((a) => a.googleId)),
    [],
  );

  const extraClientAccounts = useMemo(
    () =>
      clientPortalAccounts.filter(
        ({ profile }) => !staticDemoIds.has(profile.googleId),
      ),
    [clientPortalAccounts, staticDemoIds],
  );

  useEffect(() => {
    if (status === "approved") router.replace("/dashboard");
    if (status === "pending" || status === "rejected") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  async function handleGoogleLogin() {
    setError(null);
    setLoadingGoogle(true);
    try {
      await loginWithGoogle();
    } catch {
      setError(
        "Google 로그인을 사용하려면 Supabase 환경 변수를 설정해 주세요. 아래 데모 계정으로 체험할 수 있습니다.",
      );
    } finally {
      setLoadingGoogle(false);
    }
  }

  function loginAsClient(profile: {
    googleId: string;
    email: string;
    name: string;
  }) {
    const session: AuthSessionUser = {
      googleId: profile.googleId,
      email: profile.email,
      name: profile.name,
    };
    loginWithDemoAccount(session);
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-emerald-600/5 blur-[120px]" />
        <div className="absolute -right-40 top-1/3 h-[400px] w-[400px] rounded-full bg-cyan-600/5 blur-[100px]" />
      </div>

      <Card className="relative w-full max-w-md border-zinc-800/80 bg-zinc-900/60 p-8 backdrop-blur-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-900/40">
            <Plane className="h-7 w-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold text-zinc-50">TRIP IT KOREA ERP</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Google 계정으로 로그인 후, 대표·임원 승인을 받아 이용합니다.
          </p>
        </div>

        <Button
          type="button"
          className="w-full"
          size="lg"
          loading={loadingGoogle}
          onClick={() => void handleGoogleLogin()}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google로 로그인
        </Button>

        {error && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {error}
          </p>
        )}

        {!isSupabaseAuth && (
          <div className="mt-8 border-t border-zinc-800 pt-6">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">
              데모 계정 (로컬 · Google 로그인 대체)
            </p>
            <div className="max-h-[min(420px,50vh)] space-y-2 overflow-y-auto pr-1">
              {DEMO_GOOGLE_ACCOUNTS.map((account) => (
                <button
                  key={account.googleId}
                  type="button"
                  onClick={() => loginWithDemoAccount(account)}
                  className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-left transition-colors hover:border-emerald-500/30 hover:bg-zinc-900"
                >
                  <LogIn className="h-4 w-4 shrink-0 text-emerald-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-zinc-200">
                        {account.name}
                      </p>
                      <span
                        className={
                          account.roleLabel === "승인 대기"
                            ? "rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
                            : "rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400"
                        }
                      >
                        {account.roleLabel}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">{account.email}</p>
                    {account.description && (
                      <p className="mt-0.5 text-[11px] text-zinc-600">
                        {account.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-[11px] text-zinc-600">
              역할별 즉시 로그인 · 「승인 대기」는 권한 승인 화면 체험용
            </p>

            {extraClientAccounts.length > 0 && (
              <div className="mt-6 border-t border-zinc-800 pt-6">
                <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  등록된 고객사 포털
                </p>
                <div className="space-y-2">
                  {extraClientAccounts.map(({ profile, contractName }) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => loginAsClient(profile)}
                      className="flex w-full items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-left transition-colors hover:border-rose-500/40 hover:bg-rose-500/10"
                    >
                      <Building2 className="h-4 w-4 shrink-0 text-rose-400" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-zinc-200">
                            {contractName}
                          </p>
                          <span className="rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                            고객사
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500">{profile.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

export function LoginPage() {
  return (
    <AppReadyGate message="로그인 화면 준비 중…">
      <LoginScreen />
    </AppReadyGate>
  );
}
