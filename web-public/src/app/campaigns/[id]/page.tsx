"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { usePublicPortal } from "@/context/PublicPortalContext";
import { CampaignApplySidebar } from "@/components/campaign/CampaignApplySidebar";
import { CampaignDetailMain } from "@/components/campaign/CampaignDetailMain";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getCampaignById } = usePublicPortal();
  const campaign = getCampaignById(params.id);

  if (!campaign) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-[var(--muted)]">체험단을 찾을 수 없습니다.</p>
        <Link
          href="/campaigns"
          className="text-sm text-[var(--accent)] hover:underline"
        >
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/campaigns"
        className="mb-4 inline-block text-sm text-[var(--muted)] hover:text-[var(--accent)]"
      >
        ← 체험단 검색
      </Link>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <CampaignDetailMain campaign={campaign} />
        </div>
        <CampaignApplySidebar
          campaign={campaign}
          onApplied={() => router.push("/my")}
        />
      </div>
    </div>
  );
}
