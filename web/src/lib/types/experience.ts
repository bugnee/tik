/** 체험단 모집 · 일정 조율 상태 */
export type ExperienceSchedulingStatus =
  | "draft"
  | "coordinating"
  | "confirmed"
  | "recruiting"
  | "completed"
  | "cancelled";

export interface ExperienceRecruitmentCriteria {
  targetHeadcount: number;
  category?: string;
  requirements?: string;
  providedBenefit?: string;
  notes?: string;
}

export interface ExperienceScheduleProposal {
  id: string;
  proposedByUserId: string;
  visitDate: string;
  visitTime?: string;
  visitEndTime?: string;
  note?: string;
  createdAt: string;
  status: "pending" | "accepted" | "rejected";
}

export interface ExperienceParticipant {
  id: string;
  /** 블로그명 */
  blogName?: string;
  name: string;
  contact?: string;
  /** 체험일 (개별 참가자) */
  experienceDate?: string;
  /** 참가 인원 */
  headcount?: number;
  memo?: string;
  /** @deprecated blogName 사용 권장 */
  snsHandle?: string;
  /** 포스팅 URL */
  postUrl?: string;
  /** 포스팅 등록일 */
  postRegisteredAt?: string;
  registeredAt: string;
  registeredByUserId: string;
}

export interface ExperienceCampaign {
  id: string;
  contractId: string;
  workOrderId?: string;
  title: string;
  sequence: number;
  criteria: ExperienceRecruitmentCriteria;
  schedulingStatus: ExperienceSchedulingStatus;
  proposals: ExperienceScheduleProposal[];
  confirmedVisitDate?: string;
  confirmedVisitTime?: string;
  confirmedVisitEndTime?: string;
  participants: ExperienceParticipant[];
  sentToClientAt?: string;
  confirmedAt?: string;
  confirmedByUserId?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export type ExperiencePartnerSlotStatus = "open" | "claimed" | "cancelled";

/** 고객사 체험 일정 — 파트너(체험단) 공유·선택 */
export interface ExperiencePartnerSlot {
  id: string;
  campaignId: string;
  contractId: string;
  visitDate: string;
  visitTime?: string;
  visitEndTime?: string;
  note?: string;
  /** 참고·검색용 지역 (미입력 가능) */
  regionProvince?: string;
  regionCity?: string;
  address?: string;
  createdByUserId: string;
  createdAt: string;
  status: ExperiencePartnerSlotStatus;
  claimedByPartnerId?: string;
  claimedAt?: string;
  claimNote?: string;
}

export type ExperiencePartnerSlotInput = Omit<
  ExperiencePartnerSlot,
  "id" | "createdAt" | "status" | "claimedByPartnerId" | "claimedAt" | "claimNote"
>;

export type ExperienceParticipationProposalStatus =
  | "pending"
  | "accepted"
  | "rejected";

/** 파트너 체험단 참여 제안 — 담당 검토 후 반영 */
export interface ExperienceParticipationProposal {
  id: string;
  campaignId: string;
  contractId: string;
  slotId?: string;
  partnerId: string;
  proposedByUserId: string;
  visitDate: string;
  visitTime?: string;
  visitEndTime?: string;
  headcount?: number;
  message?: string;
  createdAt: string;
  status: ExperienceParticipationProposalStatus;
  reviewedByUserId?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export type ExperienceParticipationProposalInput = Omit<
  ExperienceParticipationProposal,
  | "id"
  | "createdAt"
  | "status"
  | "reviewedByUserId"
  | "reviewedAt"
  | "reviewNote"
>;

export type ExperienceParticipantInput = Omit<
  ExperienceParticipant,
  "id" | "registeredAt" | "registeredByUserId"
>;

export type ExperienceParticipantUpdate = Partial<ExperienceParticipantInput>;

/** 체험단 모집 분야 — 분야별 담당 임원·팀장 (설정에서 관리) */
export interface ExperienceFieldDefinition {
  id: string;
  label: string;
  executiveUserId?: string;
  teamLeaderUserId?: string;
  sortOrder: number;
  isActive: boolean;
  isSystem?: boolean;
}

export type ExperienceFieldDefinitionInput = Omit<
  ExperienceFieldDefinition,
  "isSystem"
>;

export type ExperienceScheduleProposalInput = Omit<
  ExperienceScheduleProposal,
  "id" | "createdAt" | "status" | "proposedByUserId"
>;
