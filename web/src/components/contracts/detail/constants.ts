import { Building2, ClipboardList, History, Receipt, RefreshCw } from "lucide-react";
import type { ExecutionInput, ExpenseInput, PayoutStatus } from "@/lib/types";

export type ContractDetailTab =
  | "overview"
  | "executions"
  | "expenses"
  | "extension"
  | "history";

export const CONTRACT_DETAIL_TABS = [
  {
    id: "overview" as const,
    label: "계약 현황",
    icon: Building2,
    accent: "cyan" as const,
  },
  {
    id: "executions" as const,
    label: "실행 진행",
    icon: ClipboardList,
    accent: "emerald" as const,
  },
  {
    id: "expenses" as const,
    label: "집행 원가",
    icon: Receipt,
    accent: "amber" as const,
  },
  {
    id: "extension" as const,
    label: "연장 신청",
    icon: RefreshCw,
    accent: "violet" as const,
  },
  {
    id: "history" as const,
    label: "계약 기록",
    icon: History,
    accent: "sky" as const,
  },
];

export const emptyExecution = (contractId: string): ExecutionInput => ({
  contractId,
  type: "optimized",
  status: "pending",
  completedCount: 0,
  targetCount: 0,
  dueDate: "",
  memo: "",
  postLinks: [],
});

export const emptyExpense = (contractId: string): ExpenseInput => ({
  contractId,
  category: "press",
  description: "",
  amount: 0,
  bankAccount: "",
  accountHolder: "",
  payoutStatus: "unpaid",
  paymentDueDate: "",
});

export const PAYOUT_VARIANT: Record<
  PayoutStatus,
  "danger" | "warning" | "success" | "info"
> = {
  unpaid: "danger",
  pending_approval: "info",
  pending_transfer: "warning",
  paid: "success",
};
