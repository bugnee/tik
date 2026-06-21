import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { PublicCampaignSection } from "@tripitkorea/shared/public-campaign";
import { CampaignCard } from "./CampaignCard";

export function CampaignSection({ section }: { section: PublicCampaignSection }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[var(--foreground)]">{section.title}</h2>
        <Link
          href={`/campaigns?section=${section.id}`}
          className="inline-flex items-center gap-0.5 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
        >
          더보기
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {section.campaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
    </section>
  );
}
