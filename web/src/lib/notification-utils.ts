import type { AppData, UserRole } from "./types";
import {
  getRoleActionItems,
  getTotalRoleActionCount,
  type RoleActionItem,
} from "./role-action-utils";

/** @deprecated WorkQueueAlert 호환 — getRoleActionItems 사용 권장 */
export type WorkQueueAlertKind = "staff_confirm" | "partner_approval";

export interface WorkQueueAlert {
  kind: WorkQueueAlertKind;
  count: number;
  label: string;
  href: string;
}

export type { RoleActionItem };

/** 역할·권한 범위 내 실행 승인 대기 알림 집계 */
export function getWorkQueueAlerts(
  data: AppData,
  userId: string,
  role: UserRole,
): WorkQueueAlert[] {
  return getRoleActionItems(data, userId, role).map((item) => ({
    kind: role === "partner" ? "partner_approval" : "staff_confirm",
    count: item.count,
    label: item.label,
    href: item.href,
  }));
}

export function getTotalWorkQueueAlertCount(alerts: WorkQueueAlert[]): number {
  return getTotalRoleActionCount(
    alerts.map((alert) => ({
      id: alert.href,
      label: alert.label,
      count: alert.count,
      href: alert.href,
    })),
  );
}

export { getNavBadgeCountForHref } from "./role-action-utils";
