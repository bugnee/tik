import { canRunContractWork } from "@/lib/client-deposit-utils";
import { skipPartnerApprovalStages } from "@/lib/partner-workflow-config";
import {
  canConfirmReferralCommissionPayout,
  syncReferralCommissionWorkOrdersInData,
} from "@/lib/referral-commission-utils";
import { getValidPostLinks } from "@/lib/execution-utils";
import { findExecutionForWorkOrder } from "@/lib/execution-generation-utils";
import { getContractTargetCount } from "@/lib/task-channel-utils";
import {
  buildExpenseDescription,
  calcWorkOrderTotal,
  canSubmitWorkOrderToPartner,
  generateWorkOrdersForContract,
  isReferralCommissionWorkOrder,
  shouldSyncExecutionForTask,
  taskTypeToExecutionType,
  taskTypeToExpenseCategory,
} from "@/lib/work-order-utils";
import type { AppData, WorkOrder, WorkOrderInput, WorkOrderStage } from "@/lib/types";
import type { IdFactory, TodayFn } from "@/core/data/persist-types";

/** 취소·보류·연기 가능 단계 */
const PAUSABLE_FROM_STAGES: WorkOrderStage[] = [
  "pending_approval",
  "pending_staff_confirm",
  "approved",
  "delivered",
];

/** 재개 가능 단계 (취소는 종료 상태) */
const RESUMABLE_STAGES: WorkOrderStage[] = ["on_hold", "postponed"];

export type WorkOrderActionContext = {
  newId: IdFactory;
  todayISO: TodayFn;
};

/** 고객사 광고비 입금 확인 전에는 계약 업무 변경을 막는다 */
function isContractWorkAllowed(prev: AppData, contractId: string): boolean {
  return canRunContractWork(prev, contractId);
}

export function applyUpdateWorkOrder(
  prev: AppData,
  id: string,
  input: Partial<WorkOrderInput>,
): AppData {
  const order = prev.workOrders.find((w) => w.id === id);
  if (
    !order ||
    !["draft", "rejected"].includes(order.stage) ||
    !isContractWorkAllowed(prev, order.contractId)
  ) {
    return prev;
  }
  return {
    ...prev,
    workOrders: prev.workOrders.map((w) =>
      w.id === id ? { ...w, ...input } : w,
    ),
  };
}

export function applySubmitWorkOrder(
  prev: AppData,
  id: string,
  requestedBy: string,
  ctx: WorkOrderActionContext,
): { next: AppData; ok: boolean } {
  const order = prev.workOrders.find((w) => w.id === id);
  if (
    !order ||
    isReferralCommissionWorkOrder(order) ||
    !["draft", "rejected"].includes(order.stage) ||
    !isContractWorkAllowed(prev, order.contractId) ||
    !canSubmitWorkOrderToPartner(order, prev.taskChannels)
  ) {
    return { next: prev, ok: false };
  }
  const nextStage: WorkOrder["stage"] = skipPartnerApprovalStages()
    ? "approved"
    : "pending_approval";

  return {
    ok: true,
    next: {
      ...prev,
      workOrders: prev.workOrders.map((w) =>
        w.id === id
          ? {
              ...w,
              stage: nextStage,
              requestedBy,
              requestedAt: ctx.todayISO(),
              rejectedReason: undefined,
              ...(skipPartnerApprovalStages()
                ? { approvedAt: ctx.todayISO() }
                : {}),
            }
          : w,
      ),
    },
  };
}

export function applyApproveWorkOrder(
  prev: AppData,
  id: string,
  partnerUserId: string,
  approvalNote: string | undefined,
  ctx: WorkOrderActionContext,
): { next: AppData; ok: boolean } {
  const order = prev.workOrders.find((w) => w.id === id);
  const actor = prev.users.find((u) => u.id === partnerUserId);
  if (
    !order ||
    order.stage !== "pending_approval" ||
    !actor?.partnerId ||
    order.partnerId !== actor.partnerId
  ) {
    return { next: prev, ok: false };
  }
  return {
    ok: true,
    next: {
      ...prev,
      workOrders: prev.workOrders.map((w) =>
        w.id === id
          ? {
              ...w,
              stage: "pending_staff_confirm" as const,
              approvedBy: partnerUserId,
              approvedAt: ctx.todayISO(),
              partnerApprovalNote: approvalNote?.trim() || undefined,
            }
          : w,
      ),
    },
  };
}

export function applyRejectWorkOrder(
  prev: AppData,
  id: string,
  reason: string,
): AppData {
  return {
    ...prev,
    workOrders: prev.workOrders.map((w) =>
      w.id === id && w.stage === "pending_approval"
        ? {
            ...w,
            stage: "rejected" as const,
            rejectedReason: reason || "파트너 반려",
          }
        : w,
    ),
  };
}

export function applyConfirmWorkOrderByStaff(
  prev: AppData,
  id: string,
): { next: AppData; ok: boolean } {
  const order = prev.workOrders.find((w) => w.id === id);
  if (!order || order.stage !== "pending_staff_confirm") {
    return { next: prev, ok: false };
  }
  if (!isContractWorkAllowed(prev, order.contractId)) {
    return { next: prev, ok: false };
  }
  return {
    ok: true,
    next: {
      ...prev,
      workOrders: prev.workOrders.map((w) =>
        w.id === id ? { ...w, stage: "approved" as const } : w,
      ),
    },
  };
}

export function applyRejectWorkOrderByStaff(
  prev: AppData,
  id: string,
  reason: string,
): { next: AppData; ok: boolean } {
  const order = prev.workOrders.find((w) => w.id === id);
  if (!order || order.stage !== "pending_staff_confirm") {
    return { next: prev, ok: false };
  }
  return {
    ok: true,
    next: {
      ...prev,
      workOrders: prev.workOrders.map((w) =>
        w.id === id
          ? {
              ...w,
              stage: "rejected" as const,
              rejectedReason: reason.trim() || "담당 반려",
            }
          : w,
      ),
    },
  };
}

export function applyDeliverWorkOrder(
  prev: AppData,
  id: string,
  postLinks: WorkOrder["postLinks"],
  memo: string,
  ctx: WorkOrderActionContext,
): { next: AppData; ok: boolean } {
  const order = prev.workOrders.find((w) => w.id === id);
  if (!order || order.stage !== "approved") {
    return { next: prev, ok: false };
  }
  if (isReferralCommissionWorkOrder(order)) {
    return { next: prev, ok: false };
  }
  const links = getValidPostLinks(postLinks);
  if (
    links.length === 0 &&
    !memo.trim() &&
    !isReferralCommissionWorkOrder(order)
  ) {
    return { next: prev, ok: false };
  }
  const resolvedMemo =
    memo.trim() || order.memo || (isReferralCommissionWorkOrder(order) ? "리셀러 · 10% 수수료" : "");
  return {
    ok: true,
    next: {
      ...prev,
      workOrders: prev.workOrders.map((w) =>
        w.id === id
          ? {
              ...w,
              stage: "delivered" as const,
              postLinks: links,
              memo: resolvedMemo,
              deliveredAt: ctx.todayISO(),
            }
          : w,
      ),
    },
  };
}

/** 지급 확인 시 비용·실행·계약 진행률을 함께 반영한다 */
export function applyConfirmWorkOrderPayment(
  prev: AppData,
  id: string,
  paidBy: string,
  ctx: WorkOrderActionContext,
): { next: AppData; ok: boolean } {
  const order = prev.workOrders.find((w) => w.id === id);
  if (
    !order ||
    order.stage !== "delivered" ||
    !isContractWorkAllowed(prev, order.contractId)
  ) {
    return { next: prev, ok: false };
  }
  const contract = prev.contracts.find((c) => c.id === order.contractId);
  if (
    isReferralCommissionWorkOrder(order) &&
    !canConfirmReferralCommissionPayout(contract, order, ctx.todayISO())
  ) {
    return { next: prev, ok: false };
  }
  const partner = prev.partners.find((p) => p.id === order.partnerId);
  const total = calcWorkOrderTotal(order.costLines);

  const expenseId = total > 0 ? ctx.newId("e") : undefined;
  const expense =
    total > 0 && expenseId
      ? {
          id: expenseId,
          contractId: order.contractId,
          category: taskTypeToExpenseCategory(order.taskType, prev.taskChannels),
          description: buildExpenseDescription(order, prev.taskChannels),
          amount: total,
          bankAccount: partner?.bankAccount ?? "",
          accountHolder: partner?.accountHolder ?? "",
          partnerId: order.partnerId,
          paymentDueDate: order.dueDate,
          payoutStatus: "paid" as const,
        }
      : null;

  const execType = taskTypeToExecutionType(order.taskType, prev.taskChannels);
  let executionId = order.executionId;
  let executions = [...prev.executions];

  if (shouldSyncExecutionForTask(order.taskType, prev.taskChannels)) {
    const existing = findExecutionForWorkOrder(
      executions,
      order.contractId,
      order.taskType,
      prev.taskChannels,
    );

    if (existing) {
      const mergedLinks = [
        ...existing.postLinks,
        ...order.postLinks.filter(
          (l) => !existing.postLinks.some((p) => p.url === l.url),
        ),
      ];
      const completedCount = Math.min(
        existing.targetCount,
        existing.completedCount + 1,
      );
      executionId = existing.id;
      executions = executions.map((e) =>
        e.id === existing.id
          ? {
              ...e,
              postLinks: mergedLinks,
              completedCount,
              status:
                completedCount >= e.targetCount
                  ? ("completed" as const)
                  : ("in_progress" as const),
              completedDate:
                completedCount >= e.targetCount
                  ? ctx.todayISO()
                  : e.completedDate,
            }
          : e,
      );
    } else {
      const contract = prev.contracts.find((c) => c.id === order.contractId);
      const channel = prev.taskChannels.find((c) => c.id === order.taskType);
      const targetCount =
        contract && channel
          ? getContractTargetCount(contract, channel) || 1
          : 1;
      const newExec = {
        id: ctx.newId("ex"),
        contractId: order.contractId,
        type: execType,
        taskChannelId: order.taskType,
        status: "in_progress" as const,
        completedCount: 1,
        targetCount,
        dueDate: order.dueDate,
        memo: order.memo ?? "",
        postLinks: order.postLinks,
        enteredAt: ctx.todayISO(),
      };
      executionId = newExec.id;
      executions.push(newExec);
    }
  }

  const contracts = shouldSyncExecutionForTask(
    order.taskType,
    prev.taskChannels,
  )
    ? prev.contracts.map((c) => {
        if (c.id !== order.contractId) return c;
        const channel = prev.taskChannels.find(
          (ch) => ch.id === order.taskType,
        );
        if (channel?.contractDoneField) {
          const field = channel.contractDoneField;
          const target = getContractTargetCount(c, channel);
          return {
            ...c,
            [field]: Math.min(target, (c[field] ?? 0) + 1),
          };
        }
        if (execType === "optimized") {
          return {
            ...c,
            optimizedDone: Math.min(c.targetOptimized, c.optimizedDone + 1),
          };
        }
        if (execType === "influencer") {
          return {
            ...c,
            influencerDone: Math.min(c.targetInfluencer, c.influencerDone + 1),
          };
        }
        return c;
      })
    : prev.contracts;

  return {
    ok: true,
    next: {
      ...prev,
      expenses: expense ? [...prev.expenses, expense] : prev.expenses,
      executions,
      contracts,
      workOrders: prev.workOrders.map((w) =>
        w.id === id
          ? {
              ...w,
              stage: "order_ready" as const,
              paidAt: ctx.todayISO(),
              paidBy,
              expenseId,
              executionId,
            }
          : w,
      ),
    },
  };
}

export function applyEnsureContractWorkOrders(
  prev: AppData,
  contractId: string,
  ctx: WorkOrderActionContext,
): AppData {
  const contract = prev.contracts.find((c) => c.id === contractId);
  if (!contract || contract.status !== "active") return prev;
  const generated = generateWorkOrdersForContract(
    contract,
    prev.workOrders,
    prev.taskChannels,
  );
  if (generated.length === 0) return prev;
  return {
    ...prev,
    workOrders: [
      ...prev.workOrders,
      ...generated.map((g) => ({ ...g, id: ctx.newId("wo") })),
    ],
  };
}

/** 업무 취소 — 종료 상태, 재개 불가 */
export function applyCancelWorkOrder(
  prev: AppData,
  id: string,
  reason?: string,
): { next: AppData; ok: boolean } {
  const order = prev.workOrders.find((w) => w.id === id);
  if (!order || !PAUSABLE_FROM_STAGES.includes(order.stage)) {
    return { next: prev, ok: false };
  }
  return {
    ok: true,
    next: {
      ...prev,
      workOrders: prev.workOrders.map((w) =>
        w.id === id
          ? {
              ...w,
              stage: "cancelled" as const,
              previousStage: undefined,
              postponedDueDate: undefined,
              memo: reason?.trim() || w.memo || "업무 취소",
            }
          : w,
      ),
    },
  };
}

/** 업무 보류 — 이전 단계 저장 후 재개 가능 */
export function applyHoldWorkOrder(
  prev: AppData,
  id: string,
  reason?: string,
): { next: AppData; ok: boolean } {
  const order = prev.workOrders.find((w) => w.id === id);
  if (!order || !PAUSABLE_FROM_STAGES.includes(order.stage)) {
    return { next: prev, ok: false };
  }
  return {
    ok: true,
    next: {
      ...prev,
      workOrders: prev.workOrders.map((w) =>
        w.id === id
          ? {
              ...w,
              previousStage: order.stage,
              stage: "on_hold" as const,
              memo: reason?.trim() || w.memo || "업무 보류",
            }
          : w,
      ),
    },
  };
}

/** 업무 연기 — 마감일 변경 후 재개 가능 */
export function applyPostponeWorkOrder(
  prev: AppData,
  id: string,
  newDueDate: string,
  reason?: string,
): { next: AppData; ok: boolean } {
  const order = prev.workOrders.find((w) => w.id === id);
  if (
    !order ||
    !PAUSABLE_FROM_STAGES.includes(order.stage) ||
    !newDueDate.trim()
  ) {
    return { next: prev, ok: false };
  }
  return {
    ok: true,
    next: {
      ...prev,
      workOrders: prev.workOrders.map((w) =>
        w.id === id
          ? {
              ...w,
              previousStage: order.stage,
              stage: "postponed" as const,
              postponedDueDate: newDueDate.trim(),
              dueDate: newDueDate.trim(),
              memo: reason?.trim() || w.memo || "일정 연기",
            }
          : w,
      ),
    },
  };
}

/** 보류·연기 업무 재개 — previousStage로 복원 */
export function applyResumeWorkOrder(
  prev: AppData,
  id: string,
): { next: AppData; ok: boolean } {
  const order = prev.workOrders.find((w) => w.id === id);
  if (
    !order ||
    !RESUMABLE_STAGES.includes(order.stage) ||
    !order.previousStage
  ) {
    return { next: prev, ok: false };
  }
  const restoreStage = order.previousStage;
  return {
    ok: true,
    next: {
      ...prev,
      workOrders: prev.workOrders.map((w) =>
        w.id === id
          ? {
              ...w,
              stage: restoreStage,
              previousStage: undefined,
              postponedDueDate: undefined,
            }
          : w,
      ),
    },
  };
}

/** 고객 입금·10일 지급 규칙 — 리셀러 수수료 건 일정 동기화 */
export function applySyncReferralCommissionWorkOrders(
  prev: AppData,
  today: string,
  contractId?: string,
): AppData {
  const workOrders = syncReferralCommissionWorkOrdersInData(
    prev,
    today,
    contractId,
  );
  const changed = workOrders.some(
    (order, index) => order !== prev.workOrders[index],
  );
  if (!changed) return prev;
  return { ...prev, workOrders };
}
