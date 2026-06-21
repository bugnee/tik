import {
  canRunContractWork,
  isClientDepositBlockingWork,
  isClientDepositConfirmed,
  resolveClientDepositStatus,
} from "@/lib/client-deposit-utils";
import { JEJU_OSEONG_CONTRACT_ID } from "@/lib/jeju-oseong-operational-data";
import {
  canConfirmReferralCommissionPayout,
} from "@/lib/referral-commission-utils";
import {
  FINANCE_SECTION_CLIENT_DEPOSIT,
  financeSectionHref,
} from "@/lib/role-action-utils";
import type { AppData, Contract, UserRole, WorkOrder } from "@/lib/types";
import { filterContractsByRole } from "@/lib/selectors";
import {
  filterWorkOrdersByContract,
  isReferralCommissionWorkOrder,
} from "@/lib/work-order-utils";

/** TripItKorea 표준 운영 흐름 기준 계약 — 제주 오성(c-1) 데모 */
export const STANDARD_CONTRACT_ID = JEJU_OSEONG_CONTRACT_ID;

export type StandardWorkflowStepId =
  | "contract"
  | "deposit"
  | "work_orders"
  | "assign_partner"
  | "deliver"
  | "payout";

export type StandardWorkflowStepDef = {
  id: StandardWorkflowStepId;
  label: string;
  /** 매뉴얼형 안내 — 해당 단계에서 확인할 내용 */
  manualHint: string;
  role: UserRole;
  roleLabel: string;
  href: (contractId: string) => string;
};

/** 계약 → 입금 → 업무 생성 → 파트너 배정 → 집행·결과 → 원가 지급 */
export const STANDARD_WORKFLOW_STEPS: StandardWorkflowStepDef[] = [
  {
    id: "contract",
    label: "계약 등록·활성화",
    manualHint: "계약 조건·담당 배정이 완료되었는지 확인합니다.",
    role: "staff",
    roleLabel: "실무 담당",
    href: (id) => `/contracts/${id}`,
  },
  {
    id: "deposit",
    label: "고객사 입금 확인",
    manualHint:
      "재무담당이 광고비 입금을 확인해야 업무를 시작할 수 있습니다.",
    role: "finance_manager",
    roleLabel: "재무 담당",
    href: () => financeSectionHref(FINANCE_SECTION_CLIENT_DEPOSIT),
  },
  {
    id: "work_orders",
    label: "업무(워크오더) 생성",
    manualHint:
      "계약 목표 채널별 업무 건이 생성됩니다. 실행 페이지에서 확인하세요.",
    role: "staff",
    roleLabel: "실무 담당",
    href: (id) => `/executions?contract=${id}`,
  },
  {
    id: "assign_partner",
    label: "파트너·비용 배정",
    manualHint:
      "초안 업무에 파트너와 원가를 입력한 뒤 제출합니다.",
    role: "staff",
    roleLabel: "실무 담당",
    href: (id) => `/executions?contract=${id}`,
  },
  {
    id: "deliver",
    label: "집행·결과 등록",
    manualHint:
      "승인된 업무의 포스팅 링크·결과물을 등록합니다.",
    role: "staff",
    roleLabel: "실무 담당",
    href: (id) => `/executions?contract=${id}`,
  },
  {
    id: "payout",
    label: "파트너 원가 지급",
    manualHint:
      "결과 등록 후 파트너 원가 입금(또는 리셀러 수수료)을 확인합니다.",
    role: "staff",
    roleLabel: "실무 담당",
    href: (id) => `/executions?contract=${id}`,
  },
];

export type StandardWorkflowStepStatus = "completed" | "current" | "locked";

export type StandardWorkflowStepState = StandardWorkflowStepDef & {
  status: StandardWorkflowStepStatus;
  blocker?: string;
};

export type StandardWorkflowProgress = {
  contractId: string;
  contractName: string;
  exists: boolean;
  steps: StandardWorkflowStepState[];
  currentStepIndex: number;
  completedStepIds: StandardWorkflowStepId[];
  blockers: string[];
};

const ACTIVE_WORK_STAGES: WorkOrder["stage"][] = [
  "draft",
  "rejected",
  "pending_approval",
  "pending_staff_confirm",
  "approved",
  "delivered",
  "paid",
  "order_ready",
  "on_hold",
  "postponed",
];

function activeWorkOrders(data: AppData, contractId: string): WorkOrder[] {
  return filterWorkOrdersByContract(data.workOrders, contractId).filter((o) =>
    ACTIVE_WORK_STAGES.includes(o.stage),
  );
}

function countDraftOrders(orders: WorkOrder[]): number {
  return orders.filter((o) => o.stage === "draft" || o.stage === "rejected")
    .length;
}

function countDeliverPending(
  orders: WorkOrder[],
  contract: Contract | undefined,
): number {
  return orders.filter((o) => {
    if (o.stage !== "approved") return false;
    if (contract && isClientDepositBlockingWork(contract)) return false;
    return true;
  }).length;
}

function countPayoutPending(
  data: AppData,
  orders: WorkOrder[],
  contract: Contract | undefined,
): number {
  return orders.filter((o) => {
    if (o.stage !== "delivered") return false;
    if (!contract || !canRunContractWork(data, contract.id)) return false;
    if (isReferralCommissionWorkOrder(o)) {
      return canConfirmReferralCommissionPayout(contract, o);
    }
    return true;
  }).length;
}

type StepEval = { done: boolean; blocker?: string };

function evaluateStep(
  stepId: StandardWorkflowStepId,
  contract: Contract,
  orders: WorkOrder[],
  priorDone: boolean,
  data: AppData,
): StepEval {
  if (!priorDone) {
    return { done: false, blocker: "이전 단계를 먼저 완료해 주세요." };
  }

  switch (stepId) {
    case "contract": {
      const done = contract.status === "active";
      return {
        done,
        blocker: done ? undefined : "계약이 활성 상태가 아닙니다.",
      };
    }
    case "deposit": {
      const done = isClientDepositConfirmed(contract);
      if (done) return { done: true };
      const status = resolveClientDepositStatus(contract);
      if (status === "overdue") {
        return {
          done: false,
          blocker:
            "입금 연체 — 재무담당에게 입금 확인을 요청하세요.",
        };
      }
      return {
        done: false,
        blocker:
          "고객사 광고비 입금 확인 대기 — 재무담당 확인 후 업무를 진행할 수 있습니다.",
      };
    }
    case "work_orders": {
      if (isClientDepositBlockingWork(contract)) {
        return {
          done: false,
          blocker: "입금 확인 후 업무 건을 생성·확인할 수 있습니다.",
        };
      }
      const done = orders.length > 0;
      return {
        done,
        blocker: done
          ? undefined
          : "실행 페이지에서 업무 건 생성을 확인하세요.",
      };
    }
    case "assign_partner": {
      const drafts = countDraftOrders(orders);
      const done = drafts === 0;
      return {
        done,
        blocker: done
          ? undefined
          : `초안·반려 업무 ${drafts}건 — 파트너·비용 설정 후 제출이 필요합니다.`,
      };
    }
    case "deliver": {
      const pending = countDeliverPending(orders, contract);
      const approvalWait = orders.filter(
        (o) =>
          o.stage === "pending_approval" ||
          o.stage === "pending_staff_confirm",
      ).length;
      const done = pending === 0 && approvalWait === 0;
      if (done) return { done: true };
      if (approvalWait > 0) {
        return {
          done: false,
          blocker: `승인·확인 대기 ${approvalWait}건 — 파트너·담당 확인 후 집행을 진행합니다.`,
        };
      }
      return {
        done: false,
        blocker: `진행 중 업무 ${pending}건 — 포스팅 링크·결과물을 등록하세요.`,
      };
    }
    case "payout": {
      const pending = countPayoutPending(data, orders, contract);
      const done = pending === 0;
      return {
        done,
        blocker: done
          ? undefined
          : `지급 확인 대기 ${pending}건 — 파트너 원가·리셀러 수수료 입금을 확인하세요.`,
      };
    }
    default:
      return { done: false };
  }
}

/** 표준 계약 존재 여부 */
export function getStandardContract(
  data: AppData,
  contractId = STANDARD_CONTRACT_ID,
): Contract | undefined {
  return data.contracts.find((c) => c.id === contractId);
}

export type WorkflowContractResolution = {
  contractId: string;
  /** true — 담당 계약 없을 때 교육용 c-1 폴백 */
  isTrainingFallback: boolean;
};

/**
 * 대시보드 표준 흐름에 쓸 계약 ID
 * 1) 역할 기준 활성 담당 계약 → 2) 교육용 c-1 폴백
 */
export function resolveWorkflowContractId(
  data: AppData,
  userId: string,
  role: UserRole,
): WorkflowContractResolution | null {
  const assigned = filterContractsByRole(data, role, userId)
    .filter((c) => c.status === "active")
    .sort((a, b) => a.clientName.localeCompare(b.clientName, "ko"));

  if (assigned.length > 0) {
    return { contractId: assigned[0]!.id, isTrainingFallback: false };
  }

  const demo = getStandardContract(data, STANDARD_CONTRACT_ID);
  if (demo?.status === "active") {
    return { contractId: STANDARD_CONTRACT_ID, isTrainingFallback: true };
  }

  return null;
}

/** 표준 운영 흐름 진행 상태 — 현재 단계·완료·차단 사유 */
export function getStandardWorkflowProgress(
  data: AppData,
  contractId = STANDARD_CONTRACT_ID,
): StandardWorkflowProgress {
  const contract = getStandardContract(data, contractId);
  if (!contract) {
    return {
      contractId,
      contractName: "—",
      exists: false,
      steps: STANDARD_WORKFLOW_STEPS.map((step) => ({
        ...step,
        status: "locked" as const,
        blocker: "기준 계약을 찾을 수 없습니다.",
      })),
      currentStepIndex: 0,
      completedStepIds: [],
      blockers: ["기준 계약을 찾을 수 없습니다."],
    };
  }

  const orders = activeWorkOrders(data, contractId);
  const evaluations: StepEval[] = [];
  let priorDone = true;

  for (const step of STANDARD_WORKFLOW_STEPS) {
    const evalResult = evaluateStep(step.id, contract, orders, priorDone, data);
    evaluations.push(evalResult);
    if (!evalResult.done) priorDone = false;
  }

  const completedStepIds = STANDARD_WORKFLOW_STEPS.filter(
    (_, i) => evaluations[i]?.done,
  ).map((s) => s.id);

  const currentStepIndex = evaluations.findIndex((e) => !e.done);
  const resolvedCurrentIndex =
    currentStepIndex >= 0 ? currentStepIndex : STANDARD_WORKFLOW_STEPS.length - 1;

  const blockers = evaluations
    .map((e) => e.blocker)
    .filter((b): b is string => Boolean(b));

  const steps: StandardWorkflowStepState[] = STANDARD_WORKFLOW_STEPS.map(
    (step, index) => {
      const evalResult = evaluations[index]!;
      let status: StandardWorkflowStepStatus;
      if (evalResult.done) {
        status = "completed";
      } else if (index === resolvedCurrentIndex) {
        status = "current";
      } else if (index > resolvedCurrentIndex) {
        status = "locked";
      } else {
        status = "current";
      }
      return {
        ...step,
        status,
        blocker: evalResult.blocker,
      };
    },
  );

  return {
    contractId,
    contractName: contract.clientName,
    exists: true,
    steps,
    currentStepIndex: resolvedCurrentIndex,
    completedStepIds,
    blockers,
  };
}
