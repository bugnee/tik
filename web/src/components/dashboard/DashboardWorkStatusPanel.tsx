"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardList } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { WorkStatusTreeView } from "@/components/dashboard/WorkStatusTreeView";
import { Card, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { DEMO_TODAY } from "@/lib/contract-lifecycle";
import {
  buildWorkStatusTree,
  calcDashboardWorkStatus,
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
  WORK_STATUS_CATEGORY_LABELS,
  type WorkStatusCategory,
  type WorkStatusPanelMode,
} from "@/lib/dashboard-work-status-utils";
import { cn } from "@/lib/cn";

const ROW_META: Record<
  WorkStatusCategory,
  { accent: string; description: string }
> = {
  in_progress: {
    accent: "text-cyan-400",
    description: "파트너 승인 · 결과 입력 · 입금 대기 등 실행 중",
  },
  due_today: {
    accent: "text-amber-400",
    description: `마감일 ${DEMO_TODAY} · 미완료 업무`,
  },
  overdue: {
    accent: "text-rose-400",
    description: "마감일 경과 · 미완료 업무",
  },
  completed: {
    accent: "text-emerald-400",
    description: "오더준비 · 입금완료 등 처리 완료 실행 업무",
  },
};

export function DashboardWorkStatusPanel({
  className,
}: {
  className?: string;
}) {
  const data = useData();
  const { currentUser, activeRole } = useRole();
  const [openCategory, setOpenCategory] = useState<WorkStatusCategory | null>(
    null,
  );

  const mode = getWorkStatusPanelMode(activeRole);

  const summary = useMemo(
    () => calcDashboardWorkStatus(data, activeRole, currentUser.id),
    [data, activeRole, currentUser.id],
  );

  const orders = useMemo(
    () => getRoleVisibleWorkOrders(data, activeRole, currentUser.id),
    [data, activeRole, currentUser.id],
  );

  const assigneeBreakdown = useMemo(() => {
    if (mode !== "team_leader") return [];
    return getAssigneeWorkStatusBreakdown(data, orders).filter(
      (row) => totalWorkStatusCountWithCompleted(row.summary) > 0,
    );
  }, [data, orders, mode]);

  const teamLeaderBreakdown = useMemo(() => {
    if (mode !== "executive") return [];
    return getTeamLeaderWorkStatusBreakdown(data, activeRole, currentUser.id);
  }, [data, activeRole, currentUser.id, mode]);

  const treeNodes = useMemo(() => {
    if (!openCategory) return [];
    return buildWorkStatusTree(
      data,
      activeRole,
      currentUser.id,
      openCategory,
    );
  }, [data, activeRole, currentUser.id, openCategory]);

  const flatCount = openCategory
    ? getDashboardWorkStatusItems(
        data,
        activeRole,
        currentUser.id,
        openCategory,
      ).length
    : 0;

  const totalActive = totalActiveWorkStatusCount(summary);
  const categories = getWorkStatusCategoriesForMode(mode);

  return (
    <>
      <Card glow className={className}>
        <CardHeader
          title={getWorkStatusPanelTitle(mode)}
          subtitle={getWorkStatusPanelSubtitle(mode)}
        />

        <SummaryTable
          summary={summary}
          totalActive={totalActive}
          categories={categories}
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
  categories,
  showCompletedSummary,
  onCategoryClick,
}: {
  summary: ReturnType<typeof calcDashboardWorkStatus>;
  totalActive: number;
  categories: WorkStatusCategory[];
  showCompletedSummary?: boolean;
  onCategoryClick: (category: WorkStatusCategory) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500">
            <th className="px-3 py-2 font-medium">구분</th>
            <th className="px-3 py-2 font-medium">건수</th>
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
            <td className="hidden px-3 py-2 text-xs text-zinc-600 sm:table-cell">
              {showCompletedSummary
                ? "미완료 실행 업무 · 완료는 별도 집계"
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
  onClick,
}: {
  category: WorkStatusCategory;
  count: number;
  onClick: () => void;
}) {
  const meta = ROW_META[category];
  return (
    <tr className="border-b border-zinc-800/80 last:border-0">
      <td className="px-3 py-3 font-medium text-zinc-200">
        {WORK_STATUS_CATEGORY_LABELS[category]}
      </td>
      <td className="px-3 py-3">
        <CountButton count={count} accent={meta.accent} onClick={onClick} />
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
    <table className="w-full min-w-[480px] text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500">
          <th className="px-3 py-2 font-medium">담당</th>
          <th className="px-3 py-2 font-medium">진행중</th>
          <th className="px-3 py-2 font-medium">오늘 마감</th>
          <th className="px-3 py-2 font-medium">마감초과</th>
          {showCompleted && (
            <th className="px-3 py-2 font-medium">완료</th>
          )}
          <th className="px-3 py-2 font-medium">합계</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.assigneeId} className="border-b border-zinc-800/80">
            <td className="px-3 py-2.5">
              <p className="font-medium text-zinc-200">{row.assigneeName}</p>
              <p className="text-[11px] text-zinc-600">{row.roleLabel}</p>
            </td>
            <CategoryCell
              count={row.summary.in_progress}
              accent="text-cyan-400"
              onClick={() => onCategoryClick("in_progress")}
            />
            <CategoryCell
              count={row.summary.due_today}
              accent="text-amber-400"
              onClick={() => onCategoryClick("due_today")}
            />
            <CategoryCell
              count={row.summary.overdue}
              accent="text-rose-400"
              onClick={() => onCategoryClick("overdue")}
            />
            {showCompleted && (
              <CategoryCell
                count={row.summary.completed}
                accent="text-emerald-400"
                onClick={() => onCategoryClick("completed")}
              />
            )}
            <td className="px-3 py-2.5 text-sm font-medium text-zinc-300">
              {showCompleted
                ? totalWorkStatusCountWithCompleted(row.summary)
                : totalWorkStatusCount(row.summary)}
              건
            </td>
          </tr>
        ))}
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
      {rows.map((row) => (
        <div
          key={row.teamId}
          className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/30"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2.5">
            <div>
              <p className="font-medium text-zinc-100">{row.leaderName}</p>
              <p className="text-[11px] text-zinc-500">{row.teamName}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="text-cyan-400">
                진행 {row.summary.in_progress}
              </span>
              <span className="text-amber-400">
                오늘 {row.summary.due_today}
              </span>
              <span className="text-rose-400">
                초과 {row.summary.overdue}
              </span>
              <span className="text-emerald-400">
                완료 {row.summary.completed}
              </span>
            </div>
          </div>
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-zinc-600">
                <th className="px-3 py-2 font-medium">담당</th>
                <th className="px-3 py-2 font-medium">진행중</th>
                <th className="px-3 py-2 font-medium">오늘</th>
                <th className="px-3 py-2 font-medium">초과</th>
                <th className="px-3 py-2 font-medium">완료</th>
              </tr>
            </thead>
            <tbody>
              {row.assignees.map((assignee) => (
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
                  <CategoryCell
                    count={assignee.summary.in_progress}
                    accent="text-cyan-400"
                    onClick={() => onCategoryClick("in_progress")}
                    compact
                  />
                  <CategoryCell
                    count={assignee.summary.due_today}
                    accent="text-amber-400"
                    onClick={() => onCategoryClick("due_today")}
                    compact
                  />
                  <CategoryCell
                    count={assignee.summary.overdue}
                    accent="text-rose-400"
                    onClick={() => onCategoryClick("overdue")}
                    compact
                  />
                  <CategoryCell
                    count={assignee.summary.completed}
                    accent="text-emerald-400"
                    onClick={() => onCategoryClick("completed")}
                    compact
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function CategoryCell({
  count,
  accent,
  onClick,
  compact,
}: {
  count: number;
  accent: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <td className={cn("px-3", compact ? "py-2" : "py-2.5")}>
      <CountButton
        count={count}
        accent={accent}
        onClick={onClick}
        size={compact ? "sm" : "md"}
      />
    </td>
  );
}

function CountButton({
  count,
  accent,
  onClick,
  size = "md",
}: {
  count: number;
  accent: string;
  onClick: () => void;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={count === 0}
      className={cn(
        "rounded-lg font-bold tabular-nums transition-colors",
        size === "sm" ? "px-2 py-0.5 text-sm" : "min-w-[2.5rem] px-3 py-1.5 text-lg",
        count > 0
          ? `${accent} hover:bg-zinc-900/80 hover:underline`
          : "cursor-default text-zinc-600",
      )}
    >
      {count}
    </button>
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
          : ClipboardList;
  const Icon = icon;

  return (
    <p className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
      <Icon className="h-4 w-4 shrink-0" />
      {mode === "executive"
        ? "팀장 → 담당 → 업무 순으로 펼쳐 확인 · 업체 클릭 시 이동"
        : mode === "team_leader"
          ? "담당 → 업무 순 트리 · 업체 클릭 시 이동"
          : "항목 클릭 시 해당 업체 화면으로 이동"}
    </p>
  );
}
