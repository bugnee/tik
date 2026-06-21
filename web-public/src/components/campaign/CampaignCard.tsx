import Link from "next/link";
import {
  formatApplicationRatio,
  formatDeadlineLabel,
  PUBLIC_CAMPAIGN_CHANNEL_LABELS,
  PUBLIC_CAMPAIGN_DELIVERY_LABELS,
  type PublicCampaignListing,
} from "@tripitkorea/shared/public-campaign";
import { cn } from "@/lib/cn";

export function CampaignCard({ campaign }: { campaign: PublicCampaignListing }) {
  const deadlineLabel = formatDeadlineLabel(campaign.deadlineAt);
  const isClosingToday = deadlineLabel === "오늘 마감";

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className={cn(
        "group flex min-w-[260px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition",
        "hover:-translate-y-0.5 hover:border-[var(--accent)]/30 hover:shadow-md",
        campaign.isPremium && "border-[var(--premium)]/20 bg-[var(--premium-soft)]/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            isClosingToday
              ? "bg-rose-50 text-[var(--danger)]"
              : "bg-slate-100 text-[var(--foreground-secondary)]",
          )}
        >
          {deadlineLabel}
        </span>
        {campaign.isPremium ? (
          <span className="rounded-full bg-[var(--premium)] px-2.5 py-1 text-xs font-semibold text-white">
            PREMIUM
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {PUBLIC_CAMPAIGN_CHANNEL_LABELS[campaign.channel]}
        </span>
        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          {PUBLIC_CAMPAIGN_DELIVERY_LABELS[campaign.deliveryType]}
        </span>
      </div>

      <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-snug text-[var(--foreground)] group-hover:text-[var(--accent)]">
        {campaign.regionLabel ? `${campaign.regionLabel} ` : ""}
        {campaign.title}
      </h3>

      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--muted)]">
        {campaign.benefitSummary}
      </p>

      <div className="mt-auto flex items-end justify-between pt-4">
        <p className="text-xs font-medium text-[var(--foreground-secondary)]">
          {formatApplicationRatio(campaign)}
        </p>
        {campaign.points ? (
          <p className="text-sm font-bold text-[var(--premium)]">
            {campaign.points.toLocaleString("ko-KR")} P
          </p>
        ) : null}
      </div>
    </Link>
  );
}
