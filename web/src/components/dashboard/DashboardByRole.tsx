"use client";

import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { RoleApprovalCountBadge } from "@/components/ui/RoleApprovalCountBadge";
import { DashboardPeriodProvider } from "@/context/DashboardPeriodContext";
import { StaffDashboard } from "./StaffDashboard";
import { TeamLeaderDashboard } from "./TeamLeaderDashboard";
import { ExecutiveDashboard } from "./ExecutiveDashboard";
import { FinanceManagerDashboard } from "./FinanceManagerDashboard";
import { ClientDashboard } from "./ClientDashboard";
import { PartnerDashboard } from "./PartnerDashboard";
import { DashboardWorkStatusPanel } from "@/components/dashboard/DashboardWorkStatusPanel";
import { MonthlyContractStatusPanel } from "@/components/dashboard/MonthlyContractStatusPanel";
import { DashboardPeriodFilter } from "@/components/dashboard/DashboardPeriodFilter";
import { PendingActionsPanel } from "@/components/dashboard/PendingActionsPanel";
import { WorkEvaluationPanel } from "@/components/evaluation/WorkEvaluationPanel";
import {
  DASHBOARD_ROLE_LAYOUT,
  isPortalDashboardRole,
  type DashboardWidgetId,
} from "@/components/dashboard/dashboard-role-layout";
import { ROLE_LABELS } from "@/lib/types";
import { ROLE_BANNER_CLASSES } from "@/lib/role-utils";
import {
  getRoleExecutionApprovalCount,
  ROLE_EXECUTION_APPROVAL_LABELS,
} from "@/lib/role-execution-approval-utils";

const CeoDashboard = dynamic(
  () => import("./CeoDashboard").then((m) => ({ default: m.CeoDashboard })),
  {
    loading: () => (
      <div className="h-32 animate-pulse rounded-xl border border-zinc-800 bg-zinc-950/60" />
    ),
  },
);

const ROLE_MAIN: Record<keyof typeof ROLE_LABELS, ComponentType<object> | null> = {
  staff: StaffDashboard,
  team_leader: TeamLeaderDashboard,
  executive: ExecutiveDashboard,
  ceo: CeoDashboard,
  finance_manager: FinanceManagerDashboard,
  partner: PartnerDashboard,
  client: ClientDashboard,
};

function DashboardWidget({ id }: { id: DashboardWidgetId }) {
  switch (id) {
    case "period-filter":
      return <DashboardPeriodFilter />;
    case "pending-actions":
      return <PendingActionsPanel />;
    case "work-status":
      return <DashboardWorkStatusPanel />;
    case "monthly-contracts":
      return <MonthlyContractStatusPanel />;
    case "work-evaluation":
      return <WorkEvaluationPanel compact />;
    case "role-main":
      return null;
    default:
      return null;
  }
}

export function DashboardByRole() {
  const { activeRole, canViewWorkEvaluations } = useRole();
  const layout = DASHBOARD_ROLE_LAYOUT[activeRole];
  const RoleMain = ROLE_MAIN[activeRole];

  return (
    <DashboardPeriodProvider>
      <div className="space-y-4">
        {layout.showRoleBanner && <RoleBanner role={activeRole} />}
        {layout.widgets.map((widgetId) => {
          if (widgetId === "work-evaluation" && !canViewWorkEvaluations) {
            return null;
          }
          if (widgetId === "role-main") {
            return RoleMain ? <RoleMain key={widgetId} /> : null;
          }
          return <DashboardWidget key={widgetId} id={widgetId} />;
        })}
      </div>
    </DashboardPeriodProvider>
  );
}

function RoleBanner({ role }: { role: keyof typeof ROLE_LABELS }) {
  const data = useData();
  const { currentUser } = useRole();
  const approvalCount = useMemo(
    () => getRoleExecutionApprovalCount(data, currentUser.id, role),
    [data, currentUser.id, role],
  );

  if (isPortalDashboardRole(role)) return null;

  return (
    <div
      className={`flex flex-col gap-1 rounded-xl border px-3 py-2 text-xs sm:flex-row sm:items-center sm:gap-2 sm:px-4 sm:py-2.5 ${ROLE_BANNER_CLASSES[role]}`}
    >
      <span className="inline-flex items-center gap-2 font-semibold uppercase tracking-wider">
        {ROLE_LABELS[role]} 뷰
        <RoleApprovalCountBadge count={approvalCount} />
      </span>
      <span className="hidden opacity-60 sm:inline">·</span>
      <span className="opacity-80 sm:text-[11px]">
        {approvalCount > 0 ? (
          <>
            {ROLE_EXECUTION_APPROVAL_LABELS[role]}{" "}
            <span className="font-semibold text-amber-300">{approvalCount}건</span>
          </>
        ) : (
          <>
            <span className="hidden md:inline">
              상단 드롭다운에서 역할을 전환하여 다른 권한 UI를 확인하세요
            </span>
            <span className="md:hidden">역할 전환은 데모 로그인 시 상단 메뉴에서</span>
          </>
        )}
      </span>
    </div>
  );
}
