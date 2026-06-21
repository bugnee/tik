"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CampaignCard } from "@/components/campaign/CampaignCard";
import { usePublicPortal } from "@/context/PublicPortalContext";
import { getDaysUntilDeadline } from "@tripitkorea/shared/public-campaign";

export default function CampaignsPageClient() {
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort");
  const { campaigns } = usePublicPortal();

  const sorted = useMemo(() => {
    const list = [...campaigns];
    if (sort === "closing") {
      return list.sort(
        (a, b) =>
          getDaysUntilDeadline(a.deadlineAt) - getDaysUntilDeadline(b.deadlineAt),
      );
    }
    return list.sort((a, b) => b.applicationCount - a.applicationCount);
  }, [campaigns, sort]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--accent)]">
          ← 홈
        </Link>
        <h1 className="mt-2 text-2xl font-bold">체험단 검색</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          모집 중인 체험단 {sorted.length}건
          {sort === "closing" ? " · 마감 임박 순" : " · 인기 순"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
    </div>
  );
}
