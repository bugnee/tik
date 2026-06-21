import type { ExperienceCampaign } from "../experience/types";
import type { ExperiencePublicListing } from "../experience/public-listing";
import {
  createDefaultPublicCampaignDetail,
  type PublicCampaignDetailContent,
} from "./detail";
import type { PublicCampaignListing } from "./types";

export interface MapCampaignToListingOptions {
  /** ERP 계약·고객사명 (카드 부제 등) */
  clientName?: string;
  /** 신청 수 — 공개 포털 신청 + ERP participants 합산 */
  applicationCount?: number;
}

/** ERP 체험단 + 공개 설정 → 공개 카드 */
export function mapExperienceCampaignToListing(
  campaign: ExperienceCampaign,
  options: MapCampaignToListingOptions = {},
): PublicCampaignListing | null {
  const listing = campaign.publicListing;
  if (!listing?.visible) return null;
  if (campaign.schedulingStatus !== "recruiting") return null;

  const benefit = campaign.criteria.providedBenefit?.trim();
  const title =
    listing.displayTitle?.trim() ||
    (options.clientName
      ? `[${options.clientName}] ${campaign.title}`
      : campaign.title);

  return {
    id: `pub-${campaign.id}`,
    campaignId: campaign.id,
    title,
    benefitSummary:
      benefit || campaign.criteria.requirements || "혜택 상세는 상세 페이지 참고",
    channel: listing.channel,
    deliveryType: listing.deliveryType,
    regionLabel: listing.regionLabel,
    applicationCount:
      options.applicationCount ?? campaign.participants.length,
    targetHeadcount: campaign.criteria.targetHeadcount,
    deadlineAt: listing.deadlineAt,
    points: listing.points,
    isPremium: listing.isPremium,
    schedulingStatus: campaign.schedulingStatus,
    createdAt: listing.publishedAt ?? campaign.createdAt,
    detail: listing.detail ?? buildDetailFallback(campaign, options),
  };
}

/** ERP criteria → 공개 상세 기본값 */
function buildDetailFallback(
  campaign: ExperienceCampaign,
  options: MapCampaignToListingOptions,
): PublicCampaignDetailContent | undefined {
  const lines: string[] = [];
  if (campaign.criteria.requirements) {
    lines.push(...campaign.criteria.requirements.split(/[·\n]/).map((s) => s.trim()).filter(Boolean));
  }
  if (campaign.criteria.notes) lines.push(campaign.criteria.notes);

  const hasContent =
    campaign.criteria.providedBenefit ||
    lines.length > 0 ||
    options.clientName;

  if (!hasContent) return undefined;

  return {
    hostName: options.clientName,
    providedService: campaign.criteria.providedBenefit,
    visitReservationLines: lines.length > 0 ? lines : undefined,
  };
}

/** 여러 체험단 → 공개 카탈로그 */
export function buildPublicCatalogFromCampaigns(
  campaigns: ExperienceCampaign[],
  optionsByCampaignId: Record<string, MapCampaignToListingOptions> = {},
): PublicCampaignListing[] {
  return campaigns
    .map((campaign) =>
      mapExperienceCampaignToListing(
        campaign,
        optionsByCampaignId[campaign.id] ?? {},
      ),
    )
    .filter((item): item is PublicCampaignListing => item !== null);
}

/** 공개 노출 기본값 — recruiting 전환 시 ERP에서 사용 */
export function createDefaultPublicListing(
  publishedByUserId: string,
  now = new Date(),
): ExperiencePublicListing {
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + 14);

  return {
    visible: true,
    channel: "blog",
    deliveryType: "visit",
    regionLabel: undefined,
    deadlineAt: deadline.toISOString(),
    isPremium: false,
    publishedAt: now.toISOString(),
    publishedByUserId,
    detail: createDefaultPublicCampaignDetail(),
  };
}
