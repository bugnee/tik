"use client";

import Link from "next/link";
import { useState } from "react";
import type { PublicCampaignListing } from "@tripitkorea/shared/public-campaign";
import { usePublicAuth } from "@/context/PublicAuthContext";
import { usePublicPortal } from "@/context/PublicPortalContext";

export function ApplyCampaignPanel({
  campaign,
  onApplied,
}: {
  campaign: PublicCampaignListing;
  onApplied?: () => void;
}) {
  const { reviewer } = usePublicAuth();
  const { hasApplied, applyToCampaign } = usePublicPortal();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const applied = reviewer && hasApplied(campaign.id, reviewer.id);

  if (!reviewer) {
    return (
      <div className="mt-8 space-y-3">
        <p className="text-sm text-[var(--muted)]">
          체험단 신청은 로그인 후 가능합니다.
        </p>
        <Link
          href={`/login?next=/campaigns/${campaign.id}`}
          className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          로그인하고 신청하기
        </Link>
      </div>
    );
  }

  if (applied || done) {
    return (
      <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <p className="font-semibold">신청이 완료되었습니다.</p>
        <p className="mt-1 text-emerald-700/90">선정 결과는 마이페이지에서 확인하세요.</p>
        <Link
          href="/my"
          className="mt-3 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
        >
          마이페이지 →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-3">
      <label className="block text-sm font-medium text-[var(--foreground-secondary)]">
        한 줄 소개 (선택)
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="채널 소개 · 체험 각오 등"
          className="mt-1.5 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </label>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <button
        type="button"
        onClick={() => {
          setError(null);
          const result = applyToCampaign({
            listingId: campaign.id,
            campaignId: campaign.campaignId,
            reviewerId: reviewer.id,
            reviewerName: reviewer.name,
            reviewerEmail: reviewer.email,
            channelHandle: reviewer.channelHandle,
            message: message.trim() || undefined,
          });
          if (!result.ok) {
            setError(result.reason);
            return;
          }
          setDone(true);
          onApplied?.();
        }}
        className="w-full rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
      >
        체험단 신청하기
      </button>
    </div>
  );
}
