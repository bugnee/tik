"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Link2,
  MessageCircle,
  Target,
  TrendingUp,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { useDashboardPeriod } from "@/context/DashboardPeriodContext";
import { useRole } from "@/context/RoleContext";
import { useClientPortalActionItems } from "@/hooks/useClientPortalActionItems";
import { useClientPortalBadgeCounts } from "@/hooks/useClientPortalBadgeCounts";
import { dashboardPeriodToContractSelection } from "@/lib/dashboard-period-utils";
import { Badge } from "@/components/ui/Badge";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import { ContractPeriodSelector } from "@/components/contracts/ContractPeriodSelector";
import { ContractWorkCalendar } from "@/components/experience/ContractWorkCalendar";
import { ExperienceCampaignPanel } from "@/components/experience/ExperienceCampaignPanel";
import { PlaceCredentialsPanel } from "@/components/place-qa/PlaceCredentialsPanel";
import { QaConversationPanel } from "@/components/place-qa/QaConversationPanel";
import { PostLinkOpinionButton } from "@/components/executions/PostLinkOpinionButton";
import { ClientPortalHero } from "@/components/client-portal/ClientPortalHero";
import { ClientPortalActionPanel } from "@/components/client-portal/ClientPortalActionPanel";
import { ClientPortalTabBar } from "@/components/client-portal/ClientPortalTabBar";
import { ClientPortalViewHeader } from "@/components/client-portal/ClientPortalViewHeader";
import { ClientRenewalPanel } from "@/components/client-portal/ClientRenewalPanel";
import { ClientDepositRequestPanel } from "@/components/client-portal/ClientDepositRequestPanel";
import { LocationProfilePanel } from "@/components/location/LocationProfilePanel";
import { ClientLinksPanel } from "@/components/contracts/ClientLinksPanel";
import { ClientExperienceHistoryPanel } from "@/components/client-portal/ClientExperienceHistoryPanel";
import { ClientContractFocusPanel } from "@/components/client-portal/ClientContractFocusPanel";
import { ClientContractFocusSection } from "@/components/client-portal/ClientContractFocusSection";
import { ClientPortalFocusBadge } from "@/components/client-portal/ClientPortalFocusBadge";
import { Card, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatCard } from "@/components/ui/StatCard";
import {
  DEMO_TODAY,
  getContractStatusDisplay,
} from "@/lib/contract-lifecycle";
import {
  contractRecordsForPeriod,
  createDefaultContractPeriodSelection,
  filterActivityByContractPeriod,
  filterLinksByContractPeriod,
  filterWorkOrdersByContractPeriod,
  getPeriodProgressRate,
  getPeriodRemainingDays,
  resolveContractPeriod,
  type ContractPeriodSelection,
} from "@/lib/contract-period-utils";
import {
  buildClientPartnershipStats,
  buildClientRenewalInsight,
  buildClientContractFocusItems,
  getClientPortalActionItemsForView,
  CLIENT_CONTRACT_FOCUS_SECTION_IDS,
  CLIENT_PORTAL_VIEW_CARD_BORDER,
  CLIENT_PORTAL_VIEW_ICON_SURFACE,
  parseClientContractFocus,
  parseClientPortalView,
  type ClientContractFocus,
  type ClientPortalView,
} from "@/lib/client-portal-utils";
import { getContractExperienceCampaigns } from "@/lib/experience-campaign-utils";
import { getContractLocation } from "@/lib/location-profile-utils";
import {
  getSyncExecutionChannels,
  findExecutionForWorkOrder,
} from "@/lib/execution-generation-utils";
import {
  getClientContractForUser,
  getClientReportLinks,
  getCompletionRate,
  getContractActivity,
  getContractExecutions,
  getContractRecords,
  getMonthlyProgressRate,
  getTeamName,
  getUserName,
  type ActivityItem,
} from "@/lib/selectors";
import {
  getContractDoneCount,
  getContractTargetChannels,
  getContractTargetCount,
  getExecutionTypeAccent,
  getTaskChannelAccent,
  getWorkOrderTaskLabel,
  shouldShowContractTargetRow,
  taskChannelToExecutionType,
} from "@/lib/task-channel-utils";
import { getTabCardClass, getTabPillClass } from "@/lib/tab-ui-utils";
import { cn } from "@/lib/cn";
import { CLIENT_WORK_STAGE_LABELS } from "@/lib/work-order-utils";
import {
  EXECUTION_STATUS_LABELS,
  TERMINATION_REASON_LABELS,
  type AppData,
  type ExecutionType,
} from "@/lib/types";
import type { ClientReportLink } from "@/lib/selectors";

export function ClientDashboard({
  contractId: contractIdOverride,
  previewMode = false,
}: {
  contractId?: string;
  previewMode?: boolean;
} = {}) {
  const data = useData();
  const { currentUser } = useRole();
  const clientPortalBadges = useClientPortalBadgeCounts(contractIdOverride);
  const clientPortalActionItems = useClientPortalActionItems(contractIdOverride);
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseClientPortalView(searchParams.get("view"));
  const highlightAnchorIds = useMemo(() => {
    if (!clientPortalActionItems) return new Set<string>();
    return new Set(
      getClientPortalActionItemsForView(clientPortalActionItems, view).map(
        (item) => item.anchorId,
      ),
    );
  }, [clientPortalActionItems, view]);
  const contractFocus =
    view === "contract"
      ? parseClientContractFocus(searchParams.get("focus"))
      : null;
  const [toast, setToast] = useState<string | null>(null);

  const contract = useMemo(() => {
    if (contractIdOverride) {
      return data.contracts.find((c) => c.id === contractIdOverride) ?? null;
    }
    return getClientContractForUser(
      data,
      currentUser.id,
      currentUser.contractId,
    );
  }, [data, currentUser.id, contractIdOverride]);

  const executions = useMemo(
    () => (contract ? getContractExecutions(data, contract.id) : []),
    [data, contract],
  );

  const workOrders = useMemo(
    () =>
      contract
        ? data.workOrders.filter(
            (o) =>
              o.contractId === contract.id &&
              o.stage !== "draft" &&
              o.stage !== "rejected",
          )
        : [],
    [data.workOrders, contract],
  );

  const links = useMemo(
    () => (contract ? getClientReportLinks(data, contract.id) : []),
    [data, contract],
  );

  const records = useMemo(
    () => (contract ? getContractRecords(data, contract.id) : []),
    [data, contract],
  );

  const activity = useMemo(
    () =>
      contract
        ? getContractActivity(data, contract.id)
            .filter((a) => a.kind !== "expense")
            .slice(0, 12)
        : [],
    [data, contract],
  );

  const targetChannels = useMemo(
    () => getContractTargetChannels(data.taskChannels),
    [data.taskChannels],
  );

  const completionChannels = useMemo(
    () => targetChannels.filter((c) => c.contractDoneField),
    [targetChannels],
  );

  const contractCampaigns = useMemo(
    () =>
      contract
        ? getContractExperienceCampaigns(
            data.experienceCampaigns ?? [],
            contract.id,
          )
        : [],
    [data.experienceCampaigns, contract],
  );

  const completion = contract ? getCompletionRate(data, contract) : 0;
  const [linkFilter, setLinkFilter] = useState<string>("all");
  const { periodFilter } = useDashboardPeriod();
  const [periodSelection, setPeriodSelection] = useState<ContractPeriodSelection>(
    () => dashboardPeriodToContractSelection(periodFilter),
  );

  useEffect(() => {
    setPeriodSelection(dashboardPeriodToContractSelection(periodFilter));
  }, [periodFilter]);

  useEffect(() => {
    if (contract && !previewMode) {
      setPeriodSelection(dashboardPeriodToContractSelection(periodFilter));
    } else if (contract) {
      setPeriodSelection(createDefaultContractPeriodSelection(contract, records));
    }
  }, [contract, records, periodFilter, previewMode]);

  useEffect(() => {
    if (view !== "contract" || !contractFocus) return;
    const sectionId = CLIENT_CONTRACT_FOCUS_SECTION_IDS[contractFocus];
    const timer = window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [view, contractFocus]);

  const resolvedPeriod = useMemo(() => {
    if (!contract) {
      return { start: DEMO_TODAY, end: DEMO_TODAY, label: DEMO_TODAY };
    }
    return resolveContractPeriod(periodSelection, contract, records);
  }, [contract, periodSelection, records]);

  const periodWorkOrders = useMemo(
    () => filterWorkOrdersByContractPeriod(workOrders, resolvedPeriod),
    [workOrders, resolvedPeriod],
  );

  const periodLinks = useMemo(
    () => filterLinksByContractPeriod(links, resolvedPeriod),
    [links, resolvedPeriod],
  );

  const periodActivity = useMemo(
    () => filterActivityByContractPeriod(activity, resolvedPeriod),
    [activity, resolvedPeriod],
  );

  const periodRecords = useMemo(
    () => contractRecordsForPeriod(records, resolvedPeriod),
    [records, resolvedPeriod],
  );

  const periodProgress = useMemo(
    () =>
      contract
        ? getPeriodProgressRate(
            workOrders,
            data.taskChannels,
            resolvedPeriod,
            getMonthlyProgressRate(data, contract),
          )
        : 0,
    [contract, workOrders, data, resolvedPeriod],
  );

  const periodRemaining = getPeriodRemainingDays(resolvedPeriod);

  const periodProgressItems = useMemo(() => {
    if (!contract) return [];

    return getSyncExecutionChannels(contract, data.taskChannels).map(
      (channel) => {
        const exec = findExecutionForWorkOrder(
          executions,
          contract.id,
          channel.id,
          data.taskChannels,
        );
        const execType = taskChannelToExecutionType(
          data.taskChannels,
          channel.id,
        );
        const target = getContractTargetCount(contract, channel);
        const done = getContractDoneCount(contract, channel);
        const status =
          exec?.status ??
          (target > 0 && done >= target
            ? "completed"
            : done > 0
              ? "in_progress"
              : "pending");

        return {
          id: exec?.id ?? `channel-${channel.id}`,
          type: execType,
          taskChannelId: channel.id,
          status,
          completedCount: done,
          targetCount: target,
          dueDate: exec?.dueDate,
        };
      },
    );
  }, [contract, executions, data.taskChannels]);

  useEffect(() => {
    setLinkFilter("all");
  }, [resolvedPeriod.start, resolvedPeriod.end]);

  const filterOptions = useMemo(() => {
    if (!contract) return [{ id: "all", label: "전체", count: 0 }];
    const opts: {
      id: string;
      label: string;
      count: number;
      taskChannelId?: string;
      executionType?: ExecutionType;
    }[] = [{ id: "all", label: "전체", count: periodLinks.length }];
    for (const item of periodProgressItems) {
      const id = `channel:${item.taskChannelId}`;
      if (opts.some((o) => o.id === id)) continue;
      opts.push({
        id,
        label: getWorkOrderTaskLabel(data, item.taskChannelId),
        count: periodLinks.filter((l) => linkMatchesFilter(l, id, data)).length,
        taskChannelId: item.taskChannelId,
        executionType: item.type,
      });
    }
    return opts;
  }, [contract, periodProgressItems, periodLinks, data]);

  const filteredLinks = useMemo(
    () => periodLinks.filter((l) => linkMatchesFilter(l, linkFilter, data)),
    [periodLinks, linkFilter, data],
  );

  function navigatePortal(next: ClientPortalView, focus?: ClientContractFocus) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    if (focus && next === "contract") {
      params.set("focus", focus);
    } else {
      params.delete("focus");
    }
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }

  function setView(next: ClientPortalView) {
    navigatePortal(next);
  }

  function openContractFocus(focus: ClientContractFocus) {
    navigatePortal("contract", focus);
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  function handleExtensionRequest() {
    if (!contract || previewMode) return;
    const ok = data.requestExtension(contract.id, currentUser.id);
    showToast(
      ok
        ? "재계약 상담 신청이 접수되었습니다. 담당 매니저가 연락드립니다."
        : "이미 재계약 검토 중이거나 연장 계약입니다.",
    );
  }

  if (!contract) {
    return (
      <Card className="py-16 text-center">
        <p className="text-sm text-zinc-400">
          연결된 계약 정보가 없습니다. 관리자에게 계약 연결을 요청해 주세요.
        </p>
      </Card>
    );
  }

  const status = getContractStatusDisplay(contract);
  const publishedCount = periodLinks.length;
  const activeOrders = periodWorkOrders.filter((o) =>
    ["pending_approval", "pending_staff_confirm", "approved", "delivered"].includes(o.stage),
  ).length;
  const completedOrders = workOrders.filter(
    (o) => o.stage === "order_ready" || o.stage === "paid",
  ).length;
  const periodModeLabel =
    periodSelection.mode === "cycle30"
      ? "선택 회차"
      : periodSelection.mode === "month"
        ? "선택 월"
        : "선택 연도";

  const partnershipStats = buildClientPartnershipStats(
    data,
    contract,
    links,
    completedOrders,
  );
  const renewal = buildClientRenewalInsight(data, contract);
  const managerName = getUserName(data, contract.assignedStaffId);
  const focusItems = contractFocus
    ? buildClientContractFocusItems(data, contract, contractFocus)
    : [];

  const heroBadges = (
    <>
      {contract.isExtension && (
        <ClientPortalFocusBadge
          variant="success"
          active={view === "contract" && contractFocus === "extension"}
          onClick={() => openContractFocus("extension")}
        >
          연장 계약
        </ClientPortalFocusBadge>
      )}
      {contract.hasPlaceSetting && (
        <ClientPortalFocusBadge
          variant="info"
          active={view === "contract" && contractFocus === "place"}
          onClick={() => openContractFocus("place")}
        >
          플레이스 세팅
        </ClientPortalFocusBadge>
      )}
      <ClientPortalFocusBadge
        variant={contract.status === "terminated" ? "danger" : "default"}
        active={view === "contract" && contractFocus === "termination"}
        onClick={() => openContractFocus("termination")}
      >
        해지
      </ClientPortalFocusBadge>
    </>
  );

  return (
    <div className="space-y-5 pb-4">
      {previewMode && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
          고객사 포털 미리보기 · {contract.clientName}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 right-4 z-[100] max-w-sm rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 shadow-xl md:bottom-6">
          {toast}
        </div>
      )}

      {view === "performance" && (
        <ClientPortalHero
          clientName={contract.clientName}
          periodLabel={`${resolvedPeriod.label} · ${resolvedPeriod.start} ~ ${resolvedPeriod.end}`}
          completion={completion}
          periodProgress={periodProgress}
          stats={partnershipStats}
          renewal={renewal}
          badges={heroBadges}
        />
      )}

      {view !== "performance" && (
        <ClientPortalViewHeader
          view={view}
          clientName={contract.clientName}
          headline={renewal.headline}
          badges={heroBadges}
        />
      )}

      <ClientDepositRequestPanel
        contract={contract}
        fundBudget={data.fundBudget}
        variant="client"
      />

      <ClientPortalTabBar
        active={view}
        onChange={setView}
        badgeCounts={clientPortalBadges}
      />

      {clientPortalActionItems && (
        <ClientPortalActionPanel
          items={clientPortalActionItems}
          view={view}
          onDismiss={
            previewMode
              ? undefined
              : (actionId) =>
                  data.dismissClientPortalAction(
                    contract.id,
                    currentUser.id,
                    actionId,
                  )
          }
        />
      )}

      {previewMode && (
        <ContractPeriodSelector
          contract={contract}
          records={records}
          value={periodSelection}
          onChange={setPeriodSelection}
          resolved={resolvedPeriod}
        />
      )}

      {view === "performance" && (
        <PerformanceView
          data={data}
          contract={contract}
          completion={completion}
          completionChannels={completionChannels}
          periodModeLabel={periodModeLabel}
          periodProgress={periodProgress}
          publishedCount={publishedCount}
          activeOrders={activeOrders}
          periodRemaining={periodRemaining}
          resolvedPeriod={resolvedPeriod}
          periodProgressItems={periodProgressItems}
          linkFilter={linkFilter}
          setLinkFilter={setLinkFilter}
          filterOptions={filterOptions}
          periodLinks={periodLinks}
          filteredLinks={filteredLinks}
          targetChannels={targetChannels}
          highlightAnchorIds={highlightAnchorIds}
        />
      )}

      {view === "collaborate" && (
        <div className="space-y-6">
          <Card glow className={CLIENT_PORTAL_VIEW_CARD_BORDER.collaborate}>
            <CardHeader
              title="담당 매니저와 소통"
              subtitle="문의 · 링크 피드백 · 일정 조율을 한곳에서"
            />
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full",
                  CLIENT_PORTAL_VIEW_ICON_SURFACE.collaborate,
                )}
              >
                <MessageCircle className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-100">{managerName}</p>
                <p className="text-sm text-zinc-500">
                  {getTeamName(data, contract.teamId)} · 평균 응답 영업일 1일
                </p>
              </div>
            </div>
          </Card>
          <QaConversationPanel
            contractId={contract.id}
            highlightAnchorIds={highlightAnchorIds}
          />
        </div>
      )}

      {view === "schedule" && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <ContractWorkCalendar
              data={data}
              contractId={contract.id}
              experienceCampaigns={contractCampaigns}
            />
            <ExperienceCampaignPanel
              contractId={contract.id}
              mode="client"
              readOnly={previewMode}
            />
          </div>
          <WorkOrdersCard
            data={data}
            periodWorkOrders={periodWorkOrders}
            periodModeLabel={periodModeLabel}
            className={CLIENT_PORTAL_VIEW_CARD_BORDER.schedule}
            highlightAnchorIds={highlightAnchorIds}
          />
        </div>
      )}

      {view === "experience" && (
        <ClientExperienceHistoryPanel
          contractId={contract.id}
          readOnly={previewMode}
          highlightAnchorIds={highlightAnchorIds}
        />
      )}

      {view === "contract" && (
        <div className="space-y-6">
          {!previewMode && (
            <LocationProfilePanel
              variant="client"
              value={getContractLocation(contract)}
              onSave={(input) => data.updateContractLocation(contract.id, input)}
            />
          )}
          {!previewMode && (
            <ClientLinksPanel
              contract={contract}
              onSave={(input) => data.updateContractClientLinks(contract.id, input)}
            />
          )}
          {contractFocus && (
            <ClientContractFocusPanel focus={contractFocus} items={focusItems} />
          )}
          <ClientContractFocusSection
            id={CLIENT_CONTRACT_FOCUS_SECTION_IDS.extension}
            focused={contractFocus === "extension"}
            focus="extension"
          >
            <ClientRenewalPanel
              contract={contract}
              renewal={renewal}
              managerName={managerName}
              onRequestExtension={handleExtensionRequest}
              onGoToQa={() => setView("collaborate")}
              previewMode={previewMode}
            />
          </ClientContractFocusSection>
          <div className="grid gap-6 lg:grid-cols-2">
            <ClientContractFocusSection
              id={CLIENT_CONTRACT_FOCUS_SECTION_IDS.termination}
              focused={contractFocus === "termination"}
              focus="termination"
            >
              <ContractInfoCard
                contract={contract}
                data={data}
                resolvedPeriod={resolvedPeriod}
                status={status}
                targetChannels={targetChannels}
              />
            </ClientContractFocusSection>
            <ClientContractFocusSection
              id={CLIENT_CONTRACT_FOCUS_SECTION_IDS.place}
              focused={contractFocus === "place"}
              focus="place"
            >
              <PlaceCredentialsPanel contractId={contract.id} />
            </ClientContractFocusSection>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ActivityCard
              periodActivity={periodActivity}
              periodModeLabel={periodModeLabel}
              focus={contractFocus}
            />
            <RecordsCard
              periodRecords={periodRecords}
              periodModeLabel={periodModeLabel}
              focus={contractFocus}
            />
          </div>
        </div>
      )}

      <p className="text-center text-xs text-zinc-600">
        TRIP IT KOREA · {managerName} · {getTeamName(data, contract.teamId)}
      </p>
    </div>
  );
}

function PerformanceView({
  data,
  contract,
  completion,
  completionChannels,
  periodModeLabel,
  periodProgress,
  publishedCount,
  activeOrders,
  periodRemaining,
  resolvedPeriod,
  periodProgressItems,
  linkFilter,
  setLinkFilter,
  filterOptions,
  periodLinks,
  filteredLinks,
  targetChannels,
  highlightAnchorIds,
}: {
  data: AppData;
  contract: NonNullable<ReturnType<typeof getClientContractForUser>>;
  completion: number;
  completionChannels: ReturnType<typeof getContractTargetChannels>;
  periodModeLabel: string;
  periodProgress: number;
  publishedCount: number;
  activeOrders: number;
  periodRemaining: number;
  resolvedPeriod: { start: string; end: string; label: string };
  periodProgressItems: Array<{
    id: string;
    type: ExecutionType;
    taskChannelId: string;
    status: string;
    completedCount: number;
    targetCount: number;
    dueDate?: string;
  }>;
  linkFilter: string;
  setLinkFilter: (v: string) => void;
  filterOptions: Array<{
    id: string;
    label: string;
    count: number;
    taskChannelId?: string;
    executionType?: ExecutionType;
  }>;
  periodLinks: ClientReportLink[];
  filteredLinks: ClientReportLink[];
  targetChannels: ReturnType<typeof getContractTargetChannels>;
  highlightAnchorIds: Set<string>;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="전체 달성률"
          value={`${completion.toFixed(0)}%`}
          subValue={completionChannels.map((c) => c.label).join(" · ") || "집행 목표"}
          icon={TrendingUp}
          accent="emerald"
        />
        <StatCard
          label={`${periodModeLabel} 진행율`}
          value={`${periodProgress}%`}
          subValue={`${resolvedPeriod.start} ~ ${resolvedPeriod.end}`}
          icon={Target}
          accent="cyan"
        />
        <StatCard
          label="게시 성과물"
          value={`${publishedCount}건`}
          subValue={`${periodModeLabel} 집계`}
          icon={Link2}
          accent="amber"
        />
        <StatCard
          label="진행 업무"
          value={`${activeOrders}건`}
          subValue={
            periodRemaining >= 0
              ? `기간 D-${periodRemaining}`
              : `종료 ${resolvedPeriod.end}`
          }
          icon={CheckCircle2}
          accent="emerald"
        />
      </div>

      <Card glow>
        <CardHeader
          title="채널별 성과"
          subtitle="클릭하면 아래 성과물만 필터됩니다"
        />
        <div className="mb-4">
          <ProgressBar
            label={`${periodModeLabel} 종합 진행율`}
            value={periodProgress}
            color="emerald"
          />
        </div>
        {periodProgressItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            집행 목표가 설정된 채널이 없습니다.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {periodProgressItems.map((exec) => {
              const pct =
                exec.targetCount > 0
                  ? (exec.completedCount / exec.targetCount) * 100
                  : 0;
              const filterId = `channel:${exec.taskChannelId}`;
              const isSelected = linkFilter === filterId;
              const accent = getTaskChannelAccent(
                data.taskChannels,
                exec.taskChannelId,
              );
              return (
                <button
                  key={exec.taskChannelId}
                  type="button"
                  onClick={() => setLinkFilter(isSelected ? "all" : filterId)}
                  className={getTabCardClass(accent, isSelected, "p-4 text-left")}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <TaskChannelBadge
                      data={data}
                      taskType={exec.taskChannelId}
                      executionType={exec.type}
                    />
                    <Badge
                      variant={
                        exec.status === "completed"
                          ? "success"
                          : exec.status === "delayed"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {EXECUTION_STATUS_LABELS[exec.status as keyof typeof EXECUTION_STATUS_LABELS]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-100">
                    {exec.completedCount}
                    <span className="text-sm font-normal text-zinc-500">
                      {" "}
                      / {exec.targetCount}
                    </span>
                  </p>
                  <div className="mt-2">
                    <ProgressBar value={pct} size="sm" showValue />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card glow id="client-link-report">
        <CardHeader
          title="게시 · 성과물"
          subtitle={
            linkFilter === "all"
              ? `${periodModeLabel} ${periodLinks.length}건`
              : `${filteredLinks.length}건 · 필터 적용`
          }
        />
        {periodLinks.length > 0 && filterOptions.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {filterOptions.map((opt) => {
              const accent = opt.taskChannelId
                ? getTaskChannelAccent(data.taskChannels, opt.taskChannelId)
                : opt.executionType
                  ? getExecutionTypeAccent(data.taskChannels, opt.executionType)
                  : "sky";
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLinkFilter(opt.id)}
                  className={getTabPillClass(accent, linkFilter === opt.id)}
                >
                  {opt.taskChannelId || opt.executionType ? (
                    <TaskChannelBadge
                      data={data}
                      taskType={opt.taskChannelId}
                      executionType={opt.executionType}
                      className="px-2 py-0 text-[10px]"
                    />
                  ) : (
                    <span>{opt.label}</span>
                  )}
                  <span className="font-mono text-[10px] opacity-80">
                    {opt.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {periodLinks.length === 0 ? (
          <p className="pb-6 text-center text-sm text-zinc-500">
            선택한 기간에 등록된 성과물이 없습니다.
          </p>
        ) : filteredLinks.length === 0 ? (
          <p className="pb-6 text-center text-sm text-zinc-500">
            선택한 유형에 해당하는 성과물이 없습니다.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredLinks.map((link) => {
              const linkAnchorId =
                link.source === "집행 업무"
                  ? `client-action-link-${link.id}`
                  : undefined;
              const isActionHighlight =
                linkAnchorId != null && highlightAnchorIds.has(linkAnchorId);

              return (
              <div
                key={link.id}
                id={linkAnchorId}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border bg-zinc-950/40 p-4",
                  isActionHighlight
                    ? "border-amber-500/50 ring-2 ring-amber-500/40"
                    : "border-zinc-800",
                )}
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <TaskChannelBadge
                      data={data}
                      taskType={link.taskType}
                      executionType={link.executionType}
                      label={link.channel}
                    />
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-1 truncate text-sm text-emerald-400 hover:underline"
                    >
                      {link.url}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                    {(link.keyword || link.searchRank != null) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {link.keyword && (
                          <span className="text-xs text-zinc-400">
                            키워드 · {link.keyword}
                          </span>
                        )}
                        {link.searchRank != null && (
                          <Badge variant="info">{link.searchRank}위</Badge>
                        )}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-zinc-600">
                      {link.completedDate && `발행 ${link.completedDate}`}
                    </p>
                  </div>
                </div>
                <PostLinkOpinionButton contractId={contract.id} link={link} />
              </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="월 집행 목표" subtitle="계약 기준 달성 현황" />
        <div className="space-y-3">
          {targetChannels
            .filter((channel) => shouldShowContractTargetRow(contract, channel))
            .map((channel) => {
              const done = getContractDoneCount(contract, channel);
              const target = getContractTargetCount(contract, channel);
              const pct = target > 0 ? (done / target) * 100 : 0;
              return (
                <div key={channel.id}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-zinc-400">{channel.label}</span>
                    <span className="font-mono text-zinc-300">
                      {done} / {target}
                    </span>
                  </div>
                  <ProgressBar value={pct} size="sm" showValue />
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
}

function WorkOrdersCard({
  data,
  periodWorkOrders,
  periodModeLabel,
  className,
  highlightAnchorIds,
}: {
  data: AppData;
  periodWorkOrders: ReturnType<typeof filterWorkOrdersByContractPeriod>;
  periodModeLabel: string;
  className?: string;
  highlightAnchorIds: Set<string>;
}) {
  return (
    <Card glow className={className}>
      <CardHeader
        title="집행 업무"
        subtitle={`${periodModeLabel} · 진행 단계`}
      />
      {periodWorkOrders.length === 0 ? (
        <p className="pb-6 text-center text-sm text-zinc-500">
          선택한 기간에 집행 업무가 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          {periodWorkOrders.map((order) => {
            const anchorId = `client-action-schedule-${order.id}`;
            const isActionHighlight = highlightAnchorIds.has(anchorId);

            return (
            <div
              key={order.id}
              id={anchorId}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-zinc-950/30 px-4 py-3",
                isActionHighlight
                  ? "border-amber-500/50 ring-2 ring-amber-500/40"
                  : "border-zinc-800",
              )}
            >
              <div className="flex items-center gap-2">
                <TaskChannelBadge data={data} taskType={order.taskType} />
                <span className="text-xs text-zinc-500">{order.sequence}회차</span>
              </div>
              <Badge variant="default">
                {CLIENT_WORK_STAGE_LABELS[order.stage]}
              </Badge>
              <span className="text-xs text-zinc-500">마감 {order.dueDate}</span>
            </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ContractInfoCard({
  contract,
  data,
  resolvedPeriod,
  status,
  targetChannels,
}: {
  contract: NonNullable<ReturnType<typeof getClientContractForUser>>;
  data: AppData;
  resolvedPeriod: { start: string; end: string };
  status: ReturnType<typeof getContractStatusDisplay>;
  targetChannels: ReturnType<typeof getContractTargetChannels>;
}) {
  return (
    <Card>
      <CardHeader title="계약 정보" subtitle="서비스 범위 · 담당" />
      <dl className="space-y-3 text-sm">
        <InfoRow label="조회 기간">
          <span className="text-cyan-400">
            {resolvedPeriod.start} ~ {resolvedPeriod.end}
          </span>
        </InfoRow>
        <InfoRow label="전체 계약">
          {contract.contractStartDate} ~ {contract.contractEndDate}
        </InfoRow>
        <InfoRow label="계약 현황">
          {status.isInProgress ? (
            <span className="text-emerald-400">진행중</span>
          ) : (
            status.label
          )}
        </InfoRow>
        {contract.status === "terminated" && (
          <>
            <InfoRow label="해지일">
              {contract.terminatedAt ?? contract.contractEndDate}
            </InfoRow>
            {contract.terminationReason && (
              <InfoRow label="해지 사유">
                {TERMINATION_REASON_LABELS[contract.terminationReason]}
              </InfoRow>
            )}
          </>
        )}
        <InfoRow label="재계약 회차">{contract.renewalMonthCount}월차</InfoRow>
        <InfoRow label="담당 팀">{getTeamName(data, contract.teamId)}</InfoRow>
        <InfoRow label="담당 매니저">
          {getUserName(data, contract.assignedStaffId)}
        </InfoRow>
      </dl>
      <div className="mt-4 border-t border-zinc-800 pt-4">
        <p className="mb-2 text-xs font-medium text-zinc-500">집행 채널</p>
        <div className="flex flex-wrap gap-1.5">
          {targetChannels
            .filter((c) => shouldShowContractTargetRow(contract, c))
            .map((c) => (
              <TaskChannelBadge key={c.id} data={data} taskType={c.id} />
            ))}
        </div>
      </div>
    </Card>
  );
}

function ActivityCard({
  periodActivity,
  periodModeLabel,
  focus,
}: {
  periodActivity: ActivityItem[];
  periodModeLabel: string;
  focus?: ClientContractFocus | null;
}) {
  const visibleActivity = useMemo(() => {
    if (!focus) return periodActivity;
    if (focus === "extension") {
      return periodActivity.filter((item) => item.kind === "extension");
    }
    if (focus === "place") {
      return periodActivity.filter((item) => /플레이스|place/i.test(item.title));
    }
    return periodActivity;
  }, [focus, periodActivity]);

  return (
    <Card>
      <CardHeader title="최근 활동" subtitle={periodModeLabel} />
      {visibleActivity.length === 0 ? (
        <p className="pb-6 text-center text-sm text-zinc-500">활동 없음</p>
      ) : (
        <ul className="space-y-3">
          {visibleActivity.map((item) => (
            <li
              key={item.id}
              className="flex gap-3 border-b border-zinc-800/50 pb-3 last:border-0"
            >
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
              <div>
                <p className="text-sm font-medium text-zinc-200">{item.title}</p>
                <p className="text-xs text-zinc-500">
                  {item.date} · {item.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RecordsCard({
  periodRecords,
  periodModeLabel,
  focus,
}: {
  periodRecords: ReturnType<typeof contractRecordsForPeriod>;
  periodModeLabel: string;
  focus?: ClientContractFocus | null;
}) {
  const visibleRecords = focus
    ? periodRecords.filter((record) => {
        if (focus === "extension") return record.isExtension;
        if (focus === "termination") return Boolean(record.terminationReason);
        return true;
      })
    : periodRecords;

  return (
    <Card>
      <CardHeader title="계약 이력" subtitle={periodModeLabel} />
      {visibleRecords.length === 0 ? (
        <p className="pb-6 text-center text-sm text-zinc-500">이력 없음</p>
      ) : (
        <ul className="space-y-3">
          {visibleRecords.map((record) => (
            <li
              key={record.id}
              className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-zinc-200">{record.period} 회차</p>
                {record.isExtension && <Badge variant="success">연장</Badge>}
                {record.terminationReason && (
                  <Badge variant="danger">해지</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {record.startedAt}
                {record.endedAt ? ` ~ ${record.endedAt}` : " ~ 진행중"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
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
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-200">{children}</dd>
    </div>
  );
}

function linkMatchesFilter(
  link: ClientReportLink,
  filter: string,
  data: AppData,
): boolean {
  if (filter === "all") return true;
  if (filter.startsWith("channel:")) {
    const channelId = filter.slice(8);
    if (link.taskType) return link.taskType === channelId;
    const channelExecType = taskChannelToExecutionType(
      data.taskChannels,
      channelId,
    );
    if (link.executionType !== channelExecType) return false;
    // 실행 진행 링크(taskType 없음): 동일 executionType 채널이 1개일 때만 매칭
    const sameTypeChannels = data.taskChannels.filter(
      (c) =>
        c.isActive &&
        taskChannelToExecutionType(data.taskChannels, c.id) === channelExecType,
    );
    return (
      sameTypeChannels.length === 1 && sameTypeChannels[0].id === channelId
    );
  }
  if (filter.startsWith("exec:")) {
    const execType = filter.slice(5) as ExecutionType;
    if (link.executionType === execType) return true;
    if (
      link.taskType &&
      taskChannelToExecutionType(data.taskChannels, link.taskType) === execType
    ) {
      return true;
    }
  }
  return false;
}
