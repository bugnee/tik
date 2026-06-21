"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import {
  DEMO_REVIEWER_ACCOUNTS,
  usePublicAuth,
} from "@/context/PublicAuthContext";

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/my";
  const { ready, reviewer, loginAsDemo } = usePublicAuth();

  useEffect(() => {
    if (ready && reviewer) {
      router.replace(next);
    }
  }, [ready, reviewer, router, next]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--accent)]">
        ← 홈
      </Link>
      <div>
        <h1 className="text-2xl font-bold">리뷰어 로그인</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          데모 계정으로 체험단 신청·마이페이지를 이용할 수 있습니다.
        </p>
      </div>

      <div className="space-y-3">
        {DEMO_REVIEWER_ACCOUNTS.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => {
              loginAsDemo(account);
              router.push(next);
            }}
            className="flex w-full flex-col rounded-2xl border border-[var(--border)] bg-white px-5 py-4 text-left transition hover:border-[var(--accent)]/40 hover:shadow-sm"
          >
            <span className="font-semibold text-[var(--foreground)]">{account.name}</span>
            <span className="mt-0.5 text-xs text-[var(--muted)]">{account.email}</span>
            <span className="mt-2 text-sm text-[var(--foreground-secondary)]">
              {account.description}
            </span>
          </button>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-[var(--muted)]">
        추후 Google 로그인(Supabase)과 ERP 담당자 선정 흐름이 연결됩니다.
      </p>
    </div>
  );
}
