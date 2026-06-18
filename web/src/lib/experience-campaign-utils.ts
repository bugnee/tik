import type {
  AppData,
  Contract,
  ExperienceCampaign,
  ExperienceFieldDefinition,
  ExperienceParticipant,
  ExperienceParticipantInput,
  ExperienceRecruitmentCriteria,
  ExperienceScheduleProposal,
  ExperienceScheduleProposalInput,
  ExperienceSchedulingStatus,
  WorkOrder,
} from "./types";
import {
  DEFAULT_EXPERIENCE_FIELDS,
  getDefaultExperienceCategoryId,
} from "./experience-field-utils";

export const EXPERIENCE_SCHEDULING_STATUS_LABELS: Record<
  ExperienceSchedulingStatus,
  string
> = {
  draft: "작성 중",
  coordinating: "고객사 조율",
  confirmed: "일정 확정",
  recruiting: "참가자 접수",
  completed: "완료",
  cancelled: "취소",
};

export const EXPERIENCE_STATUS_BADGE_VARIANT: Record<
  ExperienceSchedulingStatus,
  "default" | "warning" | "success" | "info" | "danger"
> = {
  draft: "default",
  coordinating: "warning",
  confirmed: "info",
  recruiting: "success",
  completed: "success",
  cancelled: "danger",
};

export function getContractExperienceCampaigns(
  campaigns: ExperienceCampaign[],
  contractId: string,
): ExperienceCampaign[] {
  return campaigns
    .filter((c) => c.contractId === contractId)
    .sort((a, b) => a.sequence - b.sequence);
}

export function findExperienceWorkOrder(
  workOrders: WorkOrder[],
  contractId: string,
  sequence = 1,
): WorkOrder | undefined {
  return workOrders.find(
    (o) =>
      o.contractId === contractId &&
      o.taskType === "experience" &&
      o.sequence === sequence,
  );
}

export function defaultExperienceCriteria(
  fields: ExperienceFieldDefinition[] = DEFAULT_EXPERIENCE_FIELDS,
): ExperienceRecruitmentCriteria {
  return {
    targetHeadcount: 10,
    category: getDefaultExperienceCategoryId(fields),
    requirements: "",
    providedBenefit: "",
    notes: "",
  };
}

export function createExperienceCampaignDraft(
  contract: Contract,
  campaigns: ExperienceCampaign[],
  workOrders: WorkOrder[],
  createdByUserId: string,
  fields: ExperienceFieldDefinition[] = DEFAULT_EXPERIENCE_FIELDS,
): Omit<ExperienceCampaign, "id"> {
  const existing = getContractExperienceCampaigns(campaigns, contract.id);
  const sequence = existing.length + 1;
  const linked = findExperienceWorkOrder(workOrders, contract.id, sequence);

  return {
    contractId: contract.id,
    workOrderId: linked?.id,
    title: `${sequence}차 체험단`,
    sequence,
    criteria: defaultExperienceCriteria(fields),
    schedulingStatus: "draft",
    proposals: [],
    participants: [],
    createdByUserId,
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

export function formatExperienceVisitSchedule(campaign: ExperienceCampaign): string {
  if (!campaign.confirmedVisitDate) return "미확정";
  const time =
    campaign.confirmedVisitTime && campaign.confirmedVisitEndTime
      ? ` ${campaign.confirmedVisitTime}~${campaign.confirmedVisitEndTime}`
      : campaign.confirmedVisitTime
        ? ` ${campaign.confirmedVisitTime}`
        : "";
  return `${campaign.confirmedVisitDate}${time}`;
}

export function formatProposalSchedule(proposal: ExperienceScheduleProposal): string {
  const time =
    proposal.visitTime && proposal.visitEndTime
      ? ` ${proposal.visitTime}~${proposal.visitEndTime}`
      : proposal.visitTime
        ? ` ${proposal.visitTime}`
        : "";
  return `${proposal.visitDate}${time}`;
}

export function pendingProposal(
  campaign: ExperienceCampaign,
): ExperienceScheduleProposal | undefined {
  return campaign.proposals.find((p) => p.status === "pending");
}

export function canStaffManageExperience(role: string): boolean {
  return role === "staff" || role === "team_leader";
}

export function canClientCoordinateExperience(role: string): boolean {
  return role === "client";
}

export function experienceCampaignsForCalendar(
  campaigns: ExperienceCampaign[],
  contractId?: string,
): ExperienceCampaign[] {
  return campaigns.filter(
    (c) =>
      (!contractId || c.contractId === contractId) &&
      !!c.confirmedVisitDate &&
      c.schedulingStatus !== "cancelled",
  );
}

export function buildProposal(
  input: ExperienceScheduleProposalInput,
  userId: string,
): ExperienceScheduleProposal {
  return {
    ...input,
    id: `esp-${crypto.randomUUID().slice(0, 8)}`,
    proposedByUserId: userId,
    createdAt: new Date().toISOString().slice(0, 10),
    status: "pending",
  };
}

export function applyAcceptedProposal(
  campaign: ExperienceCampaign,
  proposal: ExperienceScheduleProposal,
  confirmedByUserId: string,
): ExperienceCampaign {
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...campaign,
    schedulingStatus: "recruiting",
    confirmedVisitDate: proposal.visitDate,
    confirmedVisitTime: proposal.visitTime,
    confirmedVisitEndTime: proposal.visitEndTime,
    confirmedAt: today,
    confirmedByUserId,
    updatedAt: today,
    proposals: campaign.proposals.map((p) =>
      p.id === proposal.id
        ? { ...p, status: "accepted" as const }
        : p.status === "pending"
          ? { ...p, status: "rejected" as const }
          : p,
    ),
  };
}

export function enrichExperienceCampaign(
  data: AppData,
  campaign: ExperienceCampaign,
) {
  const contract = data.contracts.find((c) => c.id === campaign.contractId);
  return {
    ...campaign,
    clientName: contract?.clientName ?? "-",
  };
}

export type EnrichedExperienceCampaign = ReturnType<
  typeof enrichExperienceCampaign
>;

export function createParticipantRecord(
  input: ExperienceParticipantInput,
  registeredByUserId: string,
) {
  return {
    ...input,
    blogName: input.blogName?.trim() || input.snsHandle?.trim() || undefined,
    headcount: input.headcount && input.headcount > 0 ? input.headcount : 1,
    id: `exp-${crypto.randomUUID().slice(0, 8)}`,
    registeredAt: new Date().toISOString().slice(0, 10),
    registeredByUserId,
  };
}

export function normalizeExperienceParticipant(
  participant: ExperienceParticipant,
): ExperienceParticipant {
  return {
    ...participant,
    blogName:
      participant.blogName?.trim() ||
      participant.snsHandle?.trim() ||
      undefined,
    headcount:
      participant.headcount && participant.headcount > 0
        ? participant.headcount
        : 1,
  };
}

export function normalizeExperienceCampaigns(
  campaigns: ExperienceCampaign[],
): ExperienceCampaign[] {
  return campaigns.map((campaign) => ({
    ...campaign,
    participants: campaign.participants.map(normalizeExperienceParticipant),
  }));
}

export function emptyParticipantInput(
  campaign: ExperienceCampaign,
): ExperienceParticipantInput {
  return {
    blogName: "",
    name: "",
    contact: "",
    experienceDate: campaign.confirmedVisitDate ?? "",
    headcount: 1,
    memo: "",
    postUrl: "",
    postRegisteredAt: "",
  };
}

export type ExperienceTimelineEntry = {
  campaignId: string;
  campaignTitle: string;
  participant: ExperienceParticipant;
};

export function getExperienceTimelineEntries(
  campaigns: ExperienceCampaign[],
  contractId: string,
): ExperienceTimelineEntry[] {
  const entries: ExperienceTimelineEntry[] = [];
  for (const campaign of getContractExperienceCampaigns(campaigns, contractId)) {
    if (campaign.schedulingStatus === "cancelled") continue;
    for (const participant of campaign.participants) {
      if (!participant.name?.trim() && !participant.blogName?.trim()) continue;
      entries.push({
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        participant,
      });
    }
  }
  return entries.sort((a, b) => {
    const dateA =
      a.participant.experienceDate ||
      a.participant.postRegisteredAt ||
      a.participant.registeredAt;
    const dateB =
      b.participant.experienceDate ||
      b.participant.postRegisteredAt ||
      b.participant.registeredAt;
    return dateB.localeCompare(dateA);
  });
}

export function formatParticipantLabel(participant: ExperienceParticipant): string {
  const blog = participant.blogName || participant.snsHandle;
  if (blog && participant.name) return `${blog} · ${participant.name}`;
  return participant.name || blog || "참가자";
}
