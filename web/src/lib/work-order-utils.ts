import type {
  AppData,
  Contract,
  ExecutionType,
  ExpenseCategory,
  PartnerCategory,
  TaskChannelDefinition,
  WorkOrder,
  WorkOrderCostLine,
  WorkOrderCostType,
  WorkOrderInput,
  WorkOrderStage,
  WorkOrderTaskType,
} from "@/lib/types";
import {
  getContractTargetCount,
  getTaskChannelLabel,
  getWorkOrderTaskChannels,
  shouldSyncExecutionForChannel,
  taskChannelToExecutionType,
  taskChannelToExpenseCategory,
  taskChannelToPartnerCategory,
} from "@/lib/task-channel-utils";

/** @deprecated 설정(taskChannels) 우선 — getWorkOrderTaskLabel(data, id) 사용 */
export const WORK_ORDER_TASK_LABELS: Record<string, string> = {
  blog: "최적블로그",
  influencer: "인플루언서",
  experience: "체험단",
  insta_card: "인스타카드",
  press: "기자단",
  referral: "리셀러",
};

/** 월 광고비 10% 소개 수수료 */
export function calcReferralWorkOrderAmount(monthlyFee: number): number {
  return Math.round(monthlyFee * 0.1);
}

export function shouldSyncExecutionForTask(
  taskType: WorkOrderTaskType,
  channels?: TaskChannelDefinition[],
): boolean {
  if (channels) return shouldSyncExecutionForChannel(channels, taskType);
  return taskType !== "referral";
}

export const WORK_ORDER_COST_LABELS: Record<WorkOrderCostType, string> = {
  manuscript: "원고료",
  filming: "촬영비",
  travel: "출장비",
  other: "기타",
};

export const WORK_ORDER_STAGE_LABELS: Record<WorkOrderStage, string> = {
  draft: "업무 생성",
  pending_approval: "파트너 승인 대기",
  approved: "승인 · 결과 입력 대기",
  delivered: "링크/메모 제출 · 입금 대기",
  paid: "입금 확인",
  order_ready: "오더준 완료",
  rejected: "반려",
};

/** 고객사 포털용 단계 표기 */
export const CLIENT_WORK_STAGE_LABELS: Record<WorkOrderStage, string> = {
  draft: "업무 준비",
  pending_approval: "업무 배정 · 검토",
  approved: "진행 중",
  delivered: "결과 등록 완료",
  paid: "검수 완료",
  order_ready: "반영 완료",
  rejected: "재조정",
};

export function workOrderKey(
  contractId: string,
  taskType: WorkOrderTaskType,
  sequence: number,
): string {
  return `${contractId}:${taskType}:${sequence}`;
}

export function spreadDueDate(
  contract: Contract,
  index: number,
  total: number,
): string {
  const start = new Date(`${contract.contractStartDate}T12:00:00`);
  const end = new Date(`${contract.contractEndDate}T12:00:00`);
  if (total <= 1) return contract.contractEndDate;
  const ratio = (index + 1) / (total + 1);
  const ms = start.getTime() + (end.getTime() - start.getTime()) * ratio;
  return new Date(ms).toISOString().slice(0, 10);
}

export function generateWorkOrdersForContract(
  contract: Contract,
  existing: WorkOrder[],
  channels: TaskChannelDefinition[],
): WorkOrderInput[] {
  if (contract.status !== "active") return [];

  const existingKeys = new Set(
    existing
      .filter((w) => w.contractId === contract.id)
      .map((w) => workOrderKey(w.contractId, w.taskType, w.sequence)),
  );

  const created: WorkOrderInput[] = [];

  for (const channel of getWorkOrderTaskChannels(channels)) {
    const count = getContractTargetCount(contract, channel);
    for (let seq = 1; seq <= count; seq++) {
      const key = workOrderKey(contract.id, channel.id, seq);
      if (existingKeys.has(key)) continue;

      const isReferral = channel.kind === "referral_promo";
      const label = getTaskChannelLabel(channels, channel.id);
      created.push({
        contractId: contract.id,
        taskType: channel.id,
        sequence: seq,
        title: isReferral
          ? `${label} 수수료 (월 10%)`
          : `${label} ${seq}/${count}`,
        dueDate: isReferral
          ? contract.contractStartDate
          : spreadDueDate(contract, seq, count),
        partnerId: isReferral ? contract.referrerPartnerId : undefined,
        costLines: isReferral
          ? buildReferralCostLines(contract.monthlyFee)
          : [],
        stage: "draft",
        postLinks: [],
        memo: isReferral ? "리셀러 · 10% 수수료" : "",
        createdAt: new Date().toISOString().slice(0, 10),
      });
    }
  }

  return created;
}

export function syncAllWorkOrders(
  contracts: Contract[],
  existing: WorkOrder[],
  channels: TaskChannelDefinition[],
): WorkOrder[] {
  const next = [...existing];
  for (const contract of contracts) {
    const generated = generateWorkOrdersForContract(contract, next, channels);
    for (const input of generated) {
      next.push({ ...input, id: `wo-${crypto.randomUUID().slice(0, 8)}` });
    }
  }
  return next;
}

export function taskTypeToPartnerCategory(
  type: WorkOrderTaskType,
  channels?: TaskChannelDefinition[],
): PartnerCategory {
  if (channels) return taskChannelToPartnerCategory(channels, type);
  return taskChannelToPartnerCategory([], type);
}

export function taskTypeToExecutionType(
  type: WorkOrderTaskType,
  channels?: TaskChannelDefinition[],
): ExecutionType {
  if (channels) return taskChannelToExecutionType(channels, type);
  return taskChannelToExecutionType([], type);
}

export function taskTypeToExpenseCategory(
  type: WorkOrderTaskType,
  channels?: TaskChannelDefinition[],
): ExpenseCategory {
  if (channels) return taskChannelToExpenseCategory(channels, type);
  return taskChannelToExpenseCategory([], type);
}

export function calcWorkOrderTotal(lines: WorkOrderCostLine[]): number {
  return lines.reduce((s, l) => s + (l.amount || 0), 0);
}

export function formatCostLinesSummary(lines: WorkOrderCostLine[]): string {
  return lines
    .filter((l) => l.amount > 0)
    .map((l) => `${WORK_ORDER_COST_LABELS[l.type]} ${l.amount.toLocaleString()}원`)
    .join(" · ");
}

export function emptyCostLines(): WorkOrderCostLine[] {
  return (
    Object.keys(WORK_ORDER_COST_LABELS) as WorkOrderCostType[]
  ).map((type) => ({ type, amount: 0 }));
}

export function buildReferralCostLines(monthlyFee: number): WorkOrderCostLine[] {
  const amount = calcReferralWorkOrderAmount(monthlyFee);
  return emptyCostLines().map((line) =>
    line.type === "other" ? { ...line, amount } : line,
  );
}

export function enrichWorkOrder(data: AppData, order: WorkOrder) {
  const contract = data.contracts.find((c) => c.id === order.contractId);
  const partner = order.partnerId
    ? data.partners.find((p) => p.id === order.partnerId)
    : undefined;
  const staff = contract
    ? data.users.find((u) => u.id === contract.assignedStaffId)
    : undefined;

  return {
    ...order,
    clientName: contract?.clientName ?? "-",
    partnerName: partner?.companyName ?? "-",
    staffName: staff?.name ?? "-",
    totalAmount: calcWorkOrderTotal(order.costLines),
    costSummary: formatCostLinesSummary(order.costLines),
  };
}

export type EnrichedWorkOrder = ReturnType<typeof enrichWorkOrder>;

export function filterWorkOrdersByPartner(
  orders: WorkOrder[],
  partnerId: string,
): WorkOrder[] {
  return orders.filter((o) => o.partnerId === partnerId);
}

export function filterWorkOrdersByContract(
  orders: WorkOrder[],
  contractId: string,
): WorkOrder[] {
  return orders.filter((o) => o.contractId === contractId);
}

export function sortWorkOrdersTimeline(orders: WorkOrder[]): WorkOrder[] {
  return [...orders].sort((a, b) => {
    const dateCmp = a.dueDate.localeCompare(b.dueDate);
    if (dateCmp !== 0) return dateCmp;
    const typeCmp = a.taskType.localeCompare(b.taskType);
    if (typeCmp !== 0) return typeCmp;
    return a.sequence - b.sequence;
  });
}

export function buildExpenseDescription(
  order: WorkOrder,
  channels: TaskChannelDefinition[],
): string {
  const summary = formatCostLinesSummary(order.costLines);
  const label = getTaskChannelLabel(channels, order.taskType);
  return `${label} ${order.sequence} · ${summary || "집행 원가"}`;
}

const COMPLETED_STAGES: WorkOrderStage[] = ["order_ready", "paid"];

const STAGE_PROGRESS_WEIGHT: Record<WorkOrderStage, number> = {
  draft: 0,
  rejected: 8,
  pending_approval: 25,
  approved: 50,
  delivered: 75,
  paid: 90,
  order_ready: 100,
};

export interface FieldProgress {
  taskType: WorkOrderTaskType;
  label: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  percent: number;
  weightedPercent: number;
}

export interface ContractWorkProgress {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overallPercent: number;
  weightedPercent: number;
  fields: FieldProgress[];
}

function isCompletedStage(stage: WorkOrderStage): boolean {
  return COMPLETED_STAGES.includes(stage);
}

function isPendingStage(stage: WorkOrderStage): boolean {
  return stage === "draft" || stage === "rejected";
}

export function calcContractWorkProgress(
  orders: WorkOrder[],
  channels: TaskChannelDefinition[],
): ContractWorkProgress {
  const total = orders.length;
  let completed = 0;
  let inProgress = 0;
  let pending = 0;
  let weightSum = 0;

  const byType = new Map<WorkOrderTaskType, WorkOrder[]>();
  for (const order of orders) {
    if (isCompletedStage(order.stage)) completed++;
    else if (isPendingStage(order.stage)) pending++;
    else inProgress++;

    weightSum += STAGE_PROGRESS_WEIGHT[order.stage];

    const list = byType.get(order.taskType) ?? [];
    list.push(order);
    byType.set(order.taskType, list);
  }

  const woChannels = getWorkOrderTaskChannels(channels);
  const fields: FieldProgress[] = woChannels
    .map((channel) => {
      const list = byType.get(channel.id) ?? [];
      if (list.length === 0) return null;
      let fCompleted = 0;
      let fInProgress = 0;
      let fPending = 0;
      let fWeight = 0;
      for (const o of list) {
        if (isCompletedStage(o.stage)) fCompleted++;
        else if (isPendingStage(o.stage)) fPending++;
        else fInProgress++;
        fWeight += STAGE_PROGRESS_WEIGHT[o.stage];
      }
      const fTotal = list.length;
      return {
        taskType: channel.id,
        label: channel.label,
        total: fTotal,
        completed: fCompleted,
        inProgress: fInProgress,
        pending: fPending,
        percent: fTotal > 0 ? Math.round((fCompleted / fTotal) * 100) : 0,
        weightedPercent: fTotal > 0 ? Math.round(fWeight / fTotal) : 0,
      };
    })
    .filter((f): f is FieldProgress => f !== null);

  return {
    total,
    completed,
    inProgress,
    pending,
    overallPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    weightedPercent: total > 0 ? Math.round(weightSum / total) : 0,
    fields,
  };
}
