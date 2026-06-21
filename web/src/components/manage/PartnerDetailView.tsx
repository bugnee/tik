"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  ExternalLink,
  History,
  Link2,
  Loader2,
  Mail,
  Phone,
  Receipt,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { useDashboardPeriod } from "@/context/DashboardPeriodContext";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  EmptyState,
  PageHeader,
} from "@/components/ui/DataTable";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatCard } from "@/components/ui/StatCard";
import { PartnerFilterBadge } from "@/components/ui/PartnerFilterBadge";
import { PartnerCollaborationHistoryPanel } from "@/components/partner/PartnerCollaborationHistoryPanel";
import { PartnerExperienceSlotsPanel } from "@/components/experience/PartnerExperienceSlotsPanel";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import { formatKRW } from "@/lib/finance";
import {
  buildPartnerDetailSummary,
  createDefaultPeriodFilter,
  getActiveWorkProgress,
  type PeriodFilterValue,
} from "@/lib/partner-detail-utils";
import {
  formatPartnerCategories,
  getPartnerStatusBadgeVariant,
  getPartnerStatusLabel,
} from "@/lib/partner-utils";
import { getUserName } from "@/lib/selectors";
import type { AppData } from "@/lib/types";
import { WORK_ORDER_STAGE_LABELS } from "@/lib/work-order-utils";
import type { EnrichedWorkOrder } from "@/lib/work-order-utils";
import { WorkOrderCostBreakdown } from "@/components/work-orders/WorkOrderCostBreakdown";

export function PartnerDetailView({
  partnerId,
  variant = "admin",
}: {
  partnerId: string;
  variant?: "admin" | "portal";
}) {
  const isPortal = variant === "portal";
  const data = useData();
  const dashboardPeriod = useDashboardPeriod();
  const [localPeriodFilter, setLocalPeriodFilter] = useState<PeriodFilterValue>(
    createDefaultPeriodFilter,
  );
  const periodFilter = isPortal ? dashboardPeriod.periodFilter : localPeriodFilter;
  const setPeriodFilter = isPortal
    ? dashboardPeriod.setPeriodFilter
    : setLocalPeriodFilter;
  const summary = useMemo(
    () => buildPartnerDetailSummary(data, partnerId),
    [data, partnerId],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#collaboration") return;
    const el = document.getElementById("collaboration");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [summary]);

  function scrollToCollaboration() {
    document
      .getElementById("collaboration")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!summary) {
    return (
      <>
        <PageHeader title="파트너사" description="등록된 파트너를 찾을 수 없습니다" />
        <EmptyState message="파트너 정보가 없습니다" />
        {!isPortal && (
          <Link
            href="/partners"
            className="mt-4 inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            파트너 목록
          </Link>
        )}
      </>
    );
  }

  const { partner, activeWorkOrders, collaborationHistory } = summary;

  return (
    <div className="space-y-6">
      {isPortal ? (
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
                수주 · 집행 · 지급 · 협업 이력
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {formatPartnerCategories(
                  partner.categories,
                  data.partnerFilterDefinitions,
                )}
                {partner.registeredAt && ` · 등록 ${partner.registeredAt}`}
              </p>
            </div>
            <Badge variant={getPartnerStatusBadgeVariant(partner.status)}>
              {getPartnerStatusLabel(partner.status)}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/partners"
              className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-emerald-400"
            >
              <ArrowLeft className="h-4 w-4" />
              파트너 목록
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
              {partner.companyName}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {formatPartnerCategories(
                partner.categories,
                data.partnerFilterDefinitions,
              )}
              {partner.registeredAt && ` · 등록 ${partner.registeredAt}`}
            </p>
          </div>
          <Badge variant={getPartnerStatusBadgeVariant(partner.status)}>
            {getPartnerStatusLabel(partner.status)}
          </Badge>
        </div>
      )}

      {isPortal && <PartnerExperienceSlotsPanel partnerId={partnerId} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="진행 중 실행"
          value={`${summary.activeWorkCount}건`}
          subValue="승인 · 집행 · 입금 대기"
          icon={Loader2}
          accent="amber"
        />
        <StatCard
          label="원가 연결"
          value={`${summary.expenseCount}건`}
          subValue={`지급 완료 ${formatKRW(summary.totalPaidAmount)}`}
          icon={Receipt}
          accent="cyan"
        />
        <StatCard
          label="완료 업무"
          value={`${summary.completedWorkCount}건`}
          subValue="오더준 · 반영 완료"
          icon={Building2}
          accent="emerald"
        />
        <StatCard
          label="협업 이력"
          value={`${collaborationHistory.length}건`}
          subValue="업무 · 원가 · 리셀러"
          icon={History}
          accent="cyan"
          onValueClick={scrollToCollaboration}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="파트너사 정보" />
          <dl className="space-y-3 text-sm">
            <InfoRow label="분야">
              <div className="flex flex-wrap justify-end gap-1">
                {partner.categories.map((c) => (
                  <PartnerFilterBadge
                    key={c}
                    filters={data.partnerFilterDefinitions}
                    taskChannels={data.taskChannels}
                    categoryId={c}
                    className="text-[10px]"
                  />
                ))}
              </div>
            </InfoRow>
            <InfoRow label="우리쪽 담당">
              {partner.internalManagerUserId
                ? getUserName(data, partner.internalManagerUserId)
                : "-"}
            </InfoRow>
            <InfoRow label="파트너 담당">{partner.contactName ?? "-"}</InfoRow>
            <InfoRow label="연락처">
              <div className="text-right text-xs">
                {partner.phone && (
                  <p className="flex items-center justify-end gap-1">
                    <Phone className="h-3 w-3" />
                    {partner.phone}
                  </p>
                )}
                {partner.email && (
                  <p className="mt-1 flex items-center justify-end gap-1 text-zinc-500">
                    <Mail className="h-3 w-3" />
                    {partner.email}
                  </p>
                )}
                {!partner.phone && !partner.email && "-"}
              </div>
            </InfoRow>
            <InfoRow label="계좌">
              <div className="text-right font-mono text-xs">
                {partner.bankName && (
                  <p className="text-zinc-400">{partner.bankName}</p>
                )}
                <p>{partner.bankAccount}</p>
                <p className="text-zinc-600">{partner.accountHolder}</p>
              </div>
            </InfoRow>
            <InfoRow label="기본 단가">
              {partner.unitPrice ? formatKRW(partner.unitPrice) : "-"}
            </InfoRow>
            {partner.memo && (
              <InfoRow label="메모">
                <span className="max-w-[220px] whitespace-pre-wrap text-right text-xs text-zinc-400">
                  {partner.memo}
                </span>
              </InfoRow>
            )}
          </dl>

          {(partner.linkSlots ?? []).some((s) => s.url || s.nickname) && (
            <div className="mt-6 border-t border-zinc-800 pt-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                채널 링크
              </p>
              <div className="space-y-2">
                {partner.linkSlots.map((slot, idx) => {
                  if (!slot.url && !slot.nickname) return null;
                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 text-xs"
                    >
                      {slot.nickname && (
                        <p className="font-medium text-zinc-300">
                          {slot.nickname}
                        </p>
                      )}
                      {slot.url && (
                        <a
                          href={slot.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 flex items-center gap-1 truncate text-emerald-400 hover:underline"
                        >
                          {slot.url}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-3" glow>
          <CardHeader
            title="진행 중인 실행"
            subtitle={`${activeWorkOrders.length}건 · 집행 업무 · 원가 연결`}
          />
          {activeWorkOrders.length === 0 ? (
            <p className="pb-6 text-center text-sm text-zinc-500">
              현재 진행 중인 실행 업무가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {activeWorkOrders.map((order) => (
                <ActiveWorkCard key={order.id} data={data} order={order} />
              ))}
            </div>
          )}
        </Card>
      </div>

      <PartnerCollaborationHistoryPanel
        data={data}
        partnerId={partnerId}
        periodFilter={periodFilter}
        onPeriodFilterChange={setPeriodFilter}
        showPeriodFilter={!isPortal}
      />
    </div>
  );
}

function ActiveWorkCard({
  data,
  order,
}: {
  data: AppData;
  order: EnrichedWorkOrder;
}) {
  const progress = getActiveWorkProgress(order);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TaskChannelBadge data={data} taskType={order.taskType} />
            <Badge
              variant={
                order.stage === "pending_approval"
                  ? "warning"
                  : order.stage === "rejected"
                    ? "danger"
                    : "info"
              }
            >
              {WORK_ORDER_STAGE_LABELS[order.stage]}
            </Badge>
          </div>
          <p className="mt-2 font-medium text-zinc-100">{order.title}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {order.clientName} · {order.staffName} · 마감 {order.dueDate}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-emerald-400">
            {formatKRW(order.totalAmount)}
          </p>
          <WorkOrderCostBreakdown
            lines={order.costLines}
            className="mt-1 max-w-[240px]"
          />
        </div>
      </div>

      {order.memo && (
        <p className="mt-3 text-xs text-zinc-400">{order.memo}</p>
      )}

      {order.postLinks.length > 0 && (
        <div className="mt-3 space-y-1">
          {order.postLinks.map((link) =>
            link.url ? (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 truncate text-xs text-emerald-400 hover:underline"
              >
                <Link2 className="h-3 w-3 shrink-0" />
                {link.url}
              </a>
            ) : null,
          )}
        </div>
      )}

      <div className="mt-4">
        <ProgressBar
          label="진행 단계"
          value={progress}
          size="sm"
          color="cyan"
        />
      </div>

      {order.contractId && (
        <Link
          href={`/contracts/${order.contractId}`}
          className="mt-3 inline-flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-emerald-400"
        >
          계약 상세 보기
          <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-200">{children}</dd>
    </div>
  );
}
