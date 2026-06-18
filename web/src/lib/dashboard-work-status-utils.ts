import { DEMO_TODAY } from "@/lib/contract-lifecycle";
import { filterContractsByRole, getTeamName, getUserName } from "@/lib/selectors";
import {
  enrichWorkOrder,
  filterWorkOrdersByPartner,
  type EnrichedWorkOrder,
} from "@/lib/work-order-utils";
import type { AppData, UserRole, WorkOrder, WorkOrderStage } from "./types";

const COMPLETED_STAGES: WorkOrderStage[] = ["order_ready", "paid"];

const IN_PROGRESS_STAGES: WorkOrderStage[] = [
  "pending_approval",
  "approved",
  "delivered",
];

export type WorkStatusCategory =
  | "in_progress"
  | "due_today"
  | "overdue"
  | "completed";

export const WORK_STATUS_CATEGORY_LABELS: Record<WorkStatusCategory, string> = {
  in_progress: "진행중",
  due_today: "오늘 마감",
  overdue: "마감초과",
  completed: "완료",
};

export const ACTIVE_WORK_STATUS_CATEGORIES: WorkStatusCategory[] = [
  "in_progress",
  "due_today",
  "overdue",
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
};

export type WorkStatusTeamLeaderBreakdown = {
  leaderId: string;
  leaderName: string;
  teamId: string;
  teamName: string;
  summary: DashboardWorkStatusSummary;
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

export function getWorkOrderCompletedDate(order: WorkOrder): string {
  return (
    order.paidAt ??
    order.deliveredAt ??
    order.approvedAt ??
    order.requestedAt ??
    order.dueDate
  );
}

export function isActiveWorkOrder(order: WorkOrder): boolean {
  return !isCompletedWorkOrder(order.stage);
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

export function getRoleVisibleWorkOrders(
  data: AppData,
  role: UserRole,
  userId: string,
): WorkOrder[] {
  if (role === "partner") {
    const partnerId = data.users.find((u) => u.id === userId)?.partnerId;
    if (!partnerId) return [];
    return filterWorkOrdersByPartner(data.workOrders, partnerId);
  }

  const contractIds = new Set(
    filterContractsByRole(data, role, userId)
      .filter((c) => c.status === "active")
      .map((c) => c.id),
  );

  return data.workOrders.filter((order) => contractIds.has(order.contractId));
}

export function calcDashboardWorkStatus(
  data: AppData,
  role: UserRole,
  userId: string,
  today = DEMO_TODAY,
): DashboardWorkStatusSummary {
  const orders = getRoleVisibleWorkOrders(data, role, userId);
  return {
    in_progress: orders.filter(isInProgressExecution).length,
    due_today: orders.filter((order) => isDueTodayWorkOrder(order, today))
      .length,
    overdue: orders.filter((order) => isOverdueWorkOrder(order, today)).length,
    completed: orders.filter((order) => isCompletedWorkOrder(order.stage)).length,
  };
}

export function getDashboardWorkStatusItems(
  data: AppData,
  role: UserRole,
  userId: string,
  category: WorkStatusCategory,
  today = DEMO_TODAY,
): DashboardWorkStatusItem[] {
  const orders = getRoleVisibleWorkOrders(data, role, userId);

  return orders
    .filter((order) => {
      if (category === "in_progress") return isInProgressExecution(order);
      if (category === "due_today") return isDueTodayWorkOrder(order, today);
      if (category === "overdue") return isOverdueWorkOrder(order, today);
      return isCompletedWorkOrder(order.stage);
    })
    .map((order) => enrichWorkStatusItem(data, order, category, today))
    .sort((a, b) => {
      if (category === "completed") {
        return b.completedDate.localeCompare(a.completedDate);
      }
      if (category === "overdue") {
        return a.daysFromDue - b.daysFromDue;
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
  return summary.in_progress + summary.due_today + summary.overdue;
}

export function totalWorkStatusCount(summary: DashboardWorkStatusSummary): number {
  return totalActiveWorkStatusCount(summary);
}

export function totalWorkStatusCountWithCompleted(
  summary: DashboardWorkStatusSummary,
): number {
  return totalActiveWorkStatusCount(summary) + summary.completed;
}

export function calcSummaryFromOrders(
  orders: WorkOrder[],
  today = DEMO_TODAY,
): DashboardWorkStatusSummary {
  return {
    in_progress: orders.filter(isInProgressExecution).length,
    due_today: orders.filter((order) => isDueTodayWorkOrder(order, today)).length,
    overdue: orders.filter((order) => isOverdueWorkOrder(order, today)).length,
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
      return "처리 내역 · 담당별 진행중 · 오늘 마감 · 마감초과 · 완료 · 숫자 클릭 시 트리";
    case "executive":
      return "처리 내역 · 팀장 → 담당 트리 · 숫자 클릭 시 상세";
    default:
      return "처리 내역 · 진행중 · 오늘 마감 · 마감초과 · 완료 · 숫자 클릭 시 내역";
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
  today = DEMO_TODAY,
): WorkStatusTeamLeaderBreakdown[] {
  const orders = getRoleVisibleWorkOrders(data, role, userId);
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
        summary: calcSummaryFromOrders(teamOrders, today),
        assignees: getAssigneeWorkStatusBreakdown(data, teamOrders, today),
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
  today = DEMO_TODAY,
): WorkStatusTreeNode[] {
  const items = getDashboardWorkStatusItems(data, role, userId, category, today);
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

  const breakdown = getTeamLeaderWorkStatusBreakdown(data, role, userId, today);
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
      id: team.leaderId,
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
