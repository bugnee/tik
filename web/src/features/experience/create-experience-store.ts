import type { StoreDeps } from "@/core/data/persist-types";
import {
  applyAcceptExperienceParticipationProposal,
  applyAcceptExperienceProposal,
  applyAddExperienceCampaign,
  applyAddExperienceFieldDefinition,
  applyAddExperienceParticipant,
  applyCancelExperiencePartnerSlot,
  applyClaimExperiencePartnerSlot,
  applyDeleteExperienceFieldDefinition,
  applyProposeExperienceSchedule,
  applyPublishExperiencePartnerSlot,
  applyRejectExperienceParticipationProposal,
  applyRemoveExperienceParticipant,
  applySendExperienceCampaignToClient,
  applySubmitExperienceParticipationProposal,
  applyUpdateExperienceCampaign,
  applyUpdateExperienceFieldDefinition,
  applyUpdateExperienceParticipant,
} from "@/features/experience/experience-actions";
import type {
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

export type ExperienceStore = {
  addExperienceFieldDefinition: (
    input: ExperienceFieldDefinitionInput,
  ) => ExperienceFieldDefinition;
  updateExperienceFieldDefinition: (
    id: string,
    input: Partial<ExperienceFieldDefinitionInput>,
  ) => void;
  deleteExperienceFieldDefinition: (id: string) => boolean;
  addExperienceCampaign: (
    contractId: string,
    createdByUserId: string,
  ) => ExperienceCampaign;
  updateExperienceCampaign: (
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
        | "publicListing"
      >
    >,
  ) => void;
  sendExperienceCampaignToClient: (id: string) => void;
  proposeExperienceSchedule: (
    campaignId: string,
    userId: string,
    input: ExperienceScheduleProposalInput,
  ) => void;
  acceptExperienceProposal: (
    campaignId: string,
    proposalId: string,
    userId: string,
  ) => void;
  addExperienceParticipant: (
    campaignId: string,
    userId: string,
    input: ExperienceParticipantInput,
  ) => void;
  removeExperienceParticipant: (
    campaignId: string,
    participantId: string,
  ) => void;
  updateExperienceParticipant: (
    campaignId: string,
    participantId: string,
    input: ExperienceParticipantUpdate,
  ) => void;
  publishExperiencePartnerSlot: (
    input: ExperiencePartnerSlotInput,
  ) => ExperiencePartnerSlot;
  claimExperiencePartnerSlot: (
    slotId: string,
    partnerId: string,
    userId: string,
    claimNote?: string,
  ) => boolean;
  cancelExperiencePartnerSlot: (slotId: string) => void;
  submitExperienceParticipationProposal: (
    input: ExperienceParticipationProposalInput,
  ) => ExperienceParticipationProposal | null;
  acceptExperienceParticipationProposal: (
    proposalId: string,
    staffUserId: string,
    staffReviewMemo?: string,
  ) => boolean;
  rejectExperienceParticipationProposal: (
    proposalId: string,
    staffUserId: string,
    staffReviewMemo?: string,
  ) => boolean;
};

export function createExperienceStore(deps: StoreDeps): ExperienceStore {
  const ctx = { newId: deps.newId, todayISO: deps.todayISO };

  return {
    addExperienceFieldDefinition(input) {
      let field!: ExperienceFieldDefinition;
      deps.persist((prev) => {
        const result = applyAddExperienceFieldDefinition(prev, input);
        field = result.field;
        return result.next;
      });
      return field;
    },

    updateExperienceFieldDefinition(id, input) {
      deps.persist((prev) =>
        applyUpdateExperienceFieldDefinition(prev, id, input),
      );
    },

    deleteExperienceFieldDefinition(id) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyDeleteExperienceFieldDefinition(prev, id);
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    addExperienceCampaign(contractId, createdByUserId) {
      let saved!: ExperienceCampaign;
      deps.persist((prev) => {
        const result = applyAddExperienceCampaign(
          prev,
          contractId,
          createdByUserId,
          ctx,
        );
        saved = result.saved;
        return result.next;
      });
      return saved;
    },

    updateExperienceCampaign(id, input) {
      deps.persist((prev) => applyUpdateExperienceCampaign(prev, id, input, ctx));
    },

    sendExperienceCampaignToClient(id) {
      deps.persist((prev) => applySendExperienceCampaignToClient(prev, id, ctx));
    },

    proposeExperienceSchedule(campaignId, userId, input) {
      deps.persist((prev) =>
        applyProposeExperienceSchedule(prev, campaignId, userId, input, ctx),
      );
    },

    acceptExperienceProposal(campaignId, proposalId, userId) {
      deps.persist((prev) =>
        applyAcceptExperienceProposal(prev, campaignId, proposalId, userId),
      );
    },

    addExperienceParticipant(campaignId, userId, input) {
      deps.persist((prev) =>
        applyAddExperienceParticipant(prev, campaignId, userId, input, ctx),
      );
    },

    removeExperienceParticipant(campaignId, participantId) {
      deps.persist((prev) =>
        applyRemoveExperienceParticipant(prev, campaignId, participantId, ctx),
      );
    },

    updateExperienceParticipant(campaignId, participantId, input) {
      deps.persist((prev) =>
        applyUpdateExperienceParticipant(
          prev,
          campaignId,
          participantId,
          input,
          ctx,
        ),
      );
    },

    publishExperiencePartnerSlot(input) {
      let slot!: ExperiencePartnerSlot;
      deps.persist((prev) => {
        const result = applyPublishExperiencePartnerSlot(prev, input, ctx);
        slot = result.slot;
        return result.next;
      });
      return slot;
    },

    claimExperiencePartnerSlot(slotId, partnerId, _userId, claimNote) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyClaimExperiencePartnerSlot(
          prev,
          slotId,
          partnerId,
          claimNote,
          ctx,
        );
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    cancelExperiencePartnerSlot(slotId) {
      deps.persist((prev) => applyCancelExperiencePartnerSlot(prev, slotId));
    },

    submitExperienceParticipationProposal(input) {
      let created: ExperienceParticipationProposal | null = null;
      deps.persist((prev) => {
        const result = applySubmitExperienceParticipationProposal(
          prev,
          input,
          ctx,
        );
        created = result.created;
        return result.next;
      });
      return created;
    },

    acceptExperienceParticipationProposal(proposalId, staffUserId, staffReviewMemo) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyAcceptExperienceParticipationProposal(
          prev,
          proposalId,
          staffUserId,
          staffReviewMemo,
          ctx,
        );
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    rejectExperienceParticipationProposal(proposalId, staffUserId, staffReviewMemo) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyRejectExperienceParticipationProposal(
          prev,
          proposalId,
          staffUserId,
          staffReviewMemo,
          ctx,
        );
        ok = result.ok;
        return result.next;
      });
      return ok;
    },
  };
}
