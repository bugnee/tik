import type { AppData } from "@/lib/types";
import {
  getExperienceCampaignIdsForContract,
  getQaThreadIdsForContract,
} from "@/core/domain/entity-relations";

/**
 * 계약 삭제 시 연관 데이터 일괄 제거 — DataContext·UI 어디서든 동일 규칙 적용
 */
export function purgeContractFromAppData(
  prev: AppData,
  contractId: string,
): AppData {
  const threadIds = getQaThreadIdsForContract(prev, contractId);
  const campaignIds = getExperienceCampaignIdsForContract(prev, contractId);

  return {
    ...prev,
    contracts: prev.contracts.filter((c) => c.id !== contractId),
    executions: prev.executions.filter((e) => e.contractId !== contractId),
    expenses: prev.expenses.filter((e) => e.contractId !== contractId),
    extensionApprovals: prev.extensionApprovals.filter(
      (a) => a.contractId !== contractId,
    ),
    contractRecords: prev.contractRecords.filter(
      (r) => r.contractId !== contractId,
    ),
    contractMemos: (prev.contractMemos ?? []).filter(
      (m) => m.contractId !== contractId,
    ),
    workOrders: prev.workOrders.filter((w) => w.contractId !== contractId),
    placeCredentials: prev.placeCredentials.filter(
      (p) => p.contractId !== contractId,
    ),
    qaThreads: prev.qaThreads.filter((t) => t.contractId !== contractId),
    qaMessages: prev.qaMessages.filter((m) => !threadIds.has(m.threadId)),
    postLinkOpinions: (prev.postLinkOpinions ?? []).filter(
      (o) => o.contractId !== contractId,
    ),
    bonusPayments: prev.bonusPayments.filter(
      (p) => p.contractId !== contractId,
    ),
    experienceCampaigns: (prev.experienceCampaigns ?? []).filter(
      (c) => c.contractId !== contractId,
    ),
    experiencePartnerSlots: (prev.experiencePartnerSlots ?? []).filter(
      (s) => s.contractId !== contractId && !campaignIds.has(s.campaignId),
    ),
    experienceParticipationProposals: (
      prev.experienceParticipationProposals ?? []
    ).filter((p) => p.contractId !== contractId),
  };
}
