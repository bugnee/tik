"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Star } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useDashboardPeriod } from "@/context/DashboardPeriodContext";
import { useRole } from "@/context/RoleContext";
import { evaluationPeriodFromDashboard } from "@/lib/dashboard-period-utils";
import { Badge } from "@/components/ui/Badge";
import { SaveButton } from "@/components/ui/SaveButton";
import { useSaveMeta } from "@/hooks/useSaveMeta";
import { Card, CardHeader } from "@/components/ui/Card";
import { Select, Textarea } from "@/components/ui/FormFields";
import {
  buildWorkEvaluationBreakdown,
  calcOverallScore,
  canSubmitWorkEvaluation,
  canViewWorkEvaluations,
  criterionList,
  findWorkEvaluation,
  formatEvaluateeMeta,
  formatMetricValue,
  getCriterionAchievementPercent,
  getEvaluationScopeLabel,
  getEvaluationTargets,
  getOverallEvaluationGrade,
  getVisibleWorkEvaluations,
  resolveWorkEvaluationDraft,
  scoreBadgeVariant,
  sortEvaluationTargets,
  sortWorkEvaluations,
  WORK_EVALUATION_SORT_OPTIONS,
  DEFAULT_WORK_EVALUATION_SORT,
  type WorkEvaluationSortKey,
} from "@/lib/work-evaluation-utils";
import { WORK_EVALUATION_CRITERIA, WORK_EVALUATION_SCORE_MAX } from "@/lib/types";
import { cn } from "@/lib/cn";

type WorkEvaluationPanelProps = {
  compact?: boolean;
  showHeaderLink?: boolean;
};

export function WorkEvaluationPanel({
  compact = false,
  showHeaderLink = true,
}: WorkEvaluationPanelProps) {
  const data = useData();
  const { currentUser, activeRole } = useRole();
  const { upsertWorkEvaluation } = data;
  const { periodFilter } = useDashboardPeriod();
  const period = evaluationPeriodFromDashboard(periodFilter);

  const canSubmit = canSubmitWorkEvaluation(activeRole);
  const canView = canViewWorkEvaluations(activeRole);

  const targets = useMemo(
    () => getEvaluationTargets(data, activeRole, currentUser.id),
    [data, activeRole, currentUser.id],
  );

  const visibleEvaluations = useMemo(
    () => getVisibleWorkEvaluations(data, activeRole, currentUser.id, period),
    [data, activeRole, currentUser.id, period],
  );

  const pendingCount = useMemo(() => {
    if (!canSubmit) return 0;
    return targets.filter(
      (target) =>
        !findWorkEvaluation(
          data.workEvaluations ?? [],
          period,
          currentUser.id,
          target.id,
        ),
    ).length;
  }, [canSubmit, targets, data.workEvaluations, period, currentUser.id]);

  if (!canView) return null;

  return (
    <Card glow={!compact}>
      <CardHeader
        title="업무평가"
        subtitle={
          canSubmit
            ? `${period} · ${getEvaluationScopeLabel(activeRole)}`
            : `${period} · 전사 평가 현황`
        }
        action={
          <div className="flex items-center gap-2">
            {canSubmit && pendingCount > 0 && (
              <Badge variant="warning">미저장 {pendingCount}</Badge>
            )}
            {showHeaderLink && (
              <Link
                href="/evaluations"
                className="text-xs text-emerald-400 hover:underline"
              >
                전체 보기
              </Link>
            )}
          </div>
        }
      />

      {canSubmit ? (
        <EvaluatorView
          compact={compact}
          period={period}
          targets={targets}
          pendingCount={pendingCount}
          onSave={(evaluateeId, draft, comment) =>
            upsertWorkEvaluation({
              period,
              evaluateeId,
              evaluatorId: currentUser.id,
              scores: draft.scores,
              metrics: draft.metrics,
              comment,
            })
          }
        />
      ) : (
        <ViewerSummary evaluations={visibleEvaluations.slice(0, compact ? 5 : 20)} />
      )}
    </Card>
  );
}

function WorkEvaluationSortSelect({
  value,
  onChange,
  includeSaveSort = true,
  className,
}: {
  value: WorkEvaluationSortKey;
  onChange: (value: WorkEvaluationSortKey) => void;
  includeSaveSort?: boolean;
  className?: string;
}) {
  const options = includeSaveSort
    ? WORK_EVALUATION_SORT_OPTIONS
    : WORK_EVALUATION_SORT_OPTIONS.filter(
        (option) =>
          option.value !== "unsaved_first" && option.value !== "saved_first",
      );

  return (
    <Select
      value={value}
      onChange={(event) => onChange(event.target.value as WorkEvaluationSortKey)}
      aria-label="정렬"
      className={cn("w-auto min-w-[132px] py-1.5 text-xs", className)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

function EvaluatorView({
  compact,
  period,
  targets,
  pendingCount,
  onSave,
}: {
  compact?: boolean;
  period: string;
  targets: ReturnType<typeof getEvaluationTargets>;
  pendingCount: number;
  onSave: (
    evaluateeId: string,
    draft: ReturnType<typeof resolveWorkEvaluationDraft>,
    comment?: string,
  ) => void;
}) {
  const data = useData();
  const { currentUser } = useRole();
  const [sortKey, setSortKey] = useState<WorkEvaluationSortKey>(
    DEFAULT_WORK_EVALUATION_SORT,
  );

  const sortedTargets = useMemo(
    () =>
      sortEvaluationTargets(data, targets, sortKey, {
        period,
        evaluatorId: currentUser.id,
      }),
    [data, targets, sortKey, period, currentUser.id],
  );

  const displayTargets = compact
    ? sortedTargets.slice(0, 3)
    : sortedTargets;

  const [selectedId, setSelectedId] = useState(displayTargets[0]?.id ?? "");

  const selected =
    displayTargets.find((target) => target.id === selectedId) ??
    sortedTargets.find((target) => target.id === selectedId) ??
    displayTargets[0];
  const existing = selected
    ? findWorkEvaluation(
        data.workEvaluations ?? [],
        period,
        currentUser.id,
        selected.id,
      )
    : undefined;

  const draft = selected
    ? resolveWorkEvaluationDraft(data, selected, existing)
    : undefined;

  const [comment, setComment] = useState(existing?.comment ?? "");
  const evaluationDirty = !existing || comment !== (existing.comment ?? "");
  const saveMeta = useSaveMeta(
    existing?.updatedAt
      ? {
          savedAt: existing.updatedAt,
          savedByUserId: existing.evaluatorId,
        }
      : null,
  );

  function selectTarget(targetId: string) {
    setSelectedId(targetId);
    const target = sortedTargets.find((item) => item.id === targetId);
    if (!target) return;
    const saved = findWorkEvaluation(
      data.workEvaluations ?? [],
      period,
      currentUser.id,
      target.id,
    );
    setComment(saved?.comment ?? "");
  }

  function handleSave() {
    if (!selected || !draft) return;
    onSave(
      selected.id,
      {
        ...draft,
        overallScore: calcOverallScore(draft.scores),
      },
      comment.trim() || undefined,
    );
    saveMeta.recordSave();
  }

  if (targets.length === 0 || !selected || !draft) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        평가 대상이 없습니다
      </p>
    );
  }

  const displayOverall = calcOverallScore(draft.scores);
  const overallGrade = getOverallEvaluationGrade(displayOverall);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!compact && (
          <p className="text-xs text-zinc-500">
            실행 50% · 재계약 25% · 계약금액(전사 비중·기여 70%) 25% · 대상{" "}
            {targets.length}명 · 미저장 {pendingCount}명
          </p>
        )}
        <WorkEvaluationSortSelect
          value={sortKey}
          onChange={setSortKey}
          className={compact ? "" : "ml-auto"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {displayTargets.map((target) => {
          const saved = findWorkEvaluation(
            data.workEvaluations ?? [],
            period,
            currentUser.id,
            target.id,
          );
          const targetDraft = resolveWorkEvaluationDraft(data, target, saved);
          const done = Boolean(saved);
          return (
            <button
              key={target.id}
              type="button"
              onClick={() => selectTarget(target.id)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                selected?.id === target.id
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-zinc-700",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {target.id === currentUser.id ? `${target.name} (본인)` : target.name}
                </span>
                <span className="font-mono text-[11px] text-emerald-400/90">
                  {targetDraft.overallScore.toFixed(1)}점
                </span>
              </span>
              <span className="mt-0.5 block text-[11px] text-zinc-500">
                {formatEvaluateeMeta(data, target)}
              </span>
              <span className="mt-1 inline-flex">
                <Badge variant={done ? "success" : "warning"} className="text-[10px]">
                  {done ? "저장됨" : "미저장"}
                </Badge>
              </span>
            </button>
          );
        })}
      </div>

      <AutoScorePanel
        draft={draft}
        overall={displayOverall}
        overallGrade={overallGrade}
      />

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <Textarea
          label="코멘트"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="자동 평가 확인 메모"
        />
        <div className="mt-4 flex justify-end">
          <SaveButton
            type="button"
            dirty={evaluationDirty}
            onClick={handleSave}
            savedAt={saveMeta.savedAt}
            savedBy={saveMeta.savedBy}
          >
            {existing ? "평가 갱신" : "평가 저장"}
          </SaveButton>
        </div>
      </div>

      {compact && sortedTargets.length > 3 && (
        <p className="text-center text-xs text-zinc-500">
          <Link href="/evaluations" className="text-emerald-400 hover:underline">
            +{sortedTargets.length - 3}명 더 보기
          </Link>
        </p>
      )}
    </div>
  );
}

function AutoScorePanel({
  draft,
  overall,
  overallGrade,
}: {
  draft: ReturnType<typeof resolveWorkEvaluationDraft>;
  overall: number;
  overallGrade: ReturnType<typeof getOverallEvaluationGrade>;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-emerald-400" />
        <p className="text-sm font-medium text-zinc-200">실적 자동 평가</p>
        <Badge variant={scoreBadgeVariant(overall)}>
          {overallGrade.grade} · {overallGrade.label}
        </Badge>
        <Badge variant="info">
          종합 {overall.toFixed(1)} / {WORK_EVALUATION_SCORE_MAX}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {criterionList().map((key) => {
          const achievement = getCriterionAchievementPercent(key, draft.metrics);
          const row = buildWorkEvaluationBreakdown(draft.metrics, draft.scores).find(
            (item) => item.key === key,
          );
          return (
          <div
            key={key}
            className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3"
          >
            <p className="text-sm font-medium text-zinc-200">
              {WORK_EVALUATION_CRITERIA[key].label}
              <span className="ml-1.5 text-[11px] font-normal text-amber-400/90">
                {WORK_EVALUATION_CRITERIA[key].weightPercent}%
              </span>
            </p>
            <p className="text-[11px] text-zinc-500">
              {WORK_EVALUATION_CRITERIA[key].description}
            </p>
            <p className="mt-2 text-xs text-cyan-400/90">
              실적 {formatMetricValue(key, draft.metrics)}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              달성률 {achievement.toFixed(1)}%
            </p>
            <p className="mt-2 inline-flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 font-mono text-lg text-emerald-400">
                <Star className="h-4 w-4" />
                {draft.scores[key].toFixed(1)}
                <span className="text-sm text-zinc-400">
                  / {WORK_EVALUATION_SCORE_MAX}
                </span>
              </span>
              {row && (
                <Badge variant={scoreBadgeVariant(row.score)}>
                  {row.grade} · {row.gradeLabel}
                </Badge>
              )}
            </p>
          </div>
          );
        })}
      </div>

      <AutoEvaluationBreakdown
        draft={draft}
        overall={overall}
        overallGrade={overallGrade}
      />
    </div>
  );
}

function AutoEvaluationBreakdown({
  draft,
  overall,
  overallGrade,
}: {
  draft: ReturnType<typeof resolveWorkEvaluationDraft>;
  overall: number;
  overallGrade: ReturnType<typeof getOverallEvaluationGrade>;
}) {
  const rows = buildWorkEvaluationBreakdown(draft.metrics, draft.scores);

  return (
    <div className="mt-4 space-y-2 border-t border-zinc-800/80 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        자동평가 산출 내역
      </p>
      <div className="overflow-x-auto rounded-lg border border-zinc-800/80">
        <table className="w-full min-w-[720px] text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-left text-zinc-500">
              <th className="px-3 py-2 font-medium">항목</th>
              <th className="px-3 py-2 font-medium">KPI 목표</th>
              <th className="px-3 py-2 font-medium">실적</th>
              <th className="px-3 py-2 font-medium">달성률</th>
              <th className="px-3 py-2 font-medium">등급</th>
              <th className="px-3 py-2 font-medium">환산 점수</th>
              <th className="px-3 py-2 font-medium">가중치</th>
              <th className="px-3 py-2 font-medium text-right">기여 점수</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-zinc-800/60 text-zinc-300">
                <td className="px-3 py-2.5">
                  {WORK_EVALUATION_CRITERIA[row.key].label}
                </td>
                <td className="px-3 py-2.5 text-zinc-400">{row.targetDisplay}</td>
                <td className="px-3 py-2.5 text-cyan-400/90">{row.actualDisplay}</td>
                <td className="px-3 py-2.5 font-mono">
                  {row.achievementPercent.toFixed(1)}%
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant={scoreBadgeVariant(row.score)}>
                    {row.grade} · {row.gradeLabel}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 font-mono">
                  {row.score.toFixed(1)} / {WORK_EVALUATION_SCORE_MAX}
                </td>
                <td className="px-3 py-2.5">{row.weightPercent}%</td>
                <td className="px-3 py-2.5 text-right font-mono text-emerald-400">
                  {row.weightedScore.toFixed(2)}
                </td>
              </tr>
            ))}
            <tr className="bg-zinc-900/40 font-medium text-zinc-100">
              <td className="px-3 py-2.5" colSpan={4}>
                종합 (가중 합산)
              </td>
              <td className="px-3 py-2.5">
                <Badge variant={scoreBadgeVariant(overall)}>
                  {overallGrade.grade} · {overallGrade.label}
                </Badge>
              </td>
              <td className="px-3 py-2.5 font-mono text-emerald-300">
                {overall.toFixed(1)} / {WORK_EVALUATION_SCORE_MAX}
              </td>
              <td className="px-3 py-2.5">100%</td>
              <td className="px-3 py-2.5 text-right font-mono text-emerald-300">
                {overall.toFixed(1)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ViewerSummary({
  evaluations,
}: {
  evaluations: ReturnType<typeof getVisibleWorkEvaluations>;
}) {
  const data = useData();
  const [sortKey, setSortKey] = useState<WorkEvaluationSortKey>(
    DEFAULT_WORK_EVALUATION_SORT,
  );

  const sortedEvaluations = useMemo(
    () => sortWorkEvaluations(evaluations, data, sortKey),
    [evaluations, data, sortKey],
  );

  if (evaluations.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        등록된 업무평가가 없습니다
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <WorkEvaluationSortSelect
          value={sortKey}
          onChange={setSortKey}
          includeSaveSort={false}
        />
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
            <th className="px-3 py-2 font-medium">피평가자</th>
            <th className="px-3 py-2 font-medium">평가자</th>
            <th className="px-3 py-2 font-medium">자동평가 내역</th>
            <th className="px-3 py-2 font-medium">종합</th>
          </tr>
        </thead>
        <tbody>
          {sortedEvaluations.map((evaluation) => {
            const grade = getOverallEvaluationGrade(evaluation.overallScore);
            return (
            <tr key={evaluation.id} className="border-b border-zinc-800/60">
              <td className="px-3 py-2.5 text-zinc-200">
                {data.users.find((user) => user.id === evaluation.evaluateeId)?.name ??
                  evaluation.evaluateeId}
              </td>
              <td className="px-3 py-2.5 text-zinc-400">
                {data.users.find((user) => user.id === evaluation.evaluatorId)?.name ??
                  evaluation.evaluatorId}
              </td>
              <td className="px-3 py-2.5 text-xs text-zinc-400">
                <div className="space-y-1">
                  {criterionList().map((key) => (
                    <p key={key}>
                      {WORK_EVALUATION_CRITERIA[key].label}{" "}
                      <span className="text-cyan-400/90">
                        {formatMetricValue(key, evaluation.metrics)}
                      </span>
                      {" → "}
                      <span className="font-mono text-emerald-400">
                        {evaluation.scores[key].toFixed(1)}
                      </span>
                      <span className="text-zinc-500">
                        /{WORK_EVALUATION_SCORE_MAX}
                      </span>
                    </p>
                  ))}
                </div>
              </td>
              <td className="px-3 py-2.5">
                <Badge variant={scoreBadgeVariant(evaluation.overallScore)}>
                  {grade.grade} · {evaluation.overallScore.toFixed(1)} /{" "}
                  {WORK_EVALUATION_SCORE_MAX}
                </Badge>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export function WorkEvaluationPageContent() {
  const { activeRole } = useRole();
  const canView = canViewWorkEvaluations(activeRole);
  const canSubmit = canSubmitWorkEvaluation(activeRole);

  if (!canView) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-zinc-500">업무평가 화면에 접근할 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
          업무평가
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {canSubmit
            ? `${getEvaluationScopeLabel(activeRole)} · 실적 자동 산출 결과를 저장합니다.`
            : "전사 업무평가 현황을 조회합니다."}
        </p>
      </div>
      <WorkEvaluationPanel compact={false} showHeaderLink={false} />
    </div>
  );
}
