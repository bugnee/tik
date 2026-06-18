import type { UserRole } from "@/lib/types";

/** 대시보드 공통·역할 전용 위젯 ID */
export type DashboardWidgetId =
  | "period-filter"
  | "pending-actions"
  | "work-status"
  | "monthly-contracts"
  | "work-evaluation"
  | "role-main";

export type DashboardRoleLayout = {
  /** 데모 역할 배너 */
  showRoleBanner: boolean;
  widgets: DashboardWidgetId[];
};

/** 역할별 대시보드 구성 — DashboardByRole 단일 설정 */
export const DASHBOARD_ROLE_LAYOUT: Record<UserRole, DashboardRoleLayout> = {
  staff: {
    showRoleBanner: true,
    widgets: ["period-filter", "pending-actions", "work-status", "work-evaluation", "role-main"],
  },
  team_leader: {
    showRoleBanner: true,
    widgets: ["period-filter", "pending-actions", "work-status", "work-evaluation", "role-main"],
  },
  executive: {
    showRoleBanner: true,
    widgets: ["period-filter", "pending-actions", "work-status", "work-evaluation", "role-main"],
  },
  ceo: {
    showRoleBanner: true,
    widgets: [
      "period-filter",
      "pending-actions",
      "work-status",
      "monthly-contracts",
      "work-evaluation",
      "role-main",
    ],
  },
  finance_manager: {
    showRoleBanner: true,
    widgets: ["period-filter", "pending-actions", "work-status", "role-main"],
  },
  partner: {
    showRoleBanner: false,
    widgets: ["period-filter", "pending-actions", "role-main"],
  },
  client: {
    showRoleBanner: false,
    widgets: ["period-filter", "pending-actions", "role-main"],
  },
};

export function isPortalDashboardRole(role: UserRole): boolean {
  return role === "client" || role === "partner";
}
