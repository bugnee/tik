import { formatRegionLabel } from "./korea-regions";
import { getContractLocation } from "./location-profile-utils";
import type {
  AppData,
  Contract,
  ExperienceCampaign,
  ExperiencePartnerSlot,
  ExperienceParticipationProposal,
  ExperienceSchedulingStatus,
  Partner,
} from "./types";

export const EXPERIENCE_PARTNER_SLOT_STATUS_LABELS: Record<
  ExperiencePartnerSlot["status"],
  string
> = {
  open: "모집 중",
  claimed: "선정됨",
  cancelled: "취소",
};

export const EXPERIENCE_PARTICIPATION_PROPOSAL_STATUS_LABELS: Record<
  ExperienceParticipationProposal["status"],
  string
> = {
  pending: "검토 중",
  accepted: "승인됨",
  rejected: "반려",
};

/** 파트너에게 공유 가능한 진행 중 체험단 캠페인 상태 */
export const PARTNER_SHAREABLE_CAMPAIGN_STATUSES: ExperienceSchedulingStatus[] =
  ["coordinating", "confirmed", "recruiting"];

export type PartnerExperienceOffer =
  | {
      kind: "slot";
      key: string;
      slot: ExperiencePartnerSlot;
      campaign: ExperienceCampaign;
      contract: Contract;
    }
  | {
      kind: "campaign";
      key: string;
      campaign: ExperienceCampaign;
      contract: Contract;
      suggestedDate?: string;
      suggestedTime?: string;
      suggestedEndTime?: string;
    };

export function getCampaignPartnerSlots(
  slots: ExperiencePartnerSlot[],
  campaignId: string,
): ExperiencePartnerSlot[] {
  return slots
    .filter((slot) => slot.campaignId === campaignId)
    .sort((a, b) => a.visitDate.localeCompare(b.visitDate));
}

export function getOpenPartnerSlotsForPartner(
  data: AppData,
  partner: Partner,
): Array<{
  slot: ExperiencePartnerSlot;
  campaign: ExperienceCampaign;
  contract: Contract;
}> {
  return (data.experiencePartnerSlots ?? [])
    .filter((slot) => slot.status === "open")
    .map((slot) => {
      const campaign = (data.experienceCampaigns ?? []).find(
        (item) => item.id === slot.campaignId,
      );
      const contract = data.contracts.find((item) => item.id === slot.contractId);
      if (!campaign || !contract) return null;
      if (!PARTNER_SHAREABLE_CAMPAIGN_STATUSES.includes(campaign.schedulingStatus)) {
        return null;
      }
      return { slot, campaign, contract };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.slot.visitDate.localeCompare(b.slot.visitDate));
}

/** 진행 중 · 참여 가능 체험단 일정(공유 슬롯 + 모집 캠페인) */
export function getPartnerExperienceOffers(
  data: AppData,
  partner: Partner,
): PartnerExperienceOffer[] {
  const offers: PartnerExperienceOffer[] = [];
  const openSlotCampaignIds = new Set<string>();

  for (const item of getOpenPartnerSlotsForPartner(data, partner)) {
    openSlotCampaignIds.add(item.campaign.id);
    offers.push({
      kind: "slot",
      key: `slot-${item.slot.id}`,
      ...item,
    });
  }

  for (const campaign of data.experienceCampaigns ?? []) {
    if (!PARTNER_SHAREABLE_CAMPAIGN_STATUSES.includes(campaign.schedulingStatus)) {
      continue;
    }
    const contract = data.contracts.find((item) => item.id === campaign.contractId);
    if (!contract || contract.status !== "active") continue;
    if (openSlotCampaignIds.has(campaign.id)) continue;

    offers.push({
      kind: "campaign",
      key: `campaign-${campaign.id}`,
      campaign,
      contract,
      suggestedDate: campaign.confirmedVisitDate,
      suggestedTime: campaign.confirmedVisitTime,
      suggestedEndTime: campaign.confirmedVisitEndTime,
    });
  }

  return offers.sort((a, b) => {
    const dateA =
      a.kind === "slot"
        ? a.slot.visitDate
        : a.suggestedDate ?? "9999-12-31";
    const dateB =
      b.kind === "slot"
        ? b.slot.visitDate
        : b.suggestedDate ?? "9999-12-31";
    return dateA.localeCompare(dateB);
  });
}

export function getPartnerParticipationProposals(
  data: AppData,
  partnerId: string,
): ExperienceParticipationProposal[] {
  return (data.experienceParticipationProposals ?? [])
    .filter((item) => item.partnerId === partnerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getPendingParticipationProposalsForStaff(
  data: AppData,
  contractIds: Set<string>,
): ExperienceParticipationProposal[] {
  return (data.experienceParticipationProposals ?? [])
    .filter(
      (item) =>
        item.status === "pending" && contractIds.has(item.contractId),
    )
    .sort((a, b) => a.visitDate.localeCompare(b.visitDate));
}

export function partnerHasPendingProposal(
  proposals: ExperienceParticipationProposal[],
  partnerId: string,
  campaignId: string,
  slotId?: string,
): boolean {
  return proposals.some(
    (item) =>
      item.partnerId === partnerId &&
      item.campaignId === campaignId &&
      item.slotId === slotId &&
      item.status === "pending",
  );
}

export function formatExperienceSlotSchedule(slot: ExperiencePartnerSlot): string {
  const time =
    slot.visitTime && slot.visitEndTime
      ? ` ${slot.visitTime}~${slot.visitEndTime}`
      : slot.visitTime
        ? ` ${slot.visitTime}`
        : "";
  return `${slot.visitDate}${time}`;
}

export function formatExperienceOfferSchedule(offer: PartnerExperienceOffer): string {
  if (offer.kind === "slot") {
    return formatExperienceSlotSchedule(offer.slot);
  }
  const time =
    offer.suggestedTime && offer.suggestedEndTime
      ? ` ${offer.suggestedTime}~${offer.suggestedEndTime}`
      : offer.suggestedTime
        ? ` ${offer.suggestedTime}`
        : "";
  return offer.suggestedDate
    ? `${offer.suggestedDate}${time}`
    : "일정 협의 중";
}

export function formatExperienceSlotLocation(slot: ExperiencePartnerSlot): string {
  if (slot.address) {
    return `${formatRegionLabel(slot.regionProvince, slot.regionCity)} · ${slot.address}`;
  }
  return formatRegionLabel(slot.regionProvince, slot.regionCity);
}

export function formatContractExperienceLocation(contract: Contract): string {
  const loc = getContractLocation(contract);
  const region = formatRegionLabel(loc.regionProvince, loc.regionCity);
  if (loc.address) {
    if (region === "지역 미설정") return loc.address;
    return `${region} · ${loc.address}`;
  }
  return region;
}

export function buildSlotFromContractLocation(
  contract: Contract,
  fallbackAddress?: string,
): Pick<
  ExperiencePartnerSlot,
  "regionProvince" | "regionCity" | "address"
> {
  return {
    regionProvince: contract.regionProvince ?? "",
    regionCity: contract.regionCity ?? "",
    address: contract.address ?? fallbackAddress ?? "",
  };
}
