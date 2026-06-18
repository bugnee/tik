"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, CalendarClock, CheckCircle2, ClipboardList, Clock, Pause } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useDashboardPeriodScope } from "@/context/DashboardPeriodContext";
import { useRole } from "@/context/RoleContext";
import { WorkStatusTreeView } from "@/components/dashboard/WorkStatusTreeView";
import { Card, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import {
  buildWorkStatusTree,
  calcDashboardWorkStatus,
  calcOrdersExecutionProgressPercent,
  calcWorkStatusCompletionPercent,
  calcWorkStatusSharePercent,
  getAssigneeWorkStatusBreakdown,
  getDashboardWorkStatusItems,
  getRoleVisibleWorkOrders,
  getTeamLeaderWorkStatusBreakdown,
  getWorkStatusCategoriesForMode,
  getWorkStatusPanelMode,
  getWorkStatusPanelSubtitle,
  getWorkStatusPanelTitle,
  getWorkStatusModalTitle,
  totalActiveWorkStatusCount,
  totalWorkStatusCount,
  totalWorkStatusCountWithCompleted,
  WORK_STATUS_BREAKDOWN_CATEGORIES,
  WORK_STATUS_CATEGORY_LABELS,
  WORK_STATUS_CATEGORY_META,
  type WorkStatusCategory,
  type WorkStatusPanelMode,
} from "@/lib/dashboard-work-status-utils";
import {
  WorkStatusExecutionProgress,
  WorkStatusHeaderMetric,
  WorkStatusMetricCell,
  WorkStatusShareBar,
} from "@/components/dashboard/WorkStatusMetricCell";
import { cn } from "@/lib/cn";

export function DashboardWorkStatusPanel({
  className,
}: {
  className?: string;
}) {
  const data = useData();
  const { currentUser, activeRole } = useRole();
  const periodScope = useDashboardPeriodScope();
  const [openCategory, setOpenCategory] = useState<WorkStatusCategory | null>(
    null,
  );
  const [executiveBreakdownReady, setExecutiveBreakdownReady] = useState(false);

  const mode = getWorkStatusPanelMode(activeRole);

  useEffect(() => {
    if (mode !== "executive") {
      setExecutiveBreakdownReady(false);
      return;
    }
    setExecutiveBreakdownReady(false);
    const idleId =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(() => setExecutiveBreakdownReady(true), {
            timeout: 1200,
          })
        : window.setTimeout(() => setExecutiveBreakdownReady(true), 80);
    return () => {
      if (typeof window.requestIdleCallback === "function") {
        window.cancelIdleCallback(idleId as number);
      } else {
        window.clearTimeout(idleId as number);
      }
    };
  }, [mode, periodScope.periodFilter, periodScope.referenceDate]);
  const rowMeta = useMemo(() => {
    const meta = { ...WORK_STATUS_CATEGORY_META };
    meta.due_today = {
      ...meta.due_today,
      description: `마감일 ${periodScope.referenceDate} · 미완료 업무`,
    };
    return meta;
  }, [periodScope.referenceDate]);

  const summary = useMemo(
    () => calcDashboardWorkStatus(data, activeRole, currentUser.id, periodScope),
    [data, activeRole, currentUser.id, periodScope],
  );

  const orders = useMemo(
    () => getRoleVisibleWorkOrders(data, activeRole, currentUser.id, periodScope),
    [data, activeRole, currentUser.id, periodScope],
  );

  const assigneeBreakdown = useMemo(() => {
    if (mode !== "team_leader") return [];
    return getAssigneeWorkStatusBreakdown(data, orders, periodScope.referenceDate).filter(
      (row) => totalWorkStatusCountWithCompleted(row.summary) > 0,
    );
  }, [data, orders, mode, periodScope.referenceDate]);

  const teamLeaderBreakdown = useMemo(() => {
    if (mode !== "executive" || !executiveBreakdownReady) return [];
    return getTeamLeaderWorkStatusBreakdown(
      data,
      activeRole,
      currentUser.id,
      periodScope,
    );
  }, [
    data,
    activeRole,
    currentUser.id,
    mode,
    periodScope,
    executiveBreakdownReady,
  ]);

  const treeNodes = useMemo(() => {
    if (!openCategory) return [];
    return buildWorkStatusTree(
      data,
      activeRole,
      currentUser.id,
      openCategory,
      periodScope,
    );
  }, [data, activeRole, currentUser.id, openCategory, periodScope]);

  const flatCount = openCategory
    ? getDashboardWorkStatusItems(
        data,
        activeRole,
        currentUser.id,
        openCategory,
        periodScope,
      ).length
    : 0;

  const totalActive = totalActiveWorkStatusCount(summary);
  const categories = getWorkStatusCategoriesForMode(mode);
  const includeCompleted = mode === "staff" || mode === "team_leader";
  const summaryTotal = includeCompleted
    ? totalWorkStatusCountWithCompleted(summary)
    : totalActive;
  const executionProgress = useMemo(
    () => calcOrdersExecutionProgressPercent(data, orders),
    [data, orders],
  );
  const completionPercent = calcWorkStatusCompletionPercent(summary);

  return (
    <>
      <Card glow className={className}>
        <CardHeader
          title={getWorkStatusPanelTitle(mode)}
          subtitle={`${periodScope.periodLabel} · ${getWorkStatusPanelSubtitle(mode)}`}
        />

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2.5">
            <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
              실행 진행율
            </p>
            <WorkStatusExecutionProgress percent={executionProgress} />
          </div>
          {(mode === "staff" || mode === "team_leader") && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2.5">
              <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
                처리 완료율
              </p>
              <WorkStatusExecutionProgress percent={completionPercent} />
            </div>
          )}
        </div>

        <SummaryTable
          summary={summary}
          totalActive={totalActive}
          summaryTotal={summaryTotal}
          categories={categories}
          rowMeta={rowMeta}
          showCompletedSummary={mode === "staff" || mode === "team_leader"}
          onCategoryClick={setOpenCategory}
        />

        {mode === "team_leader" && assigneeBreakdown.length > 0 && (
          <BreakdownSection title="담당별 처리 내역">
            <AssigneeBreakdownTable
              rows={assigneeBreakdown}
              showCompleted
              onCategoryClick={setOpenCategory}
            />
          </BreakdownSection>
        )}

        {mode === "executive" && !executiveBreakdownReady && (
          <p className="mt-4 text-center text-xs text-zinc-600">
            팀장별 집계 불러오는 중…
          </p>
        )}

        {mode === "executive" && teamLeaderBreakdown.length > 0 && (
          <BreakdownSection title="팀장별 담당 업무현황">
            <TeamLeaderBreakdownTable
              rows={teamLeaderBreakdown}
              onCategoryClick={setOpenCategory}
            />
          </BreakdownSection>
        )}
      </Card>

      <Modal
        open={openCategory !== null}
        onClose={() => setOpenCategory(null)}
        title={
          openCategory
            ? getWorkStatusModalTitle(openCategory, flatCount, mode)
            : "처리 내역"
        }
        size="lg"
      >
        {openCategory && (
          <>
            <CategoryHint category={openCategory} mode={mode} />
            <WorkStatusTreeView
              nodes={treeNodes}
              data={data}
              role={activeRole}
              category={openCategory}
              mode={mode}
              totalCount={flatCount}
              onNavigate={() => setOpenCategory(null)}
            />
          </>
        )}
      </Modal>
    </>
  );
}

function SummaryTable({
  summary,
  totalActive,
  summaryTotal,
  categories,
  rowMeta,
  showCompletedSummary,
  onCategoryClick,
}: {
  summary: ReturnType<typeof calcDashboardWorkStatus>;
  totalActive: number;
  summaryTotal: number;
  categories: WorkStatusCategory[];
  rowMeta: typeof WORK_STATUS_CATEGORY_META;
  showCompletedSummary?: boolean;
  onCategoryClick: (category: WorkStatusCategory) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[360px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500">
            <th className="px-3 py-2 font-medium">구분</th>
            <th className="px-3 py-2 font-medium">건수</th>
            <th className="px-3 py-2 font-medium">비중</th>
            <th className="hidden px-3 py-2 font-medium sm:table-cell">
              설명
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <SummaryRow
              key={category}
              category={category}
              count={summary[category]}
              total={summaryTotal}
              meta={rowMeta[category]}
              onClick={() => onCategoryClick(category)}
            />
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-zinc-800 bg-zinc-950/40">
            <td className="px-3 py-2 text-xs font-medium text-zinc-400">
              {showCompletedSummary ? "진행 합계" : "합계"}
            </td>
            <td className="px-3 py-2 text-sm font-semibold text-zinc-200">
              {totalActive}건
            </td>
            <td className="px-3 py-2">
              <WorkStatusShareBar
                percent={calcWorkStatusSharePercent(totalActive, summaryTotal)}
                barClassName="bg-cyan-500"
                compact
              />
            </td>
            <td className="hidden px-3 py-2 text-xs text-zinc-600 sm:table-cell">
              {showCompletedSummary
                ? "미완료 실행 업무 · 취소·보류·연기 포함 · 완료는 별도 집계"
                : "활성 계약 기준 · 완료(오더준/입금) 제외"}
            </td>
          </tr>
          {showCompletedSummary && (
            <tr className="border-t border-zinc-800/60 bg-emerald-500/5">
              <td className="px-3 py-2 text-xs font-medium text-emerald-400/90">
                완료
              </td>
              <td className="px-3 py-2 text-sm font-semibold text-emerald-400">
                {summary.completed}건
              </td>
              <td className="px-3 py-2">
                <WorkStatusShareBar
                  percent={calcWorkStatusSharePercent(
                    summary.completed,
                    summaryTotal,
                  )}
                  barClassName="bg-emerald-500"
                  compact
                />
              </td>
              <td className="hidden px-3 py-2 text-xs text-zinc-600 sm:table-cell">
                오더준비 · 입금완료 실행 업무
              </td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
}

function SummaryRow({
  category,
  count,
  total,
  meta,
  onClick,
}: {
  category: WorkStatusCategory;
  count: number;
  total: number;
  meta: (typeof WORK_STATUS_CATEGORY_META)[WorkStatusCategory];
  onClick: () => void;
}) {
  return (
    <tr className="border-b border-zinc-800/80 last:border-0">
      <td className="px-3 py-3 font-medium text-zinc-200">
        {WORK_STATUS_CATEGORY_LABELS[category]}
      </td>
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={onClick}
          disabled={count === 0}
          className={cn(
            "rounded-lg px-2 py-1 font-bold tabular-nums transition-colors",
            count > 0
              ? `${meta.accent} hover:bg-zinc-900/80 hover:underline`
              : "cursor-default text-zinc-600",
          )}
        >
          {count}
        </button>
      </td>
      <td className="px-3 py-3">
        {count > 0 && total > 0 ? (
          <WorkStatusShareBar
            percent={calcWorkStatusSharePercent(count, total)}
            barClassName={meta.barClassName}
            compact
          />
        ) : (
          <span className="text-[10px] text-zinc-600">0%</span>
        )}
      </td>
      <td className="hidden px-3 py-3 text-xs text-zinc-500 sm:table-cell">
        {meta.description}
      </td>
    </tr>
  );
}

function AssigneeBreakdownTable({
  rows,
  showCompleted,
  onCategoryClick,
}: {
  rows: ReturnType<typeof getAssigneeWorkStatusBreakdown>;
  showCompleted?: boolean;
  onCategoryClick: (category: WorkStatusCategory) => void;
}) {
  return (
    <table className="w-full min-w-[560px] text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500">
          <th className="px-3 py-2 font-medium">담당</th>
          {WORK_STATUS_BREAKDOWN_CATEGORIES.map((category) => (
            <th key={category} className="px-3 py-2 font-medium">
              {WORK_STATUS_CATEGORY_META[category].shortLabel}
            </th>
          ))}
          {showCompleted && (
            <th className="px-3 py-2 font-medium">완료</th>
          )}
          <th className="px-3 py-2 font-medium">실행 진행%</th>
          <th className="px-3 py-2 font-medium">합계</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const rowTotal = showCompleted
            ? totalWorkStatusCountWithCompleted(row.summary)
            : totalWorkStatusCount(row.summary);

          return (
            <tr key={row.assigneeId} className="border-b border-zinc-800/80">
              <td className="px-3 py-2.5">
                <p className="font-medium text-zinc-200">{row.assigneeName}</p>
                <p className="text-[11px] text-zinc-600">{row.roleLabel}</p>
              </td>
              {WORK_STATUS_BREAKDOWN_CATEGORIES.map((category) => {
                const meta = WORK_STATUS_CATEGORY_META[category];
                return (
                  <WorkStatusMetricCell
                    key={category}
                    count={row.summary[category]}
                    total={rowTotal}
                    accent={meta.accent}
                    barClassName={meta.barClassName}
                    onClick={() => onCategoryClick(category)}
                  />
                );
              })}
              {showCompleted && (
                <WorkStatusMetricCell
                  count={row.summary.completed}
                  total={rowTotal}
                  accent={WORK_STATUS_CATEGORY_META.completed.accent}
                  barClassName={WORK_STATUS_CATEGORY_META.completed.barClassName}
                  onClick={() => onCategoryClick("completed")}
                />
              )}
              <td className="px-3 py-2.5">
                <WorkStatusExecutionProgress
                  percent={row.executionProgressPercent}
                  compact
                />
              </td>
              <td className="px-3 py-2.5">
                <p className="text-sm font-medium tabular-nums text-zinc-300">
                  {rowTotal}건
                </p>
                <WorkStatusShareBar
                  percent={calcWorkStatusCompletionPercent(row.summary)}
                  barClassName="bg-emerald-500"
                  compact
                  className="mt-1"
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TeamLeaderBreakdownTable({
  rows,
  onCategoryClick,
}: {
  rows: ReturnType<typeof getTeamLeaderWorkStatusBreakdown>;
  onCategoryClick: (category: WorkStatusCategory) => void;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const rowTotal = totalWorkStatusCountWithCompleted(row.summary);

        return (
          <div
            key={row.teamId}
            className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/30"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 px-3 py-2.5">
              <div>
                <p className="font-medium text-zinc-100">{row.leaderName}</p>
                <p className="text-[11px] text-zinc-500">{row.teamName}</p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                {WORK_STATUS_BREAKDOWN_CATEGORIES.map((category) => {
                  const meta = WORK_STATUS_CATEGORY_META[category];
                  return (
                    <WorkStatusHeaderMetric
                      key={category}
                      label={meta.shortLabel}
                      count={row.summary[category]}
                      total={rowTotal}
                      accent={meta.accent}
                      barClassName={meta.barClassName}
                    />
                  );
                })}
                <WorkStatusHeaderMetric
                  label="완료"
                  count={row.summary.completed}
                  total={rowTotal}
                  accent={WORK_STATUS_CATEGORY_META.completed.accent}
                  barClassName={WORK_STATUS_CATEGORY_META.completed.barClassName}
                />
                <div className="min-w-[5.5rem]">
                  <p className="mb-1 text-[10px] text-zinc-500">실행 진행%</p>
                  <WorkStatusExecutionProgress
                    percent={row.executionProgressPercent}
                    compact
                  />
                </div>
              </div>
            </div>
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-zinc-600">
                  <th className="px-3 py-2 font-medium">담당</th>
                  {WORK_STATUS_BREAKDOWN_CATEGORIES.map((category) => (
                    <th key={category} className="px-3 py-2 font-medium">
                      {WORK_STATUS_CATEGORY_META[category].shortLabel}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium">완료</th>
                  <th className="px-3 py-2 font-medium">실행 진행%</th>
                </tr>
              </thead>
              <tbody>
                {row.assignees.map((assignee) => {
                  const assigneeTotal = totalWorkStatusCountWithCompleted(
                    assignee.summary,
                  );

                  return (
                    <tr
                      key={`${row.teamId}-${assignee.assigneeId}`}
                      className="border-t border-zinc-800/60"
                    >
                      <td className="px-3 py-2 text-zinc-300">
                        {assignee.assigneeName}
                        <span className="ml-1 text-[10px] text-zinc-600">
                          {assignee.roleLabel}
                        </span>
                      </td>
                      {WORK_STATUS_BREAKDOWN_CATEGORIES.map((category) => {
                        const meta = WORK_STATUS_CATEGORY_META[category];
                        return (
                          <WorkStatusMetricCell
                            key={category}
                            count={assignee.summary[category]}
                            total={assigneeTotal}
                            accent={meta.accent}
                            barClassName={meta.barClassName}
                            onClick={() => onCategoryClick(category)}
                            compact
                          />
                        );
                      })}
                      <WorkStatusMetricCell
                        count={assignee.summary.completed}
                        total={assigneeTotal}
                        accent={WORK_STATUS_CATEGORY_META.completed.accent}
                        barClassName={
                          WORK_STATUS_CATEGORY_META.completed.barClassName
                        }
                        onClick={() => onCategoryClick("completed")}
                        compact
                      />
                      <td className="px-3 py-2">
                        <WorkStatusExecutionProgress
                          percent={assignee.executionProgressPercent}
                          compact
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function BreakdownSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 border-t border-zinc-800 pt-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </p>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function CategoryHint({
  category,
  mode,
}: {
  category: WorkStatusCategory;
  mode: WorkStatusPanelMode;
}) {
  const icon =
    category === "completed"
      ? CheckCircle2
      : category === "overdue"
        ? AlertTriangle
        : category === "due_today"
          ? CalendarClock
          : category === "cancelled"
            ? Ban
            : category === "on_hold"
              ? Pause
              : category === "postponed"
                ? Clock
                : ClipboardList;
  const Icon = icon;

  return (
    <p className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
      <Icon className="h-4 w-4 shrink-0" />
      {WORK_STATUS_CATEGORY_META[category].description}
      {" · "}
      {mode === "executive"
        ? "팀장 → 담당 → 업무 순으로 펼쳐 확인 · 업체 클릭 시 이동"
        : mode === "team_leader"
          ? "담당 → 업무 순 트리 · 업체 클릭 시 이동"
          : "항목 클릭 시 해당 업체 화면으로 이동"}
    </p>
  );
}
