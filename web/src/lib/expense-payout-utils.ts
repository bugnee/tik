import type { AppData, Expense, PayoutStatus, UserRole } from "./types";

/** 재무 입금 업무 큐 — 승인 완료 건만 */
export function getFinancePayoutQueue(expenses: Expense[]): Expense[] {
  return expenses.filter((e) => e.payoutStatus === "pending_transfer");
}

/** 대표·임원 결재 대기 */
export function getPendingExpensePayoutApprovals(
  expenses: Expense[],
): Expense[] {
  return expenses.filter((e) => e.payoutStatus === "pending_approval");
}

export function canRequestExpensePayout(role: UserRole): boolean {
  return role === "staff" || role === "team_leader";
}

export function canApproveExpensePayout(role: UserRole): boolean {
  return role === "ceo" || role === "executive";
}

/** 담당자가 입금 요청 가능한 원가인지 (본인/팀 계약) */
export function canUserRequestExpense(
  data: AppData,
  expense: Expense,
  userId: string,
  role: UserRole,
): boolean {
  if (expense.payoutStatus !== "unpaid") return false;
  if (!canRequestExpensePayout(role)) return false;

  const contract = data.contracts.find((c) => c.id === expense.contractId);
  if (!contract) return false;

  if (role === "staff") {
    return contract.assignedStaffId === userId;
  }
  if (role === "team_leader") {
    const user = data.users.find((u) => u.id === userId);
    return contract.teamId === user?.teamId;
  }
  return false;
}

export function countExpensesByPayoutStatus(
  expenses: Expense[],
): Record<PayoutStatus, number> {
  return {
    unpaid: expenses.filter((e) => e.payoutStatus === "unpaid").length,
    pending_approval: expenses.filter(
      (e) => e.payoutStatus === "pending_approval",
    ).length,
    pending_transfer: expenses.filter(
      (e) => e.payoutStatus === "pending_transfer",
    ).length,
    paid: expenses.filter((e) => e.payoutStatus === "paid").length,
  };
}
