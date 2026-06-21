import type {
  AppData,
  Contract,
  ExecutionType,
  ExpenseCategory,
  PartnerCategory,
  PostLinkEntry,
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
import { getValidPostLinks } from "@/lib/execution-utils";
import { todayISO } from "@/lib/bonus-utils";
import { getReferralCommissionStageLabel } from "@/lib/referral-commission-utils";

/** @deprecated 설정(taskChannels) 우선 — getWorkOrderTaskLabel(data, id) 사용 */
export const WORK_ORDER_TASK_LABELS: Record<string, string> = {
  blog: "최적블로그",
  influencer: "인플루언서",
  experience: "체험단",
  insta_card: "인스타카드",
  press: "기자단",
  referral: "리셀러",
};

/** 월 광고비 10% 리셀러 수수료 */
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

/** 영업 후 계약 체결 수수료 — 집행·링크·키워드 업무 없음 */
export function isReferralCommissionWorkOrder(
  order: Pick<WorkOrder, "taskType">,
): boolean {
  return order.taskType === "referral";
}

export const WORK_ORDER_COST_LABELS: Record<WorkOrderCostType, string> = {
  manuscript: "원고료",
  filming: "촬영비",
  travel: "출장비",
  other: "기타",
};

/** 원가 항목별 UI 색상 (텍스트) */
export const WORK_ORDER_COST_ACCENT: Record<WorkOrderCostType, string> = {
  manuscript: "text-cyan-400",
  filming: "text-violet-400",
  travel: "text-amber-400",
  other: "text-rose-400",
};

/** 원가 항목별 UI 색상 (배경·테두리) */
export const WORK_ORDER_COST_SURFACE: Record<WorkOrderCostType, string> = {
  manuscript: "border-cyan-500/30 bg-cyan-500/10",
  filming: "border-violet-500/30 bg-violet-500/10",
  travel: "border-amber-500/30 bg-amber-500/10",
  other: "border-rose-500/30 bg-rose-500/10",
};

export const WORK_ORDER_STAGE_LABELS: Record<WorkOrderStage, string> = {
  draft: "업무 생성",
  pending_approval: "파트너 승인 대기",
  pending_staff_confirm: "담당 확인 대기",
  approved: "승인 · 결과 입력 대기",
  delivered: "링크/메모 제출 · 입금 대기",
  paid: "입금 확인",
  order_ready: "오더준 완료",
  rejected: "반려",
  cancelled: "취소",
  on_hold: "보류",
  postponed: "연기",
};

/** 워크오더 단계 → Badge variant (전 화면 공통) */
export const WORK_ORDER_STAGE_BADGE_VARIANT: Record<
  WorkOrderStage,
  "default" | "warning" | "success" | "danger" | "info"
> = {
  draft: "default",
  pending_approval: "warning",
  pending_staff_confirm: "warning",
  approved: "info",
  delivered: "warning",
  paid: "success",
  order_ready: "success",
  rejected: "danger",
  cancelled: "default",
  on_hold: "warning",
  postponed: "warning",
};

/** 업무 단계 라벨 — 리셀러 수수료는 입금+10일 규칙 반영 */
export function getWorkOrderStageLabel(
  order: WorkOrder,
  contract: Contract | undefined,
  referenceDate = todayISO(),
): string {
  if (isReferralCommissionWorkOrder(order)) {
    return getReferralCommissionStageLabel(order, contract, referenceDate);
  }
  return WORK_ORDER_STAGE_LABELS[order.stage];
}

/** 고객사 포털용 단계 표기 */
export const CLIENT_WORK_STAGE_LABELS: Record<WorkOrderStage, string> = {
  draft: "업무 준비",
  pending_approval: "업무 배정 · 검토",
  pending_staff_confirm: "파트너 검토 · 담당 확인",
  approved: "진행 중",
  delivered: "결과 등록 완료",
  paid: "검수 완료",
  order_ready: "반영 완료",
  rejected: "재조정",
  cancelled: "취소됨",
  on_hold: "일시 보류",
  postponed: "일정 연기",
};

export function workOrderKey(
  contractId: string,
  taskType: WorkOrderTaskType,
  sequence: number,
): string {
  return `${contractId}:${taskType}:${sequence}`;
}

const WORK_ORDER_STAGE_RANK: Record<WorkOrderStage, number> = {
  order_ready: 100,
  paid: 90,
  delivered: 80,
  approved: 70,
  pending_staff_confirm: 60,
  pending_approval: 50,
  on_hold: 40,
  postponed: 35,
  rejected: 20,
  draft: 10,
  cancelled: 0,
};

/** 동일 contract·분야·회차 업무 중복 제거 — 진행 단계가 높은 건 유지 */
export function dedupeWorkOrders(workOrders: WorkOrder[]): WorkOrder[] {
  const byKey = new Map<string, WorkOrder>();

  for (const order of workOrders) {
    const key = workOrderKey(order.contractId, order.taskType, order.sequence);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, order);
      continue;
    }
    const existingRank = WORK_ORDER_STAGE_RANK[existing.stage] ?? 0;
    const nextRank = WORK_ORDER_STAGE_RANK[order.stage] ?? 0;
    if (nextRank > existingRank) {
      byKey.set(key, order);
    }
  }

  return [...byKey.values()];
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
        memo: isReferral
          ? "고객사 입금 대기 · 입금 확인 후 10일 뒤 리셀러 지급"
          : "",
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

/** 리셀러 등 수수료 필수 분야는 비용 면제 불가 */
export function canWaiveWorkOrderCost(
  taskType: WorkOrderTaskType,
  channels?: TaskChannelDefinition[],
): boolean {
  if (taskType === "referral") return false;
  const channel = channels?.find((c) => c.id === taskType);
  return channel?.kind !== "referral_promo";
}

export function isNoCostWorkOrder(order: Pick<WorkOrder, "costLines">): boolean {
  return calcWorkOrderTotal(order.costLines) <= 0;
}

/** 파트너 승인 요청 가능 여부 — 파트너 필수, 리셀러는 비용 1원 이상 필수 */
export function canSubmitWorkOrderToPartner(
  order: Pick<WorkOrder, "partnerId" | "costLines" | "taskType">,
  channels?: TaskChannelDefinition[],
): boolean {
  if (!order.partnerId) return false;
  if (!canWaiveWorkOrderCost(order.taskType, channels)) {
    return calcWorkOrderTotal(order.costLines) > 0;
  }
  return true;
}

export function formatCostLinesSummary(lines: WorkOrderCostLine[]): string {
  const items = lines.filter((l) => l.amount > 0);
  if (items.length === 0) return "비용 없음";
  return items
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

/** 업무 건에 연결된 성과 링크 목록 (내부 조회) */
function collectWorkOrderPostLinkPool(
  data: AppData,
  order: WorkOrder,
): PostLinkEntry[] {
  if (isReferralCommissionWorkOrder(order)) return [];

  const fromOrder = getValidPostLinks(order.postLinks, order.dueDate);
  if (fromOrder.length > 0) return fromOrder;

  if (order.executionId) {
    const linked = data.executions.find((e) => e.id === order.executionId);
    if (linked) {
      return getValidPostLinks(
        linked.postLinks,
        linked.dueDate ?? order.dueDate,
      );
    }
  }

  const channel = data.taskChannels.find((c) => c.id === order.taskType);
  if (channel?.executionType) {
    const byChannel = data.executions.find(
      (e) =>
        e.contractId === order.contractId &&
        e.type === channel.executionType,
    );
    if (byChannel) {
      return getValidPostLinks(
        byChannel.postLinks,
        byChannel.dueDate ?? order.dueDate,
      );
    }
  }

  return [];
}

/** 회차(sequence)에 해당하는 링크 1건 — 집행 실행 전체 링크 중 N번째 매칭 */
function pickWorkOrderPostLinkForSequence(
  links: PostLinkEntry[],
  sequence: number,
): PostLinkEntry | null {
  if (links.length === 0) return null;
  if (links.length === 1) return links[0]!;
  const index = sequence - 1;
  if (index >= 0 && index < links.length) return links[index]!;
  return null;
}

/** 업무 건에 연결된 성과 링크 (워크오더 → 집행 실행 순으로 조회) */
export function resolveWorkOrderPostLinks(
  data: AppData,
  order: WorkOrder,
): PostLinkEntry[] {
  return collectWorkOrderPostLinkPool(data, order);
}

/** 업무 타임라인용 — 해당 회차 링크 1건만 */
export function resolveWorkOrderPostLink(
  data: AppData,
  order: WorkOrder,
): PostLinkEntry | null {
  const pool = collectWorkOrderPostLinkPool(data, order);
  return pickWorkOrderPostLinkForSequence(pool, order.sequence);
}

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

export const STAGE_PROGRESS_WEIGHT: Record<WorkOrderStage, number> = {
  draft: 0,
  rejected: 8,
  cancelled: 0,
  on_hold: 25,
  postponed: 20,
  pending_approval: 20,
  pending_staff_confirm: 35,
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
  return (
    stage === "draft" ||
    stage === "rejected" ||
    stage === "cancelled" ||
    stage === "on_hold" ||
    stage === "postponed"
  );
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
