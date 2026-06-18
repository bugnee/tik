import {
  CLIENT_DEPOSIT_STATUS_LABELS,
  type AppData,
  type ClientDepositStatus,
  type Contract,
  type FundBudget,
} from "./types";

/** 고객사 입금 안내 기본 계좌 (fundBudget 미설정 시) */
export const DEFAULT_CLIENT_DEPOSIT_ACCOUNT = {
  bankName: "국민은행",
  accountNumber: "737801-04-203835",
  accountHolder: "주식회사 트립잇코리아",
} as const;

export interface ClientDepositRequestInfo {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  status: ClientDepositStatus;
  statusLabel: string;
}

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

/** 고객사 광고비 입금이 확인되어 업무 진행 가능한지 */
export function isClientDepositConfirmed(contract: Contract): boolean {
  return resolveClientDepositStatus(contract) === "completed";
}

/** 입금 미확인으로 업무 진행을 막아야 하는지 */
export function isClientDepositBlockingWork(contract: Contract): boolean {
  return !isClientDepositConfirmed(contract);
}

export function canRunContractWork(
  data: AppData,
  contractId: string,
): boolean {
  const contract = data.contracts.find((item) => item.id === contractId);
  if (!contract || contract.status !== "active") return false;
  return isClientDepositConfirmed(contract);
}

export function getClientDepositRequestInfo(
  contract: Contract,
  fundBudget?: FundBudget,
): ClientDepositRequestInfo {
  const status = resolveClientDepositStatus(contract);
  return {
    amount: contract.monthlyFee,
    bankName:
      fundBudget?.clientDepositBankName ??
      DEFAULT_CLIENT_DEPOSIT_ACCOUNT.bankName,
    accountNumber:
      fundBudget?.clientDepositAccountNumber ??
      DEFAULT_CLIENT_DEPOSIT_ACCOUNT.accountNumber,
    accountHolder:
      fundBudget?.clientDepositAccountHolder ??
      DEFAULT_CLIENT_DEPOSIT_ACCOUNT.accountHolder,
    status,
    statusLabel: CLIENT_DEPOSIT_STATUS_LABELS[status],
  };
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

/** 입금확인 필터 버튼 — 상태별 색상 */
export const CLIENT_DEPOSIT_STATUS_BUTTON_STYLES: Record<
  ClientDepositStatus,
  { count: string; idle: string; active: string; empty: string }
> = {
  pending: {
    count: "text-amber-400",
    idle: "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 hover:bg-amber-500/10",
    active:
      "border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/70 text-amber-50",
    empty: "border-zinc-800/60 bg-zinc-950/30 text-zinc-600",
  },
  completed: {
    count: "text-emerald-400",
    idle: "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 hover:bg-emerald-500/10",
    active:
      "border-emerald-400 bg-emerald-500/15 ring-1 ring-emerald-400/70 text-emerald-50",
    empty: "border-zinc-800/60 bg-zinc-950/30 text-zinc-600",
  },
  overdue: {
    count: "text-red-400",
    idle: "border-red-500/30 bg-red-500/5 hover:border-red-500/50 hover:bg-red-500/10",
    active:
      "border-red-400 bg-red-500/15 ring-1 ring-red-400/70 text-red-50",
    empty: "border-zinc-800/60 bg-zinc-950/30 text-zinc-600",
  },
  other: {
    count: "text-cyan-400",
    idle: "border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500/50 hover:bg-cyan-500/10",
    active:
      "border-cyan-400 bg-cyan-500/15 ring-1 ring-cyan-400/70 text-cyan-50",
    empty: "border-zinc-800/60 bg-zinc-950/30 text-zinc-600",
  },
};

export const CLIENT_DEPOSIT_ALL_BUTTON_STYLES = {
  idle: "border-zinc-700 bg-zinc-950/40 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200",
  active:
    "border-zinc-300 bg-zinc-800/80 text-zinc-100 ring-1 ring-zinc-300/60",
};
