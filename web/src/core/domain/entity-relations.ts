/**
 * TRIP IT ERP — 엔티티 관계 정의 (단일 진실 공급원)
 *
 * 업무 흐름: 계약(Contract)이 중심 → 실행·워크오더·원가·성과급·Q&A·체험단이 contractId로 연결
 * 조직: Team → User(staff/team_leader) → Contract.assignedStaffId / teamId
 * 파트너: Partner → WorkOrder / Expense.partnerId
 */

import type { AppData } from "@/lib/types";

/** FK 필드명 — cascade·조회 시 공통 사용 */
export const FK = {
  contractId: "contractId",
  threadId: "threadId",
  campaignId: "campaignId",
  partnerId: "partnerId",
  teamId: "teamId",
} as const;

/** 계약 삭제 시 함께 제거할 AppData 컬렉션 (순서 무관) */
export const CONTRACT_CHILD_COLLECTIONS = [
  "executions",
  "expenses",
  "extensionApprovals",
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
