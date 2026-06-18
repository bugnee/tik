"use client";

import {
  Camera,
  ExternalLink,
  Globe,
  MapPin,
  Users,
  Video,
} from "lucide-react";
import { getAvailableClientLinks, type ClientLinkKey } from "@/lib/client-links-utils";
import { cn } from "@/lib/cn";
import type { Contract, ExperienceCampaign } from "@/lib/types";

const LINK_ICON: Record<ClientLinkKey, typeof MapPin> = {
  place: MapPin,
  instagram: Camera,
  youtube: Video,
  other: Globe,
};

function normalizeHref(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

/** 파트너 체험단 일정 카드 — 업체 확인용 링크·모집 조건 요약 */
export function ExperienceOfferVerifyInfo({
  contract,
  campaign,
  className,
}: {
  contract: Contract;
  campaign: ExperienceCampaign;
  className?: string;
}) {
  const links = getAvailableClientLinks(contract);
  const placeLink = links.find((item) => item.key === "place");
  const channelLinks = links.filter((item) => item.key !== "place");
  const { criteria } = campaign;

  const metaItems: string[] = [];
  if (criteria.category?.trim()) metaItems.push(criteria.category.trim());
  if (criteria.targetHeadcount > 0) {
    metaItems.push(`모집 ${criteria.targetHeadcount}명`);
  }
  if (contract.companyName?.trim() && contract.companyName !== contract.clientName) {
    metaItems.push(contract.companyName.trim());
  }

  const hasDetail =
    links.length > 0 ||
    metaItems.length > 0 ||
    Boolean(criteria.requirements?.trim()) ||
    Boolean(criteria.notes?.trim());

  if (!hasDetail) {
    return (
      <p className={cn("text-xs text-zinc-600", className)}>
        등록된 업체 링크·모집 조건이 없습니다.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      {(placeLink || channelLinks.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {placeLink && (
            <a
              href={normalizeHref(placeLink.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              플레이스 보기
              <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
            </a>
          )}
          {channelLinks.map((item) => {
            const Icon = LINK_ICON[item.key];
            return (
              <a
                key={item.key}
                href={normalizeHref(item.url)}
                target="_blank"
                rel="noopener noreferrer"
                title={item.url}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900/60 px-2 py-1 text-[11px] text-zinc-300 transition hover:border-cyan-500/30 hover:text-cyan-200"
              >
                <Icon className="h-3 w-3 shrink-0" />
                {item.label.replace(" 링크", "")}
              </a>
            );
          })}
        </div>
      )}

      {metaItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {metaItems.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-800/80 px-2 py-0.5 text-[11px] text-zinc-400"
            >
              {label.includes("모집") && <Users className="h-3 w-3 shrink-0" />}
              {label}
            </span>
          ))}
        </div>
      )}

      {criteria.requirements?.trim() && (
        <p className="text-xs leading-relaxed text-zinc-400">
          <span className="font-medium text-zinc-500">요구사항 · </span>
          {criteria.requirements.trim()}
        </p>
      )}

      {criteria.notes?.trim() && (
        <p className="text-xs leading-relaxed text-zinc-500">
          <span className="font-medium text-zinc-600">참고 · </span>
          {criteria.notes.trim()}
        </p>
      )}
    </div>
  );
}
