import { DEMO_TODAY } from "@/lib/contract-lifecycle";
import {
  filterWorkOrdersInPeriod,
  type DashboardPeriodScope,
} from "@/lib/dashboard-period-utils";
import { filterContractsByRole, getMonthlyProgressRate, getTeamName, getUserName } from "@/lib/selectors";
import {
  enrichWorkOrder,
  filterWorkOrdersByPartner,
  type EnrichedWorkOrder,
} from "@/lib/work-order-utils";
import type { AppData, UserRole, WorkOrder, WorkOrderStage } from "./types";

const COMPLETED_STAGES: WorkOrderStage[] = ["order_ready", "paid"];

const IN_PROGRESS_STAGES: WorkOrderStage[] = [
  "pending_approval",
  "pending_staff_confirm",
  "approved",
  "delivered",
];

const PAUSED_STAGES: WorkOrderStage[] = ["cancelled", "on_hold", "postponed"];

export type WorkStatusCategory =
  | "in_progress"
  | "due_today"
  | "overdue"
  | "cancelled"
  | "on_hold"
  | "postponed"
  | "completed";

export const WORK_STATUS_CATEGORY_LABELS: Record<WorkStatusCategory, string> = {
  in_progress: "진행중",
  due_today: "오늘 마감",
  overdue: "마감초과",
  cancelled: "취소",
  on_hold: "보류",
  postponed: "연기",
  completed: "완료",
};

/** 업무현황 집계·내역 테이블용 (완료 제외) */
export const WORK_STATUS_BREAKDOWN_CATEGORIES: WorkStatusCategory[] = [
  "in_progress",
  "due_today",
  "overdue",
  "cancelled",
  "on_hold",
  "postponed",
];

export type WorkStatusCategoryMeta = {
  accent: string;
  barClassName: string;
  description: string;
  shortLabel: string;
};

export const WORK_STATUS_CATEGORY_META: Record<
  WorkStatusCategory,
  WorkStatusCategoryMeta
> = {
  in_progress: {
    accent: "text-cyan-400",
    barClassName: "bg-cyan-500",
    description: "파트너 승인 · 결과 입력 · 입금 대기 등 실행 중",
    shortLabel: "진행",
  },
  due_today: {
    accent: "text-amber-400",
    barClassName: "bg-amber-500",
    description: "오늘 마감 · 미완료 업무",
    shortLabel: "오늘",
  },
  overdue: {
    accent: "text-rose-400",
    barClassName: "bg-rose-500",
    description: "마감일 경과 · 미완료 업무",
    shortLabel: "초과",
  },
  cancelled: {
    accent: "text-zinc-400",
    barClassName: "bg-zinc-500",
    description: "업무 취소 · 더 이상 진행하지 않음",
    shortLabel: "취소",
  },
  on_hold: {
    accent: "text-violet-400",
    barClassName: "bg-violet-500",
    description: "일시 보류 · 재개 시 이전 단계로 복원",
    shortLabel: "보류",
  },
  postponed: {
    accent: "text-orange-400",
    barClassName: "bg-orange-500",
    description: "일정 연기 · 변경된 마감일 기준 재개",
    shortLabel: "연기",
  },
  completed: {
    accent: "text-emerald-400",
    barClassName: "bg-emerald-500",
    description: "오더준비 · 입금완료 등 처리 완료 실행 업무",
    shortLabel: "완료",
  },
};

export const ACTIVE_WORK_STATUS_CATEGORIES: WorkStatusCategory[] = [
  "in_progress",
  "due_today",
  "overdue",
  "cancelled",
  "on_hold",
  "postponed",
];

export const STAFF_TEAM_WORK_STATUS_CATEGORIES: WorkStatusCategory[] = [
  ...ACTIVE_WORK_STATUS_CATEGORIES,
  "completed",
];

export type DashboardWorkStatusSummary = Record<WorkStatusCategory, number>;

export type DashboardWorkStatusItem = EnrichedWorkOrder & {
  category: WorkStatusCategory;
  daysFromDue: number;
  completedDate: string;
  assigneeId: string;
  assigneeName: string;
  teamId: string;
  teamName: string;
  teamLeaderId: string;
  teamLeaderName: string;
};

export type WorkStatusAssigneeBreakdown = {
  assigneeId: string;
  assigneeName: string;
  roleLabel: string;
  summary: DashboardWorkStatusSummary;
  executionProgressPercent: number;
};

export type WorkStatusTeamLeaderBreakdown = {
  leaderId: string;
  leaderName: string;
  teamId: string;
  teamName: string;
  summary: DashboardWorkStatusSummary;
  executionProgressPercent: number;
  assignees: WorkStatusAssigneeBreakdown[];
};

export type WorkStatusTreeGroupNode = {
  type: "group";
  id: string;
  label: string;
  sublabel?: string;
  count: number;
  children: WorkStatusTreeNode[];
};

export type WorkStatusTreeItemNode = {
  type: "item";
  id: string;
  item: DashboardWorkStatusItem;
};

export type WorkStatusTreeNode = WorkStatusTreeGroupNode | WorkStatusTreeItemNode;

export type WorkStatusPanelMode = "staff" | "team_leader" | "executive";

export function getWorkStatusCategoriesForMode(
  mode: WorkStatusPanelMode,
): WorkStatusCategory[] {
  return mode === "staff" || mode === "team_leader"
    ? STAFF_TEAM_WORK_STATUS_CATEGORIES
    : ACTIVE_WORK_STATUS_CATEGORIES;
}

export function isCompletedWorkOrder(stage: WorkOrderStage): boolean {
  return COMPLETED_STAGES.includes(stage);
}

export function isCancelledWorkOrder(order: WorkOrder): boolean {
  return order.stage === "cancelled";
}

export function isOnHoldWorkOrder(order: WorkOrder): boolean {
  return order.stage === "on_hold";
}

export function isPostponedWorkOrder(order: WorkOrder): boolean {
  return order.stage === "postponed";
}

export function isPausedWorkOrderStage(stage: WorkOrderStage): boolean {
  return PAUSED_STAGES.includes(stage);
}

export function isActiveWorkOrder(order: WorkOrder): boolean {
  if (isCompletedWorkOrder(order.stage)) return false;
  if (order.stage === "draft" || order.stage === "rejected") return false;
  if (isPausedWorkOrderStage(order.stage)) return false;
  return true;
}

export function getWorkOrderCompletedDate(order: WorkOrder): string {
  return (
    order.paidAt ??
    order.deliveredAt ??
    order.approvedAt ??
    order.requestedAt ??
    order.dueDate
  );
}

export function isInProgressExecution(order: WorkOrder): boolean {
  return IN_PROGRESS_STAGES.includes(order.stage);
}

export function isDueTodayWorkOrder(
  order: WorkOrder,
  today = DEMO_TODAY,
): boolean {
  return isActiveWorkOrder(order) && order.dueDate === today;
}

export function isOverdueWorkOrder(
  order: WorkOrder,
  today = DEMO_TODAY,
): boolean {
  return isActiveWorkOrder(order) && order.dueDate < today;
}

export type DashboardPeriodScopeInput = Pick<
  DashboardPeriodScope,
  "contractIds" | "periodFilter" | "referenceDate"
>;

function resolveToday(
  periodScope?: DashboardPeriodScopeInput,
  today = DEMO_TODAY,
): string {
  return periodScope?.referenceDate ?? today;
}

/** periodScope.contractIds가 Set이 아닐 때(직렬화 등)도 안전하게 조회 */
function scopeContractIds(
  periodScope?: DashboardPeriodScopeInput,
): Set<string> | undefined {
  const ids = periodScope?.contractIds;
  if (!ids) return undefined;
  if (ids instanceof Set) return ids;
  return new Set(ids as Iterable<string>);
}

export function getRoleVisibleWorkOrders(
  data: AppData,
  role: UserRole,
  userId: string,
  periodScope?: DashboardPeriodScopeInput,
): WorkOrder[] {
  if (role === "partner") {
    const partnerId = data.users.find((u) => u.id === userId)?.partnerId;
    if (!partnerId) return [];
    let orders = filterWorkOrdersByPartner(data.workOrders, partnerId);
    if (periodScope?.periodFilter) {
      orders = filterWorkOrdersInPeriod(orders, periodScope.periodFilter);
    }
    return orders;
  }

  const periodContractIds = scopeContractIds(periodScope);

  const contractIds = new Set(
    filterContractsByRole(data, role, userId)
      .filter((c) => {
        if (periodContractIds && !periodContractIds.has(c.id)) {
          return false;
        }
        if (!periodScope && c.status !== "active") return false;
        return true;
      })
      .map((c) => c.id),
  );

  let orders = data.workOrders.filter((order) => contractIds.has(order.contractId));
  if (periodScope) {
    orders = filterWorkOrdersInPeriod(orders, periodScope.periodFilter);
  }
  return orders;
}

export function calcDashboardWorkStatus(
  data: AppData,
  role: UserRole,
  userId: string,
  periodScope?: DashboardPeriodScopeInput,
  today = DEMO_TODAY,
): DashboardWorkStatusSummary {
  const referenceDate = resolveToday(periodScope, today);
  const orders = getRoleVisibleWorkOrders(data, role, userId, periodScope);
  return calcSummaryFromOrders(orders, referenceDate);
}

export function getDashboardWorkStatusItems(
  data: AppData,
  role: UserRole,
  userId: string,
  category: WorkStatusCategory,
  periodScope?: DashboardPeriodScopeInput,
  today = DEMO_TODAY,
): DashboardWorkStatusItem[] {
  const referenceDate = resolveToday(periodScope, today);
  const orders = getRoleVisibleWorkOrders(data, role, userId, periodScope);

  return orders
    .filter((order) => {
      if (category === "in_progress") return isInProgressExecution(order);
      if (category === "due_today")
        return isDueTodayWorkOrder(order, referenceDate);
      if (category === "overdue") return isOverdueWorkOrder(order, referenceDate);
      if (category === "cancelled") return isCancelledWorkOrder(order);
      if (category === "on_hold") return isOnHoldWorkOrder(order);
      if (category === "postponed") return isPostponedWorkOrder(order);
      return isCompletedWorkOrder(order.stage);
    })
    .map((order) => enrichWorkStatusItem(data, order, category, referenceDate))
    .sort((a, b) => {
      if (category === "completed") {
        return b.completedDate.localeCompare(a.completedDate);
      }
      if (category === "overdue") {
        return a.daysFromDue - b.daysFromDue;
      }
      if (
        category === "cancelled" ||
        category === "on_hold" ||
        category === "postponed"
      ) {
        const dueCmp = a.dueDate.localeCompare(b.dueDate);
        if (dueCmp !== 0) return dueCmp;
        return a.title.localeCompare(b.title, "ko");
      }
      const dueCmp = a.dueDate.localeCompare(b.dueDate);
      if (dueCmp !== 0) return dueCmp;
      return a.title.localeCompare(b.title, "ko");
    });
}

function daysFromDue(dueDate: string, today: string): number {
  const due = new Date(`${dueDate}T12:00:00`);
  const ref = new Date(`${today}T12:00:00`);
  return Math.round((ref.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export function totalActiveWorkStatusCount(
  summary: DashboardWorkStatusSummary,
): number {
  return (
    summary.in_progress +
    summary.due_today +
    summary.overdue +
    summary.cancelled +
    summary.on_hold +
    summary.postponed
  );
}

export function totalWorkStatusCount(summary: DashboardWorkStatusSummary): number {
  return totalActiveWorkStatusCount(summary);
}

export function totalWorkStatusCountWithCompleted(
  summary: DashboardWorkStatusSummary,
): number {
  return totalActiveWorkStatusCount(summary) + summary.completed;
}

/** 행·열 내 건수 비중(0–100) */
export function calcWorkStatusSharePercent(
  count: number,
  total: number,
): number {
  if (total <= 0 || count <= 0) return 0;
  return Math.round((count / total) * 100);
}

/** 처리 완료 비율 — 완료 / (진행+오늘+초과+완료) */
export function calcWorkStatusCompletionPercent(
  summary: DashboardWorkStatusSummary,
): number {
  const total = totalWorkStatusCountWithCompleted(summary);
  return calcWorkStatusSharePercent(summary.completed, total);
}

export function calcAssigneeExecutionProgressPercent(
  data: AppData,
  assigneeId: string,
): number {
  const contracts = data.contracts.filter(
    (contract) =>
      contract.assignedStaffId === assigneeId && contract.status === "active",
  );
  if (contracts.length === 0) return 0;
  const avg =
    contracts.reduce(
      (sum, contract) => sum + getMonthlyProgressRate(data, contract),
      0,
    ) / contracts.length;
  return Math.round(avg);
}

export function calcOrdersExecutionProgressPercent(
  data: AppData,
  orders: WorkOrder[],
): number {
  const contractIds = new Set(orders.map((order) => order.contractId));
  const contracts = data.contracts.filter(
    (contract) => contractIds.has(contract.id) && contract.status === "active",
  );
  if (contracts.length === 0) return 0;
  const avg =
    contracts.reduce(
      (sum, contract) => sum + getMonthlyProgressRate(data, contract),
      0,
    ) / contracts.length;
  return Math.round(avg);
}

export const WORK_STATUS_CATEGORY_BAR_COLORS: Record<WorkStatusCategory, string> =
  Object.fromEntries(
    Object.entries(WORK_STATUS_CATEGORY_META).map(([key, meta]) => [
      key,
      meta.barClassName,
    ]),
  ) as Record<WorkStatusCategory, string>;

export function calcSummaryFromOrders(
  orders: WorkOrder[],
  today = DEMO_TODAY,
): DashboardWorkStatusSummary {
  return {
    in_progress: orders.filter(isInProgressExecution).length,
    due_today: orders.filter((order) => isDueTodayWorkOrder(order, today)).length,
    overdue: orders.filter((order) => isOverdueWorkOrder(order, today)).length,
    cancelled: orders.filter(isCancelledWorkOrder).length,
    on_hold: orders.filter(isOnHoldWorkOrder).length,
    postponed: orders.filter(isPostponedWorkOrder).length,
    completed: orders.filter((order) => isCompletedWorkOrder(order.stage)).length,
  };
}

function resolveAssigneeMeta(
  data: AppData,
  contractId: string,
): {
  assigneeId: string;
  assigneeName: string;
  teamId: string;
  teamName: string;
  teamLeaderId: string;
  teamLeaderName: string;
} {
  const contract = data.contracts.find((item) => item.id === contractId);
  const assigneeId = contract?.assignedStaffId ?? "unknown";
  const assignee = data.users.find((user) => user.id === assigneeId);
  const teamId = contract?.teamId ?? "";
  const team = data.teams.find((item) => item.id === teamId);
  const teamLeaderId =
    team?.leaderId ??
    data.users.find(
      (user) => user.teamId === teamId && user.role === "team_leader",
    )?.id ??
    "unknown";

  return {
    assigneeId,
    assigneeName: assignee?.name ?? getUserName(data, assigneeId),
    teamId,
    teamName: teamId ? getTeamName(data, teamId) : "-",
    teamLeaderId,
    teamLeaderName: getUserName(data, teamLeaderId),
  };
}

function enrichWorkStatusItem(
  data: AppData,
  order: WorkOrder,
  category: WorkStatusCategory,
  today: string,
): DashboardWorkStatusItem {
  const assignee = resolveAssigneeMeta(data, order.contractId);
  return {
    ...enrichWorkOrder(data, order),
    category,
    daysFromDue: daysFromDue(order.dueDate, today),
    completedDate: getWorkOrderCompletedDate(order),
    ...assignee,
  };
}

export function getWorkStatusPanelMode(
  role: UserRole,
): WorkStatusPanelMode {
  if (role === "team_leader") return "team_leader";
  if (role === "executive" || role === "ceo" || role === "finance_manager") {
    return "executive";
  }
  return "staff";
}

export function getWorkStatusPanelTitle(mode: WorkStatusPanelMode): string {
  switch (mode) {
    case "team_leader":
      return "업무현황 · 담당별 집계";
    case "executive":
      return "업무현황 · 팀장별 집계";
    default:
      return "업무현황 집계";
  }
}

export function getWorkStatusPanelSubtitle(mode: WorkStatusPanelMode): string {
  switch (mode) {
    case "team_leader":
      return "처리 내역 · 진행중 · 오늘 마감 · 마감초과 · 취소 · 보류 · 연기 · 완료 · 비중% · 실행 진행% · 숫자 클릭 시 트리";
    case "executive":
      return "처리 내역 · 팀장 → 담당 트리 · 취소·보류·연기 포함 · 비중% · 실행 진행% · 숫자 클릭 시 상세";
    default:
      return "처리 내역 · 진행중 · 오늘 마감 · 마감초과 · 취소 · 보류 · 연기 · 완료 · 비중% · 실행 진행% · 숫자 클릭 시 내역";
  }
}

function getVisibleTeamsForRole(
  data: AppData,
  role: UserRole,
  userId: string,
) {
  if (role === "ceo" || role === "finance_manager") {
    return data.teams;
  }
  if (role === "executive") {
    return data.teams.filter((team) => team.executiveId === userId);
  }
  if (role === "team_leader") {
    const teamId = data.users.find((user) => user.id === userId)?.teamId;
    return teamId ? data.teams.filter((team) => team.id === teamId) : [];
  }
  return [];
}

export function getAssigneeWorkStatusBreakdown(
  data: AppData,
  orders: WorkOrder[],
  today = DEMO_TODAY,
): WorkStatusAssigneeBreakdown[] {
  const groups = new Map<string, WorkOrder[]>();

  for (const order of orders) {
    const assigneeId =
      data.contracts.find((contract) => contract.id === order.contractId)
        ?.assignedStaffId ?? "unknown";
    const list = groups.get(assigneeId) ?? [];
    list.push(order);
    groups.set(assigneeId, list);
  }

  return Array.from(groups.entries())
    .map(([assigneeId, list]) => {
      const user = data.users.find((item) => item.id === assigneeId);
      return {
        assigneeId,
        assigneeName: user?.name ?? "미배정",
        roleLabel:
          user?.role === "team_leader"
            ? "팀장"
            : user?.role === "staff"
              ? "담당"
              : "담당",
        summary: calcSummaryFromOrders(list, today),
        executionProgressPercent: calcAssigneeExecutionProgressPercent(
          data,
          assigneeId,
        ),
      };
    })
    .sort((a, b) => {
      const totalDiff =
        totalWorkStatusCount(b.summary) - totalWorkStatusCount(a.summary);
      if (totalDiff !== 0) return totalDiff;
      return a.assigneeName.localeCompare(b.assigneeName, "ko");
    });
}

export function getTeamLeaderWorkStatusBreakdown(
  data: AppData,
  role: UserRole,
  userId: string,
  periodScope?: DashboardPeriodScopeInput,
  today = DEMO_TODAY,
): WorkStatusTeamLeaderBreakdown[] {
  const referenceDate = resolveToday(periodScope, today);
  const orders = getRoleVisibleWorkOrders(data, role, userId, periodScope);
  const teams = getVisibleTeamsForRole(data, role, userId);

  return teams
    .map((team) => {
      const teamOrders = orders.filter((order) => {
        const contract = data.contracts.find(
          (item) => item.id === order.contractId,
        );
        return contract?.teamId === team.id;
      });
      const leaderId =
        team.leaderId ??
        data.users.find(
          (user) => user.teamId === team.id && user.role === "team_leader",
        )?.id ??
        team.id;

      return {
        leaderId,
        leaderName: getUserName(data, leaderId),
        teamId: team.id,
        teamName: team.name,
        summary: calcSummaryFromOrders(teamOrders, referenceDate),
        executionProgressPercent: calcOrdersExecutionProgressPercent(
          data,
          teamOrders,
        ),
        assignees: getAssigneeWorkStatusBreakdown(
          data,
          teamOrders,
          referenceDate,
        ),
      };
    })
    .filter((row) => totalWorkStatusCountWithCompleted(row.summary) > 0)
    .sort((a, b) => {
      const totalDiff =
        totalWorkStatusCount(b.summary) - totalWorkStatusCount(a.summary);
      if (totalDiff !== 0) return totalDiff;
      return a.teamName.localeCompare(b.teamName, "ko");
    });
}

export function buildWorkStatusTree(
  data: AppData,
  role: UserRole,
  userId: string,
  category: WorkStatusCategory,
  periodScope?: DashboardPeriodScopeInput,
  today = DEMO_TODAY,
): WorkStatusTreeNode[] {
  const items = getDashboardWorkStatusItems(
    data,
    role,
    userId,
    category,
    periodScope,
    today,
  );
  const mode = getWorkStatusPanelMode(role);

  if (mode === "staff" || items.length === 0) {
    return items.map((item) => ({
      type: "item",
      id: item.id,
      item,
    }));
  }

  if (mode === "team_leader") {
    const groups = new Map<string, DashboardWorkStatusItem[]>();
    for (const item of items) {
      const list = groups.get(item.assigneeId) ?? [];
      list.push(item);
      groups.set(item.assigneeId, list);
    }

    return Array.from(groups.entries())
      .map(([assigneeId, list]) => ({
        type: "group" as const,
        id: assigneeId,
        label: list[0]?.assigneeName ?? getUserName(data, assigneeId),
        sublabel: "담당",
        count: list.length,
        children: list.map((item) => ({
          type: "item" as const,
          id: item.id,
          item,
        })),
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
  }

  const breakdown = getTeamLeaderWorkStatusBreakdown(
    data,
    role,
    userId,
    periodScope,
    today,
  );
  const nodes: WorkStatusTreeGroupNode[] = [];

  for (const team of breakdown) {
    const teamItems = items.filter((item) => item.teamId === team.teamId);
    if (teamItems.length === 0) continue;

    const assigneeGroups = new Map<string, DashboardWorkStatusItem[]>();
    for (const item of teamItems) {
      const list = assigneeGroups.get(item.assigneeId) ?? [];
      list.push(item);
      assigneeGroups.set(item.assigneeId, list);
    }

    const children: WorkStatusTreeNode[] = Array.from(assigneeGroups.entries())
      .map(([assigneeId, list]) => ({
        type: "group" as const,
        id: `${team.teamId}-${assigneeId}`,
        label: list[0]?.assigneeName ?? getUserName(data, assigneeId),
        sublabel: list[0]?.assigneeId === team.leaderId ? "팀장" : "담당",
        count: list.length,
        children: list.map((item) => ({
          type: "item" as const,
          id: item.id,
          item,
        })),
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));

    nodes.push({
      type: "group",
      id: team.teamId,
      label: team.leaderName,
      sublabel: team.teamName,
      count: teamItems.length,
      children,
    });
  }

  return nodes.sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"),
  );
}

export function getWorkStatusContractHref(
  role: UserRole,
  contractId: string,
): string {
  if (role === "client") {
    return `/contracts/${contractId}/client-portal`;
  }
  return `/contracts/${contractId}`;
}

export function getWorkStatusModalTitle(
  category: WorkStatusCategory,
  count: number,
  mode: WorkStatusPanelMode = "staff",
): string {
  const prefix =
    mode === "executive"
      ? "팀장별 처리 내역"
      : mode === "team_leader"
        ? "담당별 처리 내역"
        : "처리 내역";
  return `${prefix} · ${WORK_STATUS_CATEGORY_LABELS[category]} (${count}건)`;
}
