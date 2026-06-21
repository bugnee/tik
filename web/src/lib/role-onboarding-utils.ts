import { financeSectionHref, FINANCE_SECTION_CLIENT_DEPOSIT } from "@/lib/role-action-utils";
import { STANDARD_CONTRACT_ID } from "@/lib/standard-contract-workflow";
import type { UserRole } from "@/lib/types";

/** 역할별 시스템 실무 가이드 — 신입도 대시보드만으로 업무 시작 */
export type RoleOnboardingStep = {
  id: string;
  order: number;
  title: string;
  /** 왜 이 단계가 필요한지 — 매뉴얼형 */
  description: string;
  href: string;
  /** 개발 시 함께 수정해야 할 연관 엔티티 (entity-relations.ts 참고) */
  relatedEntities: string[];
};

const STAFF_ONBOARDING: RoleOnboardingStep[] = [
  {
    id: "daily-actions",
    order: 1,
    title: "오늘 할 일 확인",
    description:
      "대시보드 상단에서 입금 대기·워크오더·Q&A 등 긴급 업무를 확인합니다. 모든 항목은 계약(contractId)과 연결됩니다.",
    href: "/dashboard",
    relatedEntities: ["Contract", "WorkOrder", "QaThread"],
  },
  {
    id: "standard-flow",
    order: 2,
    title: "표준 운영 흐름 따라가기",
    description:
      "계약 → 입금 → 업무 생성 → 파트너 배정 → 결과 등록 → 지급 확인 순서로 진행합니다. 차단 사유가 있으면 해당 화면으로 이동합니다.",
    href: `/executions?contract=${STANDARD_CONTRACT_ID}`,
    relatedEntities: ["Contract", "WorkOrder", "Expense"],
  },
  {
    id: "executions",
    order: 3,
    title: "실행(워크오더) 처리",
    description:
      "파트너·원가를 설정하고 제출한 뒤, 승인되면 포스팅 링크·결과물을 등록합니다. 단계(stage) 변경 시 입금·정산 상태도 함께 확인하세요.",
    href: `/executions?contract=${STANDARD_CONTRACT_ID}`,
    relatedEntities: ["WorkOrder", "Partner", "Execution"],
  },
  {
    id: "place-qa",
    order: 4,
    title: "플레이스 Q&A 응답",
    description:
      "고객사 문의는 계약별 스레드(threadId)로 관리됩니다. 답변 시 qaMessages와 thread 상태를 함께 갱신합니다.",
    href: "/place-qa",
    relatedEntities: ["QaThread", "QaMessage", "Contract"],
  },
  {
    id: "contracts",
    order: 5,
    title: "담당 계약·조건 확인",
    description:
      "계약 상세에서 목표 채널·연장·메모·조건 승인 이력을 확인합니다. 계약 변경은 workOrders·executions에 영향을 줍니다.",
    href: `/contracts/${STANDARD_CONTRACT_ID}`,
    relatedEntities: ["Contract", "ContractRecord", "ContractMemo"],
  },
];

const TEAM_LEADER_ONBOARDING: RoleOnboardingStep[] = [
  {
    id: "team-work-status",
    order: 1,
    title: "팀 업무 현황·승인",
    description:
      "팀원 실행 승인·담당 확인 대기 건을 처리합니다. PendingActions와 실행 페이지가 같은 contractId 기준으로 연결됩니다.",
    href: "/dashboard",
    relatedEntities: ["WorkOrder", "User", "Team"],
  },
  {
    id: "standard-flow",
    order: 2,
    title: "표준 운영 흐름 점검",
    description:
      "기준 계약의 단계별 진행을 확인하고, 팀원이 막힌 단계(입금·승인·지급)를 안내합니다.",
    href: `/executions?contract=${STANDARD_CONTRACT_ID}`,
    relatedEntities: ["Contract", "WorkOrder"],
  },
  {
    id: "bonus-approval",
    order: 3,
    title: "성과급·연장 승인",
    description:
      "연장 계약·성과급 요청은 bonusPayments·extensionApprovals와 연동됩니다. 승인 시 재무 정산 흐름을 확인하세요.",
    href: "/dashboard?section=bonus-approval",
    relatedEntities: ["BonusPayment", "ExtensionApproval", "Contract"],
  },
  {
    id: "work-evaluation",
    order: 4,
    title: "업무 평가 입력",
    description:
      "팀원 실적 평가는 workEvaluations에 저장됩니다. 평가 대상(evaluateeId)과 기간(period) 기준으로 관리합니다.",
    href: "/dashboard",
    relatedEntities: ["WorkEvaluation", "User"],
  },
];

const FINANCE_ONBOARDING: RoleOnboardingStep[] = [
  {
    id: "client-deposit",
    order: 1,
    title: "고객사 입금 확인",
    description:
      "광고비 입금 확인 전에는 실무 담당이 실행·집행을 시작할 수 없습니다. contract.depositStatus 변경 시 workOrders 차단이 해제됩니다.",
    href: financeSectionHref(FINANCE_SECTION_CLIENT_DEPOSIT),
    relatedEntities: ["Contract", "WorkOrder"],
  },
  {
    id: "expense-payout",
    order: 2,
    title: "원가·지급 결재",
    description:
      "파트너 원가(expenses)와 워크오더 지급 단계가 연결됩니다. 지급 확인 시 expense·workOrder.stage를 함께 갱신합니다.",
    href: "/finance",
    relatedEntities: ["Expense", "WorkOrder", "Partner"],
  },
  {
    id: "bonus-payroll",
    order: 3,
    title: "성과급 급여 합산",
    description:
      "성과급 지급(bonusPayments)은 fundBudget·급여 일정(15일 마감·25일 지급)과 연동됩니다.",
    href: "/finance",
    relatedEntities: ["BonusPayment", "FundBudget"],
  },
];

const EXECUTIVE_ONBOARDING: RoleOnboardingStep[] = [
  {
    id: "org-overview",
    order: 1,
    title: "조직·계약 현황",
    description:
      "팀(teamId)·담당(assignedStaffId) 기준으로 계약과 매출을 확인합니다. 대시보드 기간 필터와 월별 계약 패널을 함께 사용하세요.",
    href: "/dashboard",
    relatedEntities: ["Team", "User", "Contract"],
  },
  {
    id: "work-status",
    order: 2,
    title: "전사 업무 트리",
    description:
      "계약 → 실행 → 워크오더 관계형 트리로 병목을 파악합니다. 한 계약의 지연이 입금·파트너·Q&A와 연쇄될 수 있습니다.",
    href: "/dashboard",
    relatedEntities: ["Contract", "WorkOrder", "Execution"],
  },
];

/** ERP 내부 역할 — 시스템 실무 가이드 제공 대상 */
export const ROLE_ONBOARDING_STEPS: Partial<
  Record<UserRole, RoleOnboardingStep[]>
> = {
  staff: STAFF_ONBOARDING,
  team_leader: TEAM_LEADER_ONBOARDING,
  finance_manager: FINANCE_ONBOARDING,
  executive: EXECUTIVE_ONBOARDING,
};

export function getRoleOnboardingSteps(
  role: UserRole,
): RoleOnboardingStep[] {
  const steps = ROLE_ONBOARDING_STEPS[role];
  if (!steps) return [];
  return [...steps].sort((a, b) => a.order - b.order);
}

export function hasRoleOnboarding(role: UserRole): boolean {
  return (ROLE_ONBOARDING_STEPS[role]?.length ?? 0) > 0;
}
