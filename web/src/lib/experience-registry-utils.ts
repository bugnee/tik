import {
  matchesPeriodDate,
  periodFilterLabel,
  type PeriodFilterValue,
} from "@/lib/date-filter-utils";
import { formatExperienceVisitSchedule } from "@/lib/experience-campaign-utils";
import type {
  AppData,
  Contract,
  ExperienceCampaign,
  ExperienceParticipant,
  ExperiencePartnerSlot,
  ExperienceParticipationProposal,
  ExperienceSchedulingStatus,
  Partner,
} from "@/lib/types";

/** 내부 체험단 대장 — 캠페인 1행 */
export interface ExperienceRegistryRow {
  campaignId: string;
  contractId: string;
  /** 고객사 표시명 (회사명 우선) */
  clientName: string;
  /** 상호명 (회사명과 다를 때 부가 표시) */
  clientTradeName?: string;
  partnerNames: string;
  partnerIds: string[];
  campaignTitle: string;
  clientPhone: string;
  partnerPhone: string;
  /** 기간 필터·정렬용 대표 체험일 */
  visitDate: string;
  visitScheduleLabel: string;
  status: ExperienceSchedulingStatus;
  participantCount: number;
  participants: ExperienceParticipant[];
  sequence: number;
  createdAt: string;
}

export type ExperienceRegistrySortKey = "title" | "client" | "visitDate";
export type ExperienceRegistrySortDirection = "asc" | "desc";

/** 체험일 우선순위: 확정일 > 참가자 체험일 > 슬롯 방문일 > 등록일 */
export function resolveCampaignVisitDate(
  campaign: ExperienceCampaign,
  slots: ExperiencePartnerSlot[],
): string {
  if (campaign.confirmedVisitDate) return campaign.confirmedVisitDate;

  const participantDates = campaign.participants
    .map((p) => p.experienceDate)
    .filter((d): d is string => Boolean(d))
    .sort();
  if (participantDates.length > 0) return participantDates[0];

  const slotDates = slots
    .filter(
      (s) => s.campaignId === campaign.id && s.status !== "cancelled",
    )
    .map((s) => s.visitDate)
    .sort();
  if (slotDates.length > 0) return slotDates[0];

  return campaign.createdAt;
}

/** 선정 슬롯·승인된 참여 제안에서 파트너 ID 수집 */
export function resolveCampaignPartnerIds(
  campaignId: string,
  slots: ExperiencePartnerSlot[],
  proposals: ExperienceParticipationProposal[],
): string[] {
  const ids = new Set<string>();

  for (const slot of slots) {
    if (
      slot.campaignId === campaignId &&
      slot.status === "claimed" &&
      slot.claimedByPartnerId
    ) {
      ids.add(slot.claimedByPartnerId);
    }
  }

  for (const proposal of proposals) {
    if (proposal.campaignId === campaignId && proposal.status === "accepted") {
      ids.add(proposal.partnerId);
    }
  }

  return [...ids];
}

function formatClientPhone(contract?: Contract): string {
  if (!contract) return "-";
  const phones = [
    contract.clientContactPhone,
    contract.clientPhone,
  ].filter((p): p is string => Boolean(p));
  return [...new Set(phones)].join(" / ") || "-";
}

function formatPartnerPhones(partners: Partner[]): string {
  const phones = partners
    .map((p) => p.phone)
    .filter((p): p is string => Boolean(p));
  return [...new Set(phones)].join(" / ") || "-";
}

function formatPartnerNames(partners: Partner[]): string {
  if (partners.length === 0) return "-";
  return partners.map((p) => p.companyName).join(", ");
}

/** draft 제외 · 접근 가능 계약의 체험단을 대장 행으로 변환 */
export function buildExperienceRegistryRows(
  data: AppData,
  contractIds: Set<string>,
): ExperienceRegistryRow[] {
  const slots = data.experiencePartnerSlots ?? [];
  const proposals = data.experienceParticipationProposals ?? [];

  return (data.experienceCampaigns ?? [])
    .filter(
      (c) =>
        c.schedulingStatus !== "draft" && contractIds.has(c.contractId),
    )
    .map((campaign) => {
      const contract = data.contracts.find((c) => c.id === campaign.contractId);
      const partnerIds = resolveCampaignPartnerIds(
        campaign.id,
        slots,
        proposals,
      );
      const partners = partnerIds
        .map((id) => data.partners.find((p) => p.id === id))
        .filter((p): p is Partner => Boolean(p));

      const visitDate = resolveCampaignVisitDate(campaign, slots);
      const companyName = contract?.companyName?.trim();
      const tradeName = contract?.clientName?.trim();

      return {
        campaignId: campaign.id,
        contractId: campaign.contractId,
        clientName: companyName || tradeName || "-",
        clientTradeName:
          companyName && tradeName && companyName !== tradeName
            ? tradeName
            : undefined,
        partnerNames: formatPartnerNames(partners),
        partnerIds,
        campaignTitle: campaign.title,
        clientPhone: formatClientPhone(contract),
        partnerPhone: formatPartnerPhones(partners),
        visitDate,
        visitScheduleLabel: formatExperienceVisitSchedule(campaign),
        status: campaign.schedulingStatus,
        participantCount: campaign.participants.length,
        participants: campaign.participants,
        sequence: campaign.sequence,
        createdAt: campaign.createdAt,
      };
    });
}

/** 기간·텍스트 검색 적용 */
export function filterExperienceRegistryRows(
  rows: ExperienceRegistryRow[],
  options: {
    periodFilter: PeriodFilterValue;
    search: string;
  },
): ExperienceRegistryRow[] {
  const q = options.search.trim().toLowerCase();

  return rows.filter((row) => {
    if (!matchesPeriodDate(row.visitDate, options.periodFilter)) return false;
    if (!q) return true;

    const haystack = [
      row.clientName,
      row.clientTradeName,
      row.campaignTitle,
      row.partnerNames,
      row.clientPhone,
      row.partnerPhone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function sortExperienceRegistryRows(
  rows: ExperienceRegistryRow[],
  key: ExperienceRegistrySortKey,
  direction: ExperienceRegistrySortDirection,
): ExperienceRegistryRow[] {
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "title":
        cmp = a.campaignTitle.localeCompare(b.campaignTitle, "ko");
        break;
      case "client":
        cmp = a.clientName.localeCompare(b.clientName, "ko");
        break;
      case "visitDate":
        cmp = a.visitDate.localeCompare(b.visitDate);
        break;
    }
    return direction === "asc" ? cmp : -cmp;
  });
}

export function experienceRegistryPeriodSummary(
  rows: ExperienceRegistryRow[],
  periodFilter: PeriodFilterValue,
): string {
  const label = periodFilterLabel(periodFilter);
  const participants = rows.reduce((sum, r) => sum + r.participantCount, 0);
  return `${label} · ${rows.length}건 · 참가자 ${participants}명`;
}
