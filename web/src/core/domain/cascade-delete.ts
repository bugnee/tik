import type { AppData } from "@/lib/types";
import {
  clearPartnerIdFromItems,
  filterOutByContractId,
  getExperienceCampaignIdsForContract,
  getQaThreadIdsForContract,
} from "@/core/domain/entity-relations";

/**
 * 계약 삭제 시 연관 데이터 일괄 제거 — DataContext·UI 어디서든 동일 규칙 적용
 * CONTRACT_CHILD_COLLECTIONS(entity-relations.ts)와 반드시 동기화
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
    executions: filterOutByContractId(prev.executions, contractId),
    expenses: filterOutByContractId(prev.expenses, contractId),
    extensionApprovals: filterOutByContractId(
      prev.extensionApprovals,
      contractId,
    ),
    contractTermsApprovals: filterOutByContractId(
      prev.contractTermsApprovals ?? [],
      contractId,
    ),
    contractRecords: filterOutByContractId(prev.contractRecords, contractId),
    contractMemos: filterOutByContractId(prev.contractMemos ?? [], contractId),
    workOrders: filterOutByContractId(prev.workOrders, contractId),
    placeCredentials: filterOutByContractId(
      prev.placeCredentials,
      contractId,
    ),
    qaThreads: filterOutByContractId(prev.qaThreads, contractId),
    qaMessages: prev.qaMessages.filter((m) => !threadIds.has(m.threadId)),
    postLinkOpinions: filterOutByContractId(
      prev.postLinkOpinions ?? [],
      contractId,
    ),
    bonusPayments: filterOutByContractId(prev.bonusPayments, contractId),
    experienceCampaigns: filterOutByContractId(
      prev.experienceCampaigns ?? [],
      contractId,
    ),
    experiencePartnerSlots: (prev.experiencePartnerSlots ?? []).filter(
      (s) => s.contractId !== contractId && !campaignIds.has(s.campaignId),
    ),
    experienceParticipationProposals: filterOutByContractId(
      prev.experienceParticipationProposals ?? [],
      contractId,
    ),
  };
}

/**
 * 파트너 삭제 시 FK·리퍼럴 연관 해제 — DataContext.deletePartner 전용
 */
export function purgePartnerFromAppData(
  prev: AppData,
  partnerId: string,
): AppData {
  return {
    ...prev,
    partners: prev.partners.filter((p) => p.id !== partnerId),
    expenses: clearPartnerIdFromItems(prev.expenses, partnerId),
    workOrders: clearPartnerIdFromItems(prev.workOrders, partnerId),
    partnerReferralLeads: (prev.partnerReferralLeads ?? []).filter(
      (lead) => lead.partnerId !== partnerId,
    ),
    contracts: prev.contracts.map((c) =>
      c.referrerPartnerId === partnerId
        ? { ...c, referrerPartnerId: undefined, hasReferralPromo: false }
        : c,
    ),
  };
}
