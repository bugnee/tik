"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  History,
  Loader2,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { useDashboardPeriod } from "@/context/DashboardPeriodContext";
import { useRole } from "@/context/RoleContext";
import { PartnerCollaborationHistoryPanel } from "@/components/partner/PartnerCollaborationHistoryPanel";
import { PartnerExperienceSlotsPanel } from "@/components/experience/PartnerExperienceSlotsPanel";
import { PartnerWorkApprovalCard } from "@/components/partner/PartnerWorkApprovalCard";
import { PartnerWorkDeliverCard } from "@/components/partner/PartnerWorkDeliverCard";
import { LocationProfilePanel } from "@/components/location/LocationProfilePanel";
import { PartnerWorkCalendar } from "@/components/work-orders/PartnerWorkCalendar";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { TabBar } from "@/components/ui/TabBar";
import { formatKRW } from "@/lib/finance";
import { getPartnerLocation } from "@/lib/location-profile-utils";
import {
  getPartnerExperienceOffers,
} from "@/lib/experience-partner-slot-utils";
import {
  buildPartnerPortalSummary,
  getPartnerActiveWorkOrders,
} from "@/lib/partner-detail-utils";
import {
  getPartnerApprovedWorkOrders,
  getPartnerPendingApprovalOrders,
} from "@/lib/partner-work-queue-utils";
import {
  formatPartnerCategories,
  getPartnerStatusBadgeVariant,
  getPartnerStatusLabel,
} from "@/lib/partner-utils";
import { getPartnerTabActionCounts } from "@/lib/role-action-utils";
import { getUserName } from "@/lib/selectors";

type PartnerTab =
  | "overview"
  | "approvals"
  | "active"
  | "experience"
  | "history";

export function PartnerPortalDashboard({ partnerId }: { partnerId: string }) {
  const data = useData();
  const { updatePartnerLocation } = data;
  const { currentUser } = useRole();
  const dashboardPeriod = useDashboardPeriod();
  const [tab, setTab] = useState<PartnerTab>("overview");

  const summary = useMemo(
    () => buildPartnerPortalSummary(data, partnerId, dashboardPeriod.periodFilter),
    [data, partnerId, dashboardPeriod.periodFilter],
  );

  const partnerForOffers = data.partners.find((item) => item.id === partnerId);
  const experienceOfferCount = useMemo(() => {
    if (!partnerForOffers) return 0;
    return getPartnerExperienceOffers(data, partnerForOffers).length;
  }, [data, partnerForOffers]);

  const pendingOrders = useMemo(
    () => getPartnerPendingApprovalOrders(data, partnerId),
    [data, partnerId],
  );
  const approvedOrders = useMemo(
    () => getPartnerApprovedWorkOrders(data, partnerId),
    [data, partnerId],
  );
  const calendarOrders = useMemo(
    () => getPartnerActiveWorkOrders(data, partnerId),
    [data, partnerId],
  );
  const tabActionCounts = useMemo(
    () => getPartnerTabActionCounts(data, partnerId),
    [data, partnerId],
  );

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
              TRIP IT KOREA · 파트너 대시보드
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
              {partner.companyName}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              실행 요청 승인 · 집행 · 결과 제출 · 지급
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

      <TabBar
        active={tab}
        onChange={setTab}
        items={[
          {
            id: "overview",
            label: "개요",
            shortLabel: "개요",
            icon: ClipboardList,
            accent: "cyan",
          },
          {
            id: "approvals",
            label: "승인 대기",
            shortLabel: "승인",
            icon: CheckCircle2,
            accent: "amber",
            badgeCount: tabActionCounts.approvals,
          },
          {
            id: "active",
            label: "진행 업무",
            shortLabel: "진행",
            icon: Loader2,
            accent: "emerald",
            badgeCount: tabActionCounts.active,
          },
          {
            id: "experience",
            label: `체험단 일정${experienceOfferCount ? ` (${experienceOfferCount})` : ""}`,
            shortLabel: "체험",
            icon: CalendarDays,
            accent: "amber",
          },
          {
            id: "history",
            label: "협업 이력",
            shortLabel: "이력",
            icon: History,
            accent: "violet",
          },
        ]}
      />

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="승인 필요"
              value={`${summary.pendingApprovalCount}건`}
              subValue="실행 요청 검토"
              icon={CheckCircle2}
              accent="amber"
              onValueClick={() => setTab("approvals")}
            />
            <StatCard
              label="담당 확인 중"
              value={`${summary.pendingStaffConfirmCount}건`}
              subValue="파트너 승인 · 담당 반영 대기"
              icon={Loader2}
              accent="rose"
            />
            <StatCard
              label="진행 · 결과 제출"
              value={`${summary.approvedCount + summary.deliveredCount}건`}
              subValue="집행 · 입금 대기 포함"
              icon={ClipboardList}
              accent="cyan"
              onValueClick={() => setTab("active")}
            />
            <StatCard
              label={`${summary.periodLabel} 지급`}
              value={formatKRW(summary.periodPaidAmount)}
              subValue={`대기 ${formatKRW(summary.periodPendingPayoutAmount)}`}
              icon={History}
              accent="emerald"
              onValueClick={() => setTab("history")}
            />
          </div>

          <LocationProfilePanel
            variant="partner"
            value={getPartnerLocation(partner)}
            onSave={(input) => updatePartnerLocation(partnerId, input)}
          />

          <PartnerWorkCalendar orders={calendarOrders} />

          {pendingOrders.length > 0 && (
            <Card glow className="border-amber-500/25">
              <CardHeader
                title="바로 처리할 승인 요청"
                subtitle="승인 시 담당자에게 피드백과 함께 전달됩니다"
              />
              <div className="space-y-3 px-4 pb-4">
                {pendingOrders.slice(0, 3).map((order) => (
                  <PartnerWorkApprovalCard
                    key={order.id}
                    data={data}
                    order={order}
                  />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "approvals" && (
        <div className="space-y-4">
          {pendingOrders.length === 0 ? (
            <Card className="py-12 text-center text-sm text-zinc-500">
              승인 대기 중인 실행 요청이 없습니다.
            </Card>
          ) : (
            pendingOrders.map((order) => (
              <PartnerWorkApprovalCard key={order.id} data={data} order={order} />
            ))
          )}
        </div>
      )}

      {tab === "active" && (
        <div className="space-y-6">
          {summary.pendingStaffConfirmCount > 0 && (
            <Card className="border-violet-500/20">
              <CardHeader
                title="담당 확인 대기"
                subtitle="승인 완료 · 담당자 확인 후 업무가 시작됩니다"
              />
              <div className="space-y-2 px-4 pb-4">
                {summary.activeWorkOrders
                  .filter((o) => o.stage === "pending_staff_confirm")
                  .map((order) => (
                    <div
                      key={order.id}
                      className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-zinc-100">{order.title}</p>
                      <p className="text-xs text-zinc-500">
                        {order.clientName} · {order.staffName}
                      </p>
                      {order.partnerApprovalNote && (
                        <p className="mt-1 text-xs text-violet-200/90">
                          내 피드백: {order.partnerApprovalNote}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {approvedOrders.length === 0 &&
          summary.deliveredCount === 0 &&
          summary.pendingStaffConfirmCount === 0 ? (
            <Card className="py-12 text-center text-sm text-zinc-500">
              진행 중인 업무가 없습니다.
            </Card>
          ) : (
            <>
              {approvedOrders.map((order) => (
                <PartnerWorkDeliverCard key={order.id} data={data} order={order} />
              ))}
              {summary.activeWorkOrders
                .filter((o) => o.stage === "delivered" || o.stage === "paid")
                .map((order) => (
                  <Card key={order.id} className="border-zinc-800 p-4">
                    <p className="font-medium text-zinc-100">{order.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {order.clientName} · 입금 확인 대기
                    </p>
                  </Card>
                ))}
            </>
          )}
        </div>
      )}

      {tab === "experience" && (
        <PartnerExperienceSlotsPanel partnerId={partnerId} />
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
