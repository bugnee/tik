import {
  calcBonusClosingDeadline,
  calcScheduledPayDate,
} from "@/lib/bonus-utils";
import { applySyncReferralCommissionWorkOrders } from "@/features/work-orders/work-order-actions";
import { canUserRequestExpense } from "@/lib/expense-payout-utils";
import type {
  AppData,
  ClientDepositStatus,
  Contract,
  Expense,
  ExpenseInput,
  FundBudget,
  UserRole,
} from "@/lib/types";
import type { IdFactory, TodayFn } from "@/core/data/persist-types";

export type FinanceActionContext = {
  newId: IdFactory;
  todayISO: TodayFn;
};

export function applyAddExpense(
  prev: AppData,
  input: ExpenseInput,
  ctx: FinanceActionContext,
): { next: AppData; expense: Expense } {
  const expense: Expense = { ...input, id: ctx.newId("e") };
  return {
    expense,
    next: { ...prev, expenses: [...prev.expenses, expense] },
  };
}

export function applyUpdateExpense(
  prev: AppData,
  id: string,
  input: Partial<ExpenseInput>,
): AppData {
  return {
    ...prev,
    expenses: prev.expenses.map((e) =>
      e.id === id ? { ...e, ...input } : e,
    ),
  };
}

export function applyDeleteExpense(prev: AppData, id: string): AppData {
  return {
    ...prev,
    expenses: prev.expenses.filter((e) => e.id !== id),
  };
}

export function applyMarkExpensesPaid(prev: AppData, ids: string[]): AppData {
  return {
    ...prev,
    expenses: prev.expenses.map((e) =>
      ids.includes(e.id) && e.payoutStatus === "pending_transfer"
        ? { ...e, payoutStatus: "paid" as const }
        : e,
    ),
  };
}

export function applyRequestExpensePayout(
  prev: AppData,
  expenseId: string,
  requestedBy: string,
  ctx: FinanceActionContext,
): { next: AppData; ok: boolean } {
  const expense = prev.expenses.find((e) => e.id === expenseId);
  const requester = prev.users.find((u) => u.id === requestedBy);
  if (
    !expense ||
    !requester ||
    !canUserRequestExpense(prev, expense, requestedBy, requester.role)
  ) {
    return { next: prev, ok: false };
  }
  return {
    ok: true,
    next: {
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              payoutStatus: "pending_approval" as const,
              payoutRequestedBy: requestedBy,
              payoutRequestedAt: ctx.todayISO(),
            }
          : e,
      ),
    },
  };
}

export function applyApproveExpensePayout(
  prev: AppData,
  expenseId: string,
  approverId: string,
  ctx: FinanceActionContext,
): { next: AppData; ok: boolean } {
  const expense = prev.expenses.find((e) => e.id === expenseId);
  const approver = prev.users.find((u) => u.id === approverId);
  if (
    !expense ||
    expense.payoutStatus !== "pending_approval" ||
    !approver ||
    (approver.role !== "ceo" && approver.role !== "executive")
  ) {
    return { next: prev, ok: false };
  }
  return {
    ok: true,
    next: {
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              payoutStatus: "pending_transfer" as const,
              payoutApprovedBy: approverId,
              payoutApprovedAt: ctx.todayISO(),
            }
          : e,
      ),
    },
  };
}

export function applyRejectExpensePayout(
  prev: AppData,
  expenseId: string,
  approverId: string,
): { next: AppData; ok: boolean } {
  const expense = prev.expenses.find((e) => e.id === expenseId);
  const approver = prev.users.find((u) => u.id === approverId);
  if (
    !expense ||
    expense.payoutStatus !== "pending_approval" ||
    !approver ||
    (approver.role !== "ceo" && approver.role !== "executive")
  ) {
    return { next: prev, ok: false };
  }
  return {
    ok: true,
    next: {
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              payoutStatus: "unpaid" as const,
              payoutRequestedBy: undefined,
              payoutRequestedAt: undefined,
            }
          : e,
      ),
    },
  };
}

export function applyUpdateFundBudget(
  prev: AppData,
  input: Partial<FundBudget>,
): AppData {
  return {
    ...prev,
    fundBudget: { ...prev.fundBudget, ...input },
  };
}

export function applyUpdateClientDepositStatus(
  prev: AppData,
  contractId: string,
  status: ClientDepositStatus,
  depositDate: string | undefined,
  today: string,
): AppData {
  let updated: Contract | undefined;
  const contracts = prev.contracts.map((c) => {
    if (c.id !== contractId) return c;
    const next: Contract = { ...c, clientDepositStatus: status };
    if (status === "completed") {
      next.lastClientDepositDate =
        depositDate || c.lastClientDepositDate || today;
    } else if (status === "pending") {
      next.lastClientDepositDate = undefined;
    }
    updated = next;
    return next;
  });

  const bonusPayments = prev.bonusPayments.map((p) => {
    if (p.contractId !== contractId) return p;
    const deposit = updated?.lastClientDepositDate;
    if (!deposit) return p;
    return {
      ...p,
      clientDepositDate: deposit,
      closingDeadline: calcBonusClosingDeadline(deposit),
      scheduledPayDate: calcScheduledPayDate(deposit),
    };
  });

  return applySyncReferralCommissionWorkOrders(
    { ...prev, contracts, bonusPayments },
    today,
    contractId,
  );
}
