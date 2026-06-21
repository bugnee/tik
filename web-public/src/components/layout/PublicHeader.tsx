"use client";

import Link from "next/link";
import { Bell, Search, User } from "lucide-react";
import { usePublicAuth } from "@/context/PublicAuthContext";
import {
  readReviewerProfile,
} from "@/lib/reviewer-profile-utils";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/campaigns", label: "체험단 검색" },
  { href: "/guide", label: "이용가이드" },
];

export function PublicHeader() {
  const { reviewer } = usePublicAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!reviewer) {
      setDisplayName(null);
      return;
    }
    const profile = readReviewerProfile(reviewer.id);
    setDisplayName(profile.nickname?.trim() || reviewer.name);
  }, [reviewer]);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 text-lg font-bold tracking-tight text-[var(--foreground)]"
        >
          트립잇코리아<span className="text-[var(--accent)]"> 체험단</span>
        </Link>

        <Link
          href="/campaigns"
          className="mx-auto hidden max-w-md flex-1 items-center gap-2 rounded-full border border-[var(--border)] bg-slate-50 px-4 py-2 text-sm text-[var(--muted)] transition hover:border-[var(--accent)]/30 md:flex"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>어떤 체험단을 찾고 있나요?</span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-[var(--foreground-secondary)] transition hover:text-[var(--accent)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] md:hidden"
          >
            <Search className="h-4 w-4" />
          </Link>
          {reviewer ? (
            <>
              <button
                type="button"
                className="hidden rounded-lg p-2 text-[var(--muted)] hover:bg-slate-50 sm:inline-flex"
                aria-label="알림"
              >
                <Bell className="h-5 w-5" />
              </button>
              <Link
                href="/my"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-slate-50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                  <User className="h-4 w-4" />
                </span>
                <span className="hidden max-w-[88px] truncate sm:inline">
                  {displayName}
                </span>
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
