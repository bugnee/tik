"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  History,
  MessageCircle,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { useDashboardPeriod } from "@/context/DashboardPeriodContext";
import { useRole } from "@/context/RoleContext";
import { PartnerCollaborationPanel } from "@/components/partner/PartnerCollaborationPanel";
import { PartnerCollaborationHistoryPanel } from "@/components/partner/PartnerCollaborationHistoryPanel";
import { PartnerWorkReadOnlyCard } from "@/components/partner/PartnerWorkReadOnlyCard";
import { LocationProfilePanel } from "@/components/location/LocationProfilePanel";
import { PartnerWorkCalendar } from "@/components/work-orders/PartnerWorkCalendar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { TabBar } from "@/components/ui/TabBar";
import { formatKRW } from "@/lib/finance";
import { getPartnerLocation } from "@/lib/location-profile-utils";
import {
  buildPartnerPortalSummary,
  getPartnerActiveWorkOrders,
} from "@/lib/partner-detail-utils";
import { getPartnerCollaborationContracts } from "@/lib/partner-collaboration-utils";
import { PARTNER_SELF_SERVICE_WORKFLOW_ENABLED } from "@/lib/partner-workflow-config";
import {
  formatPartnerCategories,
  getPartnerStatusBadgeVariant,
  getPartnerStatusLabel,
} from "@/lib/partner-utils";
import { getPartnerTabActionCounts } from "@/lib/role-action-utils";
import { getUserName } from "@/lib/selectors";
import { enrichWorkOrder } from "@/lib/work-order-utils";

type PartnerTab = "overview" | "collaborate" | "work" | "history";

export function PartnerPortalDashboard({ partnerId }: { partnerId: string }) {
  const data = useData();
  const { updatePartnerLocation } = data;
  const { currentUser } = useRole();
  const dashboardPeriod = useDashboardPeriod();
  const [tab, setTab] = useState<PartnerTab>("overview");

  const summary = useMemo(
    () =>
      buildPartnerPortalSummary(data, partnerId, dashboardPeriod.periodFilter),
    [data, partnerId, dashboardPeriod.periodFilter],
  );

  const collaborationContracts = useMemo(
    () => getPartnerCollaborationContracts(data, partnerId),
    [data, partnerId],
  );

  const calendarOrders = useMemo(
    () => getPartnerActiveWorkOrders(data, partnerId),
    [data, partnerId],
  );

  const visibleWorkOrders = useMemo(() => {
    const orders = data.workOrders
      .filter((o) => o.partnerId === partnerId)
      .map((o) => enrichWorkOrder(data, o))
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    return orders;
  }, [data, partnerId]);

  const tabActionCounts = useMemo(
    () => getPartnerTabActionCounts(data, partnerId, currentUser.id),
    [data, partnerId, currentUser.id],
  );

  const isReferralPartner = summary?.isReferralPartner ?? false;

  useEffect(() => {
    if (isReferralPartner && tab === "collaborate") {
      setTab("overview");
    }
  }, [isReferralPartner, tab]);

  const tabItems = useMemo(() => {
    const items = [
      {
        id: "overview" as const,
        label: "개요",
        shortLabel: "개요",
        icon: ClipboardList,
        accent: "cyan" as const,
      },
      {
        id: "collaborate" as const,
        label: "소통",
        shortLabel: "소통",
        icon: MessageCircle,
        accent: "violet" as const,
        badgeCount: tabActionCounts.collaborate,
      },
      {
        id: "work" as const,
        label: "배정 업무",
        shortLabel: "업무",
        icon: ClipboardList,
        accent: "emerald" as const,
        badgeCount: tabActionCounts.work,
      },
      {
        id: "history" as const,
        label: "협업 이력",
        shortLabel: "이력",
        icon: History,
        accent: "sky" as const,
      },
    ];
    return isReferralPartner
      ? items.filter((item) => item.id !== "collaborate")
      : items;
  }, [isReferralPartner, tabActionCounts.collaborate, tabActionCounts.work]);

  if (!summary) {
    return (
      <Card className="py-16 text-center text-sm text-zinc-500">
        파트너 정보를 찾을 수 없습니다.
      </Card>
    );
  }

  const { partner } = summary;

  return (
    <div className="space-y-6 pb-6">
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-zinc-900/40 to-zinc-950 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/80">
              트립잇코리아 · 파트너 포털
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
              {partner.companyName}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              {isReferralPartner
                ? "리셀러 수수료 · 배정 업무 조회 · 지급 이력 확인"
                : PARTNER_SELF_SERVICE_WORKFLOW_ENABLED
                  ? "실행 요청 승인 · 집행 · 결과 제출 · 지급"
                  : "배정 업무 조회 · 담당자와 Q&A 소통 (승인·결과입력은 담당 처리)"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {formatPartnerCategories(
                partner.categories,
                data.partnerFilterDefinitions,
              )}
              {partner.internalManagerUserId &&
                ` · 담당 ${getUserName(data, partner.internalManagerUserId)}`}
            </p>
          </div>
          <Badge variant={getPartnerStatusBadgeVariant(partner.status)}>
            {getPartnerStatusLabel(partner.status)}
          </Badge>
        </div>
      </div>

      <TabBar active={tab} onChange={setTab} items={tabItems} />

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {isReferralPartner ? (
              <StatCard
                label="리셀러 고객"
                value={`${summary.referralSummary.count}곳`}
                subValue={`계약 ${summary.referralSummary.contracted} · 예정 수수료 ${formatKRW(summary.referralSummary.totalCommission)}`}
                icon={MessageCircle}
                accent="cyan"
              />
            ) : (
              <StatCard
                label="협업 업체"
                value={`${collaborationContracts.length}곳`}
                subValue="소통·배정 업무"
                icon={MessageCircle}
                accent="rose"
                onValueClick={() => setTab("collaborate")}
              />
            )}
            <StatCard
              label="배정 업무"
              value={`${visibleWorkOrders.length}건`}
              subValue="조회 전용"
              icon={ClipboardList}
              accent="cyan"
              onValueClick={() => setTab("work")}
            />
            <StatCard
              label="진행 중"
              value={`${summary.approvedCount + summary.deliveredCount}건`}
              subValue="담당·파트너 처리 중"
              icon={ClipboardList}
              accent="emerald"
            />
            <StatCard
              label={`${summary.periodLabel} 지급`}
              value={formatKRW(summary.periodPaidAmount)}
              subValue={`대기 ${formatKRW(summary.periodPendingPayoutAmount)}`}
              icon={History}
              accent="amber"
              onValueClick={() => setTab("history")}
            />
          </div>

          <LocationProfilePanel
            variant="partner"
            value={getPartnerLocation(partner)}
            onSave={(input) => updatePartnerLocation(partnerId, input)}
          />

          <PartnerWorkCalendar orders={calendarOrders} />
        </div>
      )}

      {!isReferralPartner && tab === "collaborate" && (
        <PartnerCollaborationPanel partnerId={partnerId} />
      )}

      {tab === "work" && (
        <div className="space-y-4">
          {visibleWorkOrders.length === 0 ? (
            <Card className="py-12 text-center text-sm text-zinc-500">
              배정된 업무가 없습니다. 담당자가 업무를 배정하면 여기에서 확인할
              수 있습니다.
            </Card>
          ) : (
            visibleWorkOrders.map((order) => (
              <PartnerWorkReadOnlyCard
                key={order.id}
                data={data}
                order={order}
              />
            ))
          )}
        </div>
      )}

      {tab === "history" && (
        <PartnerCollaborationHistoryPanel
          data={data}
          partnerId={partnerId}
          periodFilter={dashboardPeriod.periodFilter}
          onPeriodFilterChange={dashboardPeriod.setPeriodFilter}
          showPeriodFilter
        />
      )}
    </div>
  );
}
