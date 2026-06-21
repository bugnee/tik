import type { AppData, Contract } from "@/lib/types";

/** 파트ner 협업·소통 대상 계약 (배정 업무 + 리셀러 연결) */
export function getPartnerCollaborationContractIds(
  data: AppData,
  partnerId: string,
): string[] {
  const ids = new Set<string>();

  for (const order of data.workOrders) {
    if (order.partnerId === partnerId) {
      ids.add(order.contractId);
    }
  }

  for (const contract of data.contracts) {
    if (
      contract.status === "active" &&
      contract.referrerPartnerId === partnerId
    ) {
      ids.add(contract.id);
    }
  }

  return [...ids];
}

export function getPartnerCollaborationContracts(
  data: AppData,
  partnerId: string,
): Contract[] {
  const ids = new Set(getPartnerCollaborationContractIds(data, partnerId));
  return data.contracts.filter(
    (c) => ids.has(c.id) && c.status === "active",
  );
}
