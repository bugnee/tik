import type { AppData, ClientDepositStatus, Contract } from "./types";

/** 연장 계약 중 입금 확인 대상 */
export function getDepositConfirmContracts(data: AppData): Contract[] {
  return data.contracts
    .filter((c) => c.status === "active" && c.isExtension)
    .sort((a, b) => a.clientName.localeCompare(b.clientName, "ko"));
}

export function resolveClientDepositStatus(
  contract: Contract,
): ClientDepositStatus {
  if (contract.clientDepositStatus) return contract.clientDepositStatus;
  if (contract.lastClientDepositDate) return "completed";
  return "pending";
}

export function countDepositByStatus(
  contracts: Contract[],
): Record<ClientDepositStatus, number> {
  const counts: Record<ClientDepositStatus, number> = {
    pending: 0,
    completed: 0,
    overdue: 0,
    other: 0,
  };
  for (const c of contracts) {
    counts[resolveClientDepositStatus(c)] += 1;
  }
  return counts;
}

export const DEPOSIT_STATUS_ORDER: ClientDepositStatus[] = [
  "pending",
  "completed",
  "overdue",
  "other",
];
