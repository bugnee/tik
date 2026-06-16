"use client";

import { useRole } from "@/context/RoleContext";
import { StaffDashboard } from "./StaffDashboard";
import { TeamLeaderDashboard } from "./TeamLeaderDashboard";
import { ExecutiveDashboard } from "./ExecutiveDashboard";
import { CeoDashboard } from "./CeoDashboard";
import { FinanceManagerDashboard } from "./FinanceManagerDashboard";
import { ClientDashboard } from "./ClientDashboard";
import { PartnerWorkDashboard } from "@/components/work-orders/PartnerWorkDashboard";
import { ClientPipelineBanner } from "@/components/contracts/ClientPipelineWidget";
import { ROLE_LABELS } from "@/lib/types";
import { ROLE_BANNER_CLASSES } from "@/lib/role-utils";

export function DashboardByRole() {
  const { activeRole } = useRole();

  return (
    <div className="space-y-4">
      {activeRole !== "client" && <RoleBanner role={activeRole} />}
      {activeRole !== "client" && <ClientPipelineBanner />}
      {activeRole === "staff" && <StaffDashboard />}
      {activeRole === "team_leader" && <TeamLeaderDashboard />}
      {activeRole === "executive" && <ExecutiveDashboard />}
      {activeRole === "ceo" && <CeoDashboard />}
      {activeRole === "finance_manager" && <FinanceManagerDashboard />}
      {activeRole === "partner" && <PartnerWorkDashboard />}
      {activeRole === "client" && <ClientDashboard />}
    </div>
  );
}

function RoleBanner({ role }: { role: keyof typeof ROLE_LABELS }) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-xl border px-3 py-2 text-xs sm:flex-row sm:items-center sm:gap-2 sm:px-4 sm:py-2.5 ${ROLE_BANNER_CLASSES[role]}`}
    >
      <span className="font-semibold uppercase tracking-wider">
        {ROLE_LABELS[role]} 뷰
      </span>
      <span className="hidden opacity-60 sm:inline">·</span>
      <span className="opacity-80 sm:text-[11px]">
        <span className="hidden md:inline">
          상단 드롭다운에서 역할을 전환하여 다른 권한 UI를 확인하세요
        </span>
        <span className="md:hidden">역할 전환은 데모 로그인 시 상단 메뉴에서</span>
      </span>
    </div>
  );
}
