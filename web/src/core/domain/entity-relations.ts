/**
 * TripItKorea ERP — 엔티티 관계 정의 (단일 진실 공급원)
 *
 * 업무 흐름: 계약(Contract)이 중심 → 실행·워크오더·원가·성과급·Q&A·체험단이 contractId로 연결
 * 조직: Team → User(staff/team_leader) → Contract.assignedStaffId / teamId
 * 파트너: Partner → WorkOrder / Expense.partnerId
 *
 * ⚠️ 필드·삭제·상태 변경 시 이 파일과 cascade-delete.ts, DataContext, 관련 utils를 함께 수정
 */

import type { AppData } from "@/lib/types";

/** FK 필드명 — cascade·조회 시 공통 사용 */
export const FK = {
  contractId: "contractId",
  threadId: "threadId",
  campaignId: "campaignId",
  partnerId: "partnerId",
  teamId: "teamId",
  userId: "userId",
  evaluateeId: "evaluateeId",
} as const;

/** ERP 핵심 관계 그래프 — 개발·온보딩·리뷰 시 참고 */
export const ERP_ENTITY_GRAPH = [
  {
    entity: "Team",
    children: ["User (teamId)", "Contract (teamId)"],
  },
  {
    entity: "User",
    children: [
      "Contract (assignedStaffId)",
      "WorkEvaluation (evaluateeId/evaluatorId)",
    ],
  },
  {
    entity: "Contract",
    children: [
      "Execution",
      "WorkOrder",
      "Expense",
      "QaThread",
      "ExperienceCampaign",
      "BonusPayment",
      "ContractRecord",
      "ContractMemo",
      "ExtensionApproval",
      "ContractTermsApproval",
      "PlaceCredentials",
      "PostLinkOpinion",
    ],
    fk: FK.contractId,
  },
  {
    entity: "WorkOrder",
    children: ["Partner (partnerId)", "Contract (contractId)", "Execution 결과"],
    fk: FK.contractId,
  },
  {
    entity: "QaThread",
    children: ["QaMessage (threadId)"],
    fk: FK.threadId,
  },
  {
    entity: "ExperienceCampaign",
    children: [
      "ExperiencePartnerSlot (campaignId)",
      "ExperienceParticipationProposal",
    ],
    fk: FK.campaignId,
  },
  {
    entity: "Partner",
    children: [
      "WorkOrder (partnerId)",
      "Expense (partnerId)",
      "PartnerReferralLead",
      "Contract.referrerPartnerId",
    ],
    fk: FK.partnerId,
  },
] as const;

/** 계약 삭제 시 함께 제거할 AppData 컬렉션 — purgeContractFromAppData와 동기화 필수 */
export const CONTRACT_CHILD_COLLECTIONS = [
  "executions",
  "expenses",
  "extensionApprovals",
  "contractTermsApprovals",
  "contractRecords",
  "contractMemos",
  "workOrders",
  "placeCredentials",
  "qaThreads",
  "postLinkOpinions",
  "bonusPayments",
  "experienceCampaigns",
  "experiencePartnerSlots",
  "experienceParticipationProposals",
] as const satisfies readonly (keyof AppData)[];

/** QaMessage는 qaThreads 종속 — CONTRACT_CHILD에 포함하지 않음 */
export const CONTRACT_DERIVED_COLLECTIONS = ["qaMessages"] as const;

/** 파트너 삭제 시 정리·해제 대상 */
export const PARTNER_RELATED_UPDATES = {
  clearPartnerId: ["expenses", "workOrders"] as const,
  removeLeads: ["partnerReferralLeads"] as const,
  clearReferrer: ["contracts"] as const,
} as const;

/** 엔티티별 수정 시 점검할 코드 영역 (개발 체크리스트) */
export const RELATIONAL_CHANGE_CHECKLIST: Record<
  string,
  readonly string[]
> = {
  Contract: [
    "entity-relations.ts",
    "cascade-delete.ts → purgeContractFromAppData",
    "DataContext.deleteContract",
    "client-deposit-utils.ts (입금 차단)",
    "standard-contract-workflow.ts",
    "staff-daily-workflow-utils.ts",
    "selectors.ts / role-action-utils.ts",
  ],
  WorkOrder: [
    "work-order-utils.ts",
    "staff-daily-workflow-utils.ts",
    "standard-contract-workflow.ts",
    "ExecutionProgressManager.tsx",
    "expense-payout-utils.ts",
    "referral-commission-utils.ts",
  ],
  Partner: [
    "cascade-delete.ts → purgePartnerFromAppData",
    "DataContext.deletePartner",
    "partner-utils.ts / partner-work-queue-utils.ts",
  ],
  QaThread: [
    "place-qa-utils.ts",
    "staff-daily-workflow-utils.ts",
    "getQaThreadIdsForContract",
  ],
  ExperienceCampaign: [
    "entity-relations.ts → getExperienceCampaignIdsForContract",
    "packages/shared/public-campaign/mapper.ts",
    "public-catalog-utils.ts",
  ],
  User: [
    "selectors.ts → filterContractsByRole",
    "role-onboarding-utils.ts",
    "nav-config.ts",
  ],
};

/** Q&A 메시지는 threadId로 qaThreads에 종속 */
export function getQaThreadIdsForContract(
  data: AppData,
  contractId: string,
): Set<string> {
  return new Set(
    data.qaThreads.filter((t) => t.contractId === contractId).map((t) => t.id),
  );
}

export function getExperienceCampaignIdsForContract(
  data: AppData,
  contractId: string,
): Set<string> {
  return new Set(
    (data.experienceCampaigns ?? [])
      .filter((c) => c.contractId === contractId)
      .map((c) => c.id),
  );
}

/** contractId FK를 가진 배열 필터 — cascade·조회 공용 */
export function filterOutByContractId<T extends { contractId: string }>(
  items: T[],
  contractId: string,
): T[] {
  return items.filter((item) => item.contractId !== contractId);
}

/** partnerId FK 해제 — undefined로 초기화 */
export function clearPartnerIdFromItems<T extends { partnerId?: string }>(
  items: T[],
  partnerId: string,
): T[] {
  return items.map((item) =>
    item.partnerId === partnerId ? { ...item, partnerId: undefined } : item,
  );
}
