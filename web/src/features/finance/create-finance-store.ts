import type { StoreDeps } from "@/core/data/persist-types";
import {
  applyAddExpense,
  applyApproveExpensePayout,
  applyDeleteExpense,
  applyMarkExpensesPaid,
  applyRejectExpensePayout,
  applyRequestExpensePayout,
  applyUpdateClientDepositStatus,
  applyUpdateExpense,
  applyUpdateFundBudget,
} from "@/features/finance/finance-actions";
import type {
  ClientDepositStatus,
  Expense,
  ExpenseInput,
  FundBudget,
} from "@/lib/types";

export type FinanceStore = {
  addExpense: (input: ExpenseInput) => Expense;
  updateExpense: (id: string, input: Partial<ExpenseInput>) => void;
  deleteExpense: (id: string) => void;
  requestExpensePayout: (expenseId: string, requestedBy: string) => boolean;
  approveExpensePayout: (expenseId: string, approverId: string) => boolean;
  rejectExpensePayout: (expenseId: string, approverId: string) => boolean;
  markExpensesPaid: (ids: string[]) => void;
  updateFundBudget: (input: Partial<FundBudget>) => void;
  updateClientDepositStatus: (
    contractId: string,
    status: ClientDepositStatus,
    depositDate?: string,
  ) => void;
};

export function createFinanceStore(deps: StoreDeps): FinanceStore {
  const ctx = { newId: deps.newId, todayISO: deps.todayISO };

  return {
    addExpense(input) {
      let expense!: Expense;
      deps.persist((prev) => {
        const result = applyAddExpense(prev, input, ctx);
        expense = result.expense;
        return result.next;
      });
      return expense;
    },

    updateExpense(id, input) {
      deps.persist((prev) => applyUpdateExpense(prev, id, input));
    },

    deleteExpense(id) {
      deps.persist((prev) => applyDeleteExpense(prev, id));
    },

    markExpensesPaid(ids) {
      deps.persist((prev) => applyMarkExpensesPaid(prev, ids));
    },

    requestExpensePayout(expenseId, requestedBy) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyRequestExpensePayout(
          prev,
          expenseId,
          requestedBy,
          ctx,
        );
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    approveExpensePayout(expenseId, approverId) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyApproveExpensePayout(
          prev,
          expenseId,
          approverId,
          ctx,
        );
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    rejectExpensePayout(expenseId, approverId) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyRejectExpensePayout(prev, expenseId, approverId);
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    updateFundBudget(input) {
      deps.persist((prev) => applyUpdateFundBudget(prev, input));
    },

    updateClientDepositStatus(contractId, status, depositDate) {
      deps.persist((prev) =>
        applyUpdateClientDepositStatus(
          prev,
          contractId,
          status,
          depositDate,
          deps.todayISO(),
        ),
      );
    },
  };
}
