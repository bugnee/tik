import { canRunContractWork } from "@/lib/client-deposit-utils";
import {
  applyAcceptedProposal,
  buildProposal,
  createExperienceCampaignDraft,
  createParticipantRecord,
  normalizeExperienceParticipant,
} from "@/lib/experience-campaign-utils";
import {
  PARTNER_SHAREABLE_CAMPAIGN_STATUSES,
  partnerHasPendingProposal,
} from "@/lib/experience-partner-slot-utils";
import type {
  AppData,
  ExperienceCampaign,
  ExperienceFieldDefinition,
  ExperienceFieldDefinitionInput,
  ExperienceParticipantInput,
  ExperienceParticipantUpdate,
  ExperienceParticipationProposal,
  ExperienceParticipationProposalInput,
  ExperiencePartnerSlot,
  ExperiencePartnerSlotInput,
  ExperienceScheduleProposalInput,
} from "@/lib/types";
import type { IdFactory, TodayFn } from "@/core/data/persist-types";

export type ExperienceActionContext = {
  newId: IdFactory;
  todayISO: TodayFn;
};

function isContractWorkAllowed(prev: AppData, contractId: string): boolean {
  return canRunContractWork(prev, contractId);
}

function contractIdFromCampaign(prev: AppData, campaignId: string): string | null {
  return (
    (prev.experienceCampaigns ?? []).find((c) => c.id === campaignId)
      ?.contractId ?? null
  );
}

export function applyAddExperienceFieldDefinition(
  prev: AppData,
  input: ExperienceFieldDefinitionInput,
): { next: AppData; field: ExperienceFieldDefinition } {
  const field: ExperienceFieldDefinition = { ...input };
  return {
    field,
    next: {
      ...prev,
      experienceFieldDefinitions: [
        ...prev.experienceFieldDefinitions,
        field,
      ].sort((a, b) => a.sortOrder - b.sortOrder),
    },
  };
}

export function applyUpdateExperienceFieldDefinition(
  prev: AppData,
  id: string,
  input: Partial<ExperienceFieldDefinitionInput>,
): AppData {
  return {
    ...prev,
    experienceFieldDefinitions: prev.experienceFieldDefinitions
      .map((f) => (f.id === id ? { ...f, ...input } : f))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export function applyDeleteExperienceFieldDefinition(
  prev: AppData,
  id: string,
): { next: AppData; ok: boolean } {
  const field = prev.experienceFieldDefinitions.find((f) => f.id === id);
  if (!field || field.isSystem) return { next: prev, ok: false };
  const inUse = (prev.experienceCampaigns ?? []).some((campaign) => {
    const cat = campaign.criteria.category;
    return cat === field.id || cat === field.label;
  });
  if (inUse) return { next: prev, ok: false };
  return {
    ok: true,
    next: {
      ...prev,
      experienceFieldDefinitions: prev.experienceFieldDefinitions.filter(
        (f) => f.id !== id,
      ),
    },
  };
}

export function applyAddExperienceCampaign(
  prev: AppData,
  contractId: string,
  createdByUserId: string,
  ctx: ExperienceActionContext,
): { next: AppData; saved: ExperienceCampaign } {
  let saved: ExperienceCampaign = {
    id: ctx.newId("exc"),
    contractId,
    title: "",
    sequence: 1,
    criteria: {
      targetHeadcount: 10,
      category: "맛집",
      requirements: "",
      providedBenefit: "",
      notes: "",
    },
    schedulingStatus: "draft",
    proposals: [],
    participants: [],
    createdByUserId,
    createdAt: ctx.todayISO(),
    updatedAt: ctx.todayISO(),
  };

  const contract = prev.contracts.find((c) => c.id === contractId);
  if (!contract || !isContractWorkAllowed(prev, contractId)) {
    return { next: prev, saved };
  }

  const draft = createExperienceCampaignDraft(
    contract,
    prev.experienceCampaigns ?? [],
    prev.workOrders,
    createdByUserId,
    prev.experienceFieldDefinitions,
  );
  saved = { ...draft, id: ctx.newId("exc") };

  return {
    saved,
    next: {
      ...prev,
      experienceCampaigns: [...(prev.experienceCampaigns ?? []), saved],
    },
  };
}

export function applyUpdateExperienceCampaign(
  prev: AppData,
  id: string,
  input: Partial<
    Pick<
      ExperienceCampaign,
      | "criteria"
      | "schedulingStatus"
      | "title"
      | "workOrderId"
      | "confirmedVisitDate"
      | "confirmedVisitTime"
      | "confirmedVisitEndTime"
    >
  >,
  ctx: ExperienceActionContext,
): AppData {
  const campaign = (prev.experienceCampaigns ?? []).find((c) => c.id === id);
  if (!campaign || !isContractWorkAllowed(prev, campaign.contractId)) {
    return prev;
  }
  return {
    ...prev,
    experienceCampaigns: (prev.experienceCampaigns ?? []).map((c) =>
      c.id === id ? { ...c, ...input, updatedAt: ctx.todayISO() } : c,
    ),
  };
}

export function applySendExperienceCampaignToClient(
  prev: AppData,
  id: string,
  ctx: ExperienceActionContext,
): AppData {
  const contractId = contractIdFromCampaign(prev, id);
  if (!contractId || !isContractWorkAllowed(prev, contractId)) return prev;
  return {
    ...prev,
    experienceCampaigns: (prev.experienceCampaigns ?? []).map((c) =>
      c.id === id
        ? {
            ...c,
            schedulingStatus: "coordinating" as const,
            sentToClientAt: ctx.todayISO(),
            updatedAt: ctx.todayISO(),
          }
        : c,
    ),
  };
}

export function applyProposeExperienceSchedule(
  prev: AppData,
  campaignId: string,
  userId: string,
  input: ExperienceScheduleProposalInput,
  ctx: ExperienceActionContext,
): AppData {
  const campaign = (prev.experienceCampaigns ?? []).find(
    (c) => c.id === campaignId,
  );
  if (
    !campaign ||
    campaign.schedulingStatus === "cancelled" ||
    !isContractWorkAllowed(prev, campaign.contractId)
  ) {
    return prev;
  }

  const requester = prev.users.find((u) => u.id === userId);
  if (!requester) return prev;

  const proposal = buildProposal(input, userId);
  const nextStatus =
    campaign.schedulingStatus === "draft"
      ? ("coordinating" as const)
      : campaign.schedulingStatus;

  return {
    ...prev,
    experienceCampaigns: (prev.experienceCampaigns ?? []).map((c) =>
      c.id === campaignId
        ? {
            ...c,
            schedulingStatus: nextStatus,
            proposals: [
              ...c.proposals.map((p) =>
                p.status === "pending"
                  ? { ...p, status: "rejected" as const }
                  : p,
              ),
              proposal,
            ],
            updatedAt: ctx.todayISO(),
          }
        : c,
    ),
  };
}

export function applyAcceptExperienceProposal(
  prev: AppData,
  campaignId: string,
  proposalId: string,
  userId: string,
): AppData {
  const campaign = (prev.experienceCampaigns ?? []).find(
    (c) => c.id === campaignId,
  );
  if (!campaign || !isContractWorkAllowed(prev, campaign.contractId)) {
    return prev;
  }
  const proposal = campaign.proposals.find((p) => p.id === proposalId);
  if (!proposal || proposal.status !== "pending") return prev;

  const updated = applyAcceptedProposal(campaign, proposal, userId);
  let workOrders = prev.workOrders;
  if (updated.workOrderId && updated.confirmedVisitDate) {
    workOrders = prev.workOrders.map((o) =>
      o.id === updated.workOrderId
        ? { ...o, dueDate: updated.confirmedVisitDate! }
        : o,
    );
  }

  return {
    ...prev,
    workOrders,
    experienceCampaigns: (prev.experienceCampaigns ?? []).map((c) =>
      c.id === campaignId ? updated : c,
    ),
  };
}

export function applyAddExperienceParticipant(
  prev: AppData,
  campaignId: string,
  userId: string,
  input: ExperienceParticipantInput,
  ctx: ExperienceActionContext,
): AppData {
  const campaign = (prev.experienceCampaigns ?? []).find(
    (c) => c.id === campaignId,
  );
  if (!campaign || !isContractWorkAllowed(prev, campaign.contractId)) {
    return prev;
  }
  const actor = prev.users.find((u) => u.id === userId);
  if (!actor || !["staff", "team_leader"].includes(actor.role)) {
    return prev;
  }
  const participant = createParticipantRecord(input, userId);
  return {
    ...prev,
    experienceCampaigns: (prev.experienceCampaigns ?? []).map((c) =>
      c.id === campaignId
        ? {
            ...c,
            participants: [...c.participants, participant],
            updatedAt: ctx.todayISO(),
          }
        : c,
    ),
  };
}

export function applyRemoveExperienceParticipant(
  prev: AppData,
  campaignId: string,
  participantId: string,
  ctx: ExperienceActionContext,
): AppData {
  return {
    ...prev,
    experienceCampaigns: (prev.experienceCampaigns ?? []).map((c) =>
      c.id === campaignId
        ? {
            ...c,
            participants: c.participants.filter((p) => p.id !== participantId),
            updatedAt: ctx.todayISO(),
          }
        : c,
    ),
  };
}

export function applyUpdateExperienceParticipant(
  prev: AppData,
  campaignId: string,
  participantId: string,
  input: ExperienceParticipantUpdate,
  ctx: ExperienceActionContext,
): AppData {
  return {
    ...prev,
    experienceCampaigns: (prev.experienceCampaigns ?? []).map((c) =>
      c.id === campaignId
        ? {
            ...c,
            participants: c.participants.map((p) =>
              p.id === participantId
                ? normalizeExperienceParticipant({ ...p, ...input })
                : p,
            ),
            updatedAt: ctx.todayISO(),
          }
        : c,
    ),
  };
}

export function applyPublishExperiencePartnerSlot(
  prev: AppData,
  input: ExperiencePartnerSlotInput,
  ctx: ExperienceActionContext,
): { next: AppData; slot: ExperiencePartnerSlot } {
  const slot: ExperiencePartnerSlot = {
    id: ctx.newId("eps"),
    ...input,
    createdAt: ctx.todayISO(),
    status: "open",
  };
  if (!isContractWorkAllowed(prev, input.contractId)) {
    return { next: prev, slot };
  }
  return {
    slot,
    next: {
      ...prev,
      experiencePartnerSlots: [...(prev.experiencePartnerSlots ?? []), slot],
    },
  };
}

export function applyClaimExperiencePartnerSlot(
  prev: AppData,
  slotId: string,
  partnerId: string,
  claimNote: string | undefined,
  ctx: ExperienceActionContext,
): { next: AppData; ok: boolean } {
  const slot = (prev.experiencePartnerSlots ?? []).find(
    (item) => item.id === slotId,
  );
  const partner = prev.partners.find((item) => item.id === partnerId);
  if (!slot || slot.status !== "open" || !partner) {
    return { next: prev, ok: false };
  }
  if (!isContractWorkAllowed(prev, slot.contractId)) {
    return { next: prev, ok: false };
  }

  return {
    ok: true,
    next: {
      ...prev,
      experiencePartnerSlots: (prev.experiencePartnerSlots ?? []).map((item) =>
        item.id === slotId
          ? {
              ...item,
              status: "claimed" as const,
              claimedByPartnerId: partnerId,
              claimedAt: ctx.todayISO(),
              claimNote,
            }
          : item,
      ),
    },
  };
}

export function applyCancelExperiencePartnerSlot(
  prev: AppData,
  slotId: string,
): AppData {
  return {
    ...prev,
    experiencePartnerSlots: (prev.experiencePartnerSlots ?? []).map((item) =>
      item.id === slotId ? { ...item, status: "cancelled" as const } : item,
    ),
  };
}

export function applySubmitExperienceParticipationProposal(
  prev: AppData,
  input: ExperienceParticipationProposalInput,
  ctx: ExperienceActionContext,
): { next: AppData; created: ExperienceParticipationProposal | null } {
  let created: ExperienceParticipationProposal | null = null;
  const partner = prev.partners.find((item) => item.id === input.partnerId);
  const campaign = (prev.experienceCampaigns ?? []).find(
    (item) => item.id === input.campaignId,
  );
  const contract = prev.contracts.find((item) => item.id === input.contractId);
  if (!partner || !campaign || !contract) {
    return { next: prev, created: null };
  }
  if (!isContractWorkAllowed(prev, input.contractId)) {
    return { next: prev, created: null };
  }
  if (!PARTNER_SHAREABLE_CAMPAIGN_STATUSES.includes(campaign.schedulingStatus)) {
    return { next: prev, created: null };
  }

  const proposals = prev.experienceParticipationProposals ?? [];
  if (
    partnerHasPendingProposal(
      proposals,
      input.partnerId,
      input.campaignId,
      input.slotId,
    )
  ) {
    return { next: prev, created: null };
  }

  if (input.slotId) {
    const slot = (prev.experiencePartnerSlots ?? []).find(
      (item) => item.id === input.slotId,
    );
    if (!slot || slot.status !== "open") {
      return { next: prev, created: null };
    }
  }

  created = {
    id: ctx.newId("epp"),
    ...input,
    createdAt: ctx.todayISO(),
    status: "pending",
  };

  return {
    created,
    next: {
      ...prev,
      experienceParticipationProposals: [...proposals, created],
    },
  };
}

export function applyAcceptExperienceParticipationProposal(
  prev: AppData,
  proposalId: string,
  staffUserId: string,
  staffReviewMemo: string | undefined,
  ctx: ExperienceActionContext,
): { next: AppData; ok: boolean } {
  const proposal = (prev.experienceParticipationProposals ?? []).find(
    (item) => item.id === proposalId,
  );
  if (!proposal || proposal.status !== "pending") {
    return { next: prev, ok: false };
  }
  if (!isContractWorkAllowed(prev, proposal.contractId)) {
    return { next: prev, ok: false };
  }

  let nextSlots = prev.experiencePartnerSlots ?? [];
  if (proposal.slotId) {
    const slot = nextSlots.find((item) => item.id === proposal.slotId);
    if (!slot || slot.status !== "open") {
      return { next: prev, ok: false };
    }
    nextSlots = nextSlots.map((item) =>
      item.id === proposal.slotId
        ? {
            ...item,
            status: "claimed" as const,
            claimedByPartnerId: proposal.partnerId,
            claimedAt: ctx.todayISO(),
            claimNote: proposal.message,
          }
        : item,
    );
  }

  return {
    ok: true,
    next: {
      ...prev,
      experiencePartnerSlots: nextSlots,
      experienceParticipationProposals: (
        prev.experienceParticipationProposals ?? []
      ).map((item) =>
        item.id === proposalId
          ? {
              ...item,
              status: "accepted" as const,
              reviewedByUserId: staffUserId,
              reviewedAt: ctx.todayISO(),
              staffReviewMemo,
            }
          : item,
      ),
    },
  };
}

export function applyRejectExperienceParticipationProposal(
  prev: AppData,
  proposalId: string,
  staffUserId: string,
  staffReviewMemo: string | undefined,
  ctx: ExperienceActionContext,
): { next: AppData; ok: boolean } {
  const proposal = (prev.experienceParticipationProposals ?? []).find(
    (item) => item.id === proposalId,
  );
  if (!proposal || proposal.status !== "pending") {
    return { next: prev, ok: false };
  }

  return {
    ok: true,
    next: {
      ...prev,
      experienceParticipationProposals: (
        prev.experienceParticipationProposals ?? []
      ).map((item) =>
        item.id === proposalId
          ? {
              ...item,
              status: "rejected" as const,
              reviewedByUserId: staffUserId,
              reviewedAt: ctx.todayISO(),
              staffReviewMemo,
            }
          : item,
      ),
    },
  };
}
