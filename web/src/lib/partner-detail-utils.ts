import { enrichExpense } from "./selectors";
import type {
  AppData,
  Execution,
  Expense,
  Partner,
  PostLinkEntry,
  WorkOrder,
  WorkOrderStage,
} from "./types";
import { PAYOUT_LABELS } from "./types";
import { formatKRW } from "./finance";
import {
  buildPartnerReferralRows,
  summarizePartnerReferralRows,
} from "./partner-referral-utils";
import {
  createDefaultPeriodFilter,
  matchesPeriodDate,
  periodFilterLabel,
  type PeriodFilterValue,
} from "./date-filter-utils";
import {
  enrichWorkOrder,
  sortWorkOrdersTimeline,
  STAGE_PROGRESS_WEIGHT,
  WORK_ORDER_STAGE_LABELS,
  type EnrichedWorkOrder,
} from "./work-order-utils";
import { getTaskChannelLabel } from "./task-channel-utils";
import { partnerHasCategory } from "./partner-utils";
import { getValidPostLinks } from "./execution-utils";

export const ACTIVE_PARTNER_WORK_STAGES: WorkOrderStage[] = [
  "pending_approval",
  "pending_staff_confirm",
  "approved",
  "delivered",
  "paid",
];

export const COMPLETED_PARTNER_WORK_STAGES: WorkOrderStage[] = ["order_ready"];

export type PartnerCollaborationKind =
  | "work_order"
  | "expense"
  | "referral";

export interface PartnerCollaborationItem {
  id: string;
  kind: PartnerCollaborationKind;
  date: string;
  title: string;
  detail?: string;
  clientName: string;
  contractId?: string;
  amount?: number;
  statusLabel: string;
  /** 집행·원가 연결 메모 */
  memo?: string;
  /** 제출·등록 포스팅 URL */
  postLinks?: PostLinkEntry[];
}

export interface PartnerDetailSummary {
  partner: Partner;
  activeWorkOrders: EnrichedWorkOrder[];
  collaborationHistory: PartnerCollaborationItem[];
  expenseCount: number;
  activeWorkCount: number;
  completedWorkCount: number;
  totalPaidAmount: number;
  totalCollaborationAmount: number;
}

export interface PartnerPortalSummary {
  partner: Partner;
  periodLabel: string;
  isReferralPartner: boolean;
  /** 처리 필요 — 기간 무관 */
  pendingApprovalCount: number;
  pendingStaffConfirmCount: number;
  approvedCount: number;
  deliveredCount: number;
  paidStageCount: number;
  activeWorkOrders: EnrichedWorkOrder[];
  /** 선택 기간 */
  periodCompletedCount: number;
  periodPaidAmount: number;
  periodPendingPayoutAmount: number;
  periodCollaborationCount: number;
  periodCollaborationHistory: PartnerCollaborationItem[];
  periodExpenses: ReturnType<typeof enrichExpense>[];
  referralSummary: ReturnType<typeof summarizePartnerReferralRows>;
  allCollaborationHistory: PartnerCollaborationItem[];
}

export function getPartnerById(
  partners: Partner[],
  partnerId: string,
): Partner | undefined {
  return partners.find((p) => p.id === partnerId);
}

export function getPartnerExpenses(
  data: AppData,
  partnerId: string,
): Expense[] {
  return data.expenses
    .filter((e) => e.partnerId === partnerId)
    .sort((a, b) =>
      (b.payoutRequestedAt ?? b.paymentDueDate).localeCompare(
        a.payoutRequestedAt ?? a.paymentDueDate,
      ),
    );
}

export function getPartnerWorkOrders(
  data: AppData,
  partnerId: string,
): WorkOrder[] {
  return sortWorkOrdersTimeline(
    data.workOrders.filter(
      (o) => o.partnerId === partnerId && o.stage !== "draft",
    ),
  );
}

export function getPartnerActiveWorkOrders(
  data: AppData,
  partnerId: string,
): EnrichedWorkOrder[] {
  return getPartnerWorkOrders(data, partnerId)
    .filter((o) => ACTIVE_PARTNER_WORK_STAGES.includes(o.stage))
    .map((o) => enrichWorkOrder(data, o));
}

export function getPartnerCompletedWorkOrders(
  data: AppData,
  partnerId: string,
): EnrichedWorkOrder[] {
  return getPartnerWorkOrders(data, partnerId)
    .filter(
      (o) =>
        COMPLETED_PARTNER_WORK_STAGES.includes(o.stage) ||
        o.stage === "rejected" ||
        o.stage === "cancelled",
    )
    .map((o) => enrichWorkOrder(data, o));
}

function workOrderHistoryDate(order: WorkOrder): string {
  return (
    order.requestedAt ??
    order.deliveredAt ??
    order.approvedAt ??
    order.paidAt ??
    order.createdAt ??
    order.dueDate
  );
}

export function getWorkOrderPortalDate(order: WorkOrder): string {
  return workOrderHistoryDate(order);
}

function expenseHistoryDate(expense: Expense): string {
  return expense.payoutApprovedAt ?? expense.payoutRequestedAt ?? expense.paymentDueDate;
}

function findWorkOrderForExpense(
  data: AppData,
  expense: Expense,
): WorkOrder | undefined {
  const direct = data.workOrders.find((order) => order.expenseId === expense.id);
  if (direct) return direct;

  const candidates = data.workOrders.filter(
    (order) =>
      order.contractId === expense.contractId &&
      order.partnerId === expense.partnerId,
  );
  if (candidates.length === 0) return undefined;

  return [...candidates].sort((a, b) => {
    const score = (order: WorkOrder) => {
      let value = 0;
      if (getValidPostLinks(order.postLinks, order.dueDate).length > 0) {
        value += 10;
      }
      if (order.memo?.trim()) value += 5;
      return value;
    };
    const scoreDiff = score(b) - score(a);
    if (scoreDiff !== 0) return scoreDiff;
    return workOrderHistoryDate(b).localeCompare(workOrderHistoryDate(a));
  })[0];
}

function findExecutionForExpense(
  data: AppData,
  expense: Expense,
): Execution | undefined {
  const channel = data.taskChannels.find(
    (item) => item.expenseCategory === expense.category,
  );
  const candidates = data.executions.filter((execution) => {
    if (execution.contractId !== expense.contractId) return false;
    if (!channel) return true;
    return (
      execution.taskChannelId === channel.id ||
      execution.type === channel.executionType
    );
  });
  if (candidates.length === 0) return undefined;

  return [...candidates].sort((a, b) => {
    const score = (execution: Execution) => {
      let value = 0;
      if (
        getValidPostLinks(execution.postLinks, execution.dueDate).length > 0
      ) {
        value += 10;
      }
      if (execution.memo?.trim()) value += 5;
      return value;
    };
    const scoreDiff = score(b) - score(a);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.enteredAt ?? "").localeCompare(a.enteredAt ?? "");
  })[0];
}

function resolveCollaborationPostLinks(
  data: AppData,
  order?: WorkOrder,
  execution?: Execution,
): PostLinkEntry[] {
  if (order) {
    const fromOrder = getValidPostLinks(order.postLinks, order.dueDate);
    if (fromOrder.length > 0) return fromOrder;

    if (order.executionId) {
      const linkedExecution = data.executions.find(
        (item) => item.id === order.executionId,
      );
      if (linkedExecution) {
        return getValidPostLinks(
          linkedExecution.postLinks,
          linkedExecution.dueDate ?? order.dueDate,
        );
      }
    }
  }

  if (execution) {
    return getValidPostLinks(execution.postLinks, execution.dueDate);
  }

  return [];
}

function resolveCollaborationMemo(
  order?: WorkOrder,
  execution?: Execution,
  fallback?: string,
): string | undefined {
  const memo =
    order?.memo?.trim() ||
    execution?.memo?.trim() ||
    fallback?.trim();
  return memo || undefined;
}

function resolveCollaborationExtras(
  data: AppData,
  expense?: Expense,
  order?: WorkOrder,
): { memo?: string; postLinks: PostLinkEntry[] } {
  const execution = expense ? findExecutionForExpense(data, expense) : undefined;
  const postLinks = resolveCollaborationPostLinks(data, order, execution);
  const memo = resolveCollaborationMemo(order, execution);

  return { memo, postLinks };
}

export function buildPartnerCollaborationHistory(
  data: AppData,
  partnerId: string,
): PartnerCollaborationItem[] {
  const items: PartnerCollaborationItem[] = [];

  for (const order of getPartnerCompletedWorkOrders(data, partnerId)) {
    const extras = resolveCollaborationExtras(data, undefined, order);
    items.push({
      id: `wo-${order.id}`,
      kind: "work_order",
      date: workOrderHistoryDate(order),
      title: `${order.title} · ${getTaskChannelLabel(data.taskChannels, order.taskType)}`,
      detail: order.costSummary || undefined,
      clientName: order.clientName,
      contractId: order.contractId,
      amount: order.totalAmount,
      statusLabel: WORK_ORDER_STAGE_LABELS[order.stage],
      memo: extras.memo,
      postLinks: extras.postLinks,
    });
  }

  for (const expense of getPartnerExpenses(data, partnerId)) {
    const enriched = enrichExpense(data, expense);
    const linkedOrder = findWorkOrderForExpense(data, expense);
    const extras = resolveCollaborationExtras(data, expense, linkedOrder);
    items.push({
      id: `exp-${expense.id}`,
      kind: "expense",
      date: expenseHistoryDate(expense),
      title: enriched.categoryLabel,
      detail: expense.description,
      clientName: enriched.clientName,
      contractId: expense.contractId,
      amount: expense.amount,
      statusLabel: PAYOUT_LABELS[expense.payoutStatus],
      memo: extras.memo,
      postLinks: extras.postLinks,
    });
  }

  for (const row of buildPartnerReferralRows(data, partnerId)) {
    items.push({
      id: `ref-${row.id}`,
      kind: "referral",
      date: row.introducedAt,
      title: "리셀러 프로모션",
      detail:
        row.progressPercent != null
          ? `달성 ${row.progressPercent}%`
          : undefined,
      clientName: row.clientName,
      contractId: row.contractId,
      amount: row.commission,
      statusLabel: row.statusLabel,
      memo: row.memo?.trim() || undefined,
    });
  }

  return items.sort((a, b) => b.date.localeCompare(a.date));
}

export function buildPartnerDetailSummary(
  data: AppData,
  partnerId: string,
): PartnerDetailSummary | null {
  const partner = getPartnerById(data.partners, partnerId);
  if (!partner) return null;

  const activeWorkOrders = getPartnerActiveWorkOrders(data, partnerId);
  const collaborationHistory = buildPartnerCollaborationHistory(data, partnerId);
  const expenses = getPartnerExpenses(data, partnerId);
  const completedWorkCount = getPartnerCompletedWorkOrders(
    data,
    partnerId,
  ).filter((o) => o.stage === "order_ready").length;

  return {
    partner,
    activeWorkOrders,
    collaborationHistory,
    expenseCount: expenses.length,
    activeWorkCount: activeWorkOrders.length,
    completedWorkCount,
    totalPaidAmount: expenses
      .filter((e) => e.payoutStatus === "paid")
      .reduce((sum, e) => sum + e.amount, 0),
    totalCollaborationAmount: collaborationHistory.reduce(
      (sum, item) => sum + (item.amount ?? 0),
      0,
    ),
  };
}

export function getActiveWorkProgress(order: WorkOrder): number {
  return STAGE_PROGRESS_WEIGHT[order.stage] ?? 0;
}

export function formatPartnerCollaborationAmount(amount?: number): string {
  if (amount == null || amount <= 0) return "-";
  return formatKRW(amount);
}

export function filterPartnerCollaborationByPeriod(
  items: PartnerCollaborationItem[],
  filter: PeriodFilterValue,
): PartnerCollaborationItem[] {
  return items.filter((item) => matchesPeriodDate(item.date, filter));
}

export interface PartnerCollaborationPeriodSummary {
  workOrderCount: number;
  workOrderAmount: number;
  expenseCount: number;
  expenseAmount: number;
  referralCount: number;
  referralAmount: number;
  totalCount: number;
  totalAmount: number;
}

export function summarizePartnerCollaborationHistory(
  items: PartnerCollaborationItem[],
): PartnerCollaborationPeriodSummary {
  let workOrderCount = 0;
  let workOrderAmount = 0;
  let expenseCount = 0;
  let expenseAmount = 0;
  let referralCount = 0;
  let referralAmount = 0;

  for (const item of items) {
    const amount = item.amount ?? 0;
    if (item.kind === "work_order") {
      workOrderCount += 1;
      workOrderAmount += amount;
    } else if (item.kind === "expense") {
      expenseCount += 1;
      expenseAmount += amount;
    } else {
      referralCount += 1;
      referralAmount += amount;
    }
  }

  return {
    workOrderCount,
    workOrderAmount,
    expenseCount,
    expenseAmount,
    referralCount,
    referralAmount,
    totalCount: items.length,
    totalAmount: workOrderAmount + expenseAmount + referralAmount,
  };
}

export function getPartnerCollaborationForPeriod(
  data: AppData,
  partnerId: string,
  filter: PeriodFilterValue,
): {
  items: PartnerCollaborationItem[];
  summary: PartnerCollaborationPeriodSummary;
  periodLabel: string;
} {
  const all = buildPartnerCollaborationHistory(data, partnerId);
  const items = filterPartnerCollaborationByPeriod(all, filter);
  return {
    items,
    summary: summarizePartnerCollaborationHistory(items),
    periodLabel: periodFilterLabel(filter),
  };
}

export function buildPartnerPortalSummary(
  data: AppData,
  partnerId: string,
  periodFilter: PeriodFilterValue = createDefaultPeriodFilter(),
): PartnerPortalSummary | null {
  const base = buildPartnerDetailSummary(data, partnerId);
  if (!base) return null;

  const { partner, activeWorkOrders, collaborationHistory } = base;
  const periodCollaborationHistory = filterPartnerCollaborationByPeriod(
    collaborationHistory,
    periodFilter,
  );

  const periodExpenses = getPartnerExpenses(data, partnerId)
    .filter((e) =>
      matchesPeriodDate(expenseHistoryDate(e), periodFilter),
    )
    .map((e) => enrichExpense(data, e));

  const periodCompletedCount = getPartnerCompletedWorkOrders(
    data,
    partnerId,
  ).filter(
    (o) =>
      o.stage === "order_ready" &&
      matchesPeriodDate(getWorkOrderPortalDate(o), periodFilter),
  ).length;

  const referralRows = buildPartnerReferralRows(data, partnerId);
  const referralFiltered = referralRows.filter((row) =>
    matchesPeriodDate(row.introducedAt, periodFilter),
  );

  return {
    partner,
    periodLabel: periodFilterLabel(periodFilter),
    isReferralPartner: partnerHasCategory(partner, "referral"),
    pendingApprovalCount: activeWorkOrders.filter(
      (o) => o.stage === "pending_approval",
    ).length,
    pendingStaffConfirmCount: activeWorkOrders.filter(
      (o) => o.stage === "pending_staff_confirm",
    ).length,
    approvedCount: activeWorkOrders.filter((o) => o.stage === "approved")
      .length,
    deliveredCount: activeWorkOrders.filter((o) => o.stage === "delivered")
      .length,
    paidStageCount: activeWorkOrders.filter((o) => o.stage === "paid").length,
    activeWorkOrders,
    periodCompletedCount,
    periodPaidAmount: periodExpenses
      .filter((e) => e.payoutStatus === "paid")
      .reduce((sum, e) => sum + e.amount, 0),
    periodPendingPayoutAmount: periodExpenses
      .filter((e) => e.payoutStatus !== "paid")
      .reduce((sum, e) => sum + e.amount, 0),
    periodCollaborationCount: periodCollaborationHistory.length,
    periodCollaborationHistory,
    periodExpenses,
    referralSummary: summarizePartnerReferralRows(referralFiltered),
    allCollaborationHistory: collaborationHistory,
  };
}

export { createDefaultPeriodFilter, periodFilterLabel, type PeriodFilterValue };
