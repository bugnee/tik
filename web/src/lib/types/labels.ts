import type { UserRole } from "@/lib/types/user";
import type { AccountStatus } from "@/lib/types/user";
import type { BonusPaymentStage } from "@/lib/types/bonus";
import type { PayoutStatus } from "@/lib/types/finance";
import type { ClientDepositStatus } from "@/lib/types/contract";
import type { QaThreadStatus } from "@/lib/types/qa";
import type { ExecutionType, ExecutionStatus } from "@/lib/types/execution";
import type { PipelineCategory, TerminationReason, ContractStatus } from "@/lib/types/contract";

export const ROLE_LABELS: Record<UserRole, string> = {
  staff: "실무 담당자",
  team_leader: "팀장",
  executive: "임원",
  ceo: "대표",
  finance_manager: "재무담당",
  partner: "파트너사",
  client: "고객사",
};

export const BONUS_STAGE_LABELS: Record<BonusPaymentStage, string> = {
  pending_staff: "담당 신청 · 팀장 결재 대기",
  pending_team_leader: "팀장 결재 대기",
  pending_executive: "임원 결재 대기",
  pending_ceo: "대표 결재 대기",
  ceo_confirmed: "마감 확정 · 급여 합산 대기",
  paid: "급여 합산 지급 완료",
  rejected: "반려",
};

export const PAYOUT_LABELS: Record<PayoutStatus, string> = {
  unpaid: "미지급",
  pending_approval: "입금요청",
  pending_transfer: "입금대기",
  paid: "입금완료",
};

export const CLIENT_DEPOSIT_STATUS_LABELS: Record<ClientDepositStatus, string> =
  {
    pending: "입금대기",
    completed: "입금완료",
    overdue: "연체",
    other: "기타",
  };

export const CLIENT_DEPOSIT_STATUS_VARIANT: Record<
  ClientDepositStatus,
  "default" | "warning" | "success" | "danger" | "info"
> = {
  pending: "warning",
  completed: "success",
  overdue: "danger",
  other: "info",
};

export const QA_THREAD_STATUS_LABELS: Record<QaThreadStatus, string> = {
  open: "미답변",
  answered: "답변완료",
  closed: "종료",
};

/** @deprecated — getExpenseCategoryLabel(data.expenseCategories, id) 사용 */
export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  press: "기자단",
  experience: "체험단",
  influencer: "인플루언서",
  other: "기타",
  expense: "경비",
};

export const EXECUTION_TYPE_LABELS: Record<ExecutionType, string> = {
  optimized: "최적블로그",
  influencer: "인플루언서",
  experience: "체험단",
  press: "기자단",
};

export const EXECUTION_STATUS_LABELS: Record<ExecutionStatus, string> = {
  pending: "대기",
  in_progress: "진행중",
  completed: "완료",
  delayed: "지연",
};

export const PIPELINE_CATEGORY_LABELS: Record<PipelineCategory, string> = {
  in_progress: "진행",
  extension_imminent: "연장임박",
  contract_ending: "계약종료",
};

export const TERMINATION_REASON_LABELS: Record<TerminationReason, string> = {
  budget_reduction: "예산 삭감",
  competitor_switch: "타사 이전",
  performance_issue: "성과 미달",
  client_request: "고객사 요청",
  service_complete: "서비스 종료(정상)",
  other: "기타",
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  active: "진행 중",
  terminated: "해지",
};

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  pending: "승인 대기",
  approved: "승인 완료",
  rejected: "반려",
};
