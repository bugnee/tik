"use client";

import Link from "next/link";
import { CampaignSection } from "@/components/campaign/CampaignSection";
import { usePublicPortal } from "@/context/PublicPortalContext";

export default function PublicHomePage() {
  const { sections } = usePublicPortal();

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--accent-soft)] to-white px-6 py-10 sm:px-10">
        <p className="text-sm font-medium text-[var(--accent)]">트립잇코리아 체험단</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          신뢰받는 체험단 모집 플랫폼
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--foreground-secondary)] sm:text-base">
          블로그·릴스·유튜브 등 다양한 채널의 체험단을 한곳에서 찾고 신청하세요.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/campaigns"
            className="inline-flex items-center rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            체험단 검색
          </Link>
          <Link
            href="/campaigns?sort=closing"
            className="inline-flex items-center rounded-xl border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-slate-50"
          >
            마감 임박 보기
          </Link>
        </div>
      </section>

      {sections.map((section) => (
        <CampaignSection key={section.id} section={section} />
      ))}

      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center">
          <p className="text-sm text-[var(--muted)]">
            현재 모집 중인 체험단이 없습니다.
          </p>
        </div>
      ) : null}
    </div>
  );
}
