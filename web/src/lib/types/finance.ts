export type ExpenseCategory = string;
export type PayoutStatus =
  | "unpaid"
  | "pending_approval"
  | "pending_transfer"
  | "paid";

export interface Expense {
  id: string;
  contractId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  bankAccount: string;
  accountHolder: string;
  payoutStatus: PayoutStatus;
  /** 파트너사 입금 마감일 */
  paymentDueDate: string;
  /** 입금 요청 · 결재 */
  payoutRequestedBy?: string;
  payoutRequestedAt?: string;
  payoutApprovedBy?: string;
  payoutApprovedAt?: string;
  /** 집행 파트너사 (기자단/체험단/인플루언서/블로그) */
  partnerId?: string;
}

/** 원가 · 집행 분야 (기자단, 체험단, 경비 등) */
export interface ExpenseCategoryDefinition {
  id: ExpenseCategory;
  label: string;
  sortOrder: number;
  isActive: boolean;
  isSystem?: boolean;
  /** 파트너사 필터 — null이면 분야 무관(경비 등) */
  partnerCategory?: string | null;
}

export type ExpenseCategoryInput = Omit<ExpenseCategoryDefinition, "isSystem">;

export interface FundBudget {
  monthlyBudget: number;
  expenseAllocated: number;
  bonusAllocated: number;
  operatingReserve: number;
  /** 고객사 광고비 입금 안내 계좌 */
  clientDepositBankName?: string;
  clientDepositAccountNumber?: string;
  clientDepositAccountHolder?: string;
}
