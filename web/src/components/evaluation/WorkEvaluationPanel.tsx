"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Star } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/FormFields";
import {
  calcOverallScore,
  canAddSupplementalEvaluation,
  canSubmitWorkEvaluation,
  canViewWorkEvaluations,
  criterionList,
  currentEvaluationPeriod,
  findWorkEvaluation,
  formatEvaluateeMeta,
  formatMetricValue,
  getEvaluationScopeLabel,
  getEvaluationTargets,
  getVisibleWorkEvaluations,
  normalizeSupplementalScore,
  resolveWorkEvaluationDraft,
  scoreBadgeVariant,
  scoreToPercent,
} from "@/lib/work-evaluation-utils";
import { WORK_EVALUATION_CRITERIA } from "@/lib/types";
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
  const period = currentEvaluationPeriod();
  const canSupplemental = canAddSupplementalEvaluation(activeRole);

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
          targets={targets.slice(0, compact ? 3 : targets.length)}
          pendingCount={pendingCount}
          canSupplemental={canSupplemental}
          onSave={(evaluateeId, draft, comment) =>
            upsertWorkEvaluation({
              period,
              evaluateeId,
              evaluatorId: currentUser.id,
              scores: draft.scores,
              metrics: draft.metrics,
              supplementalScore: draft.supplementalScore,
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

function EvaluatorView({
  compact,
  period,
  targets,
  pendingCount,
  canSupplemental,
  onSave,
}: {
  compact?: boolean;
  period: string;
  targets: ReturnType<typeof getEvaluationTargets>;
  pendingCount: number;
  canSupplemental: boolean;
  onSave: (
    evaluateeId: string,
    draft: ReturnType<typeof resolveWorkEvaluationDraft>,
    comment?: string,
  ) => void;
}) {
  const data = useData();
  const { currentUser } = useRole();
  const [selectedId, setSelectedId] = useState(targets[0]?.id ?? "");

  const selected = targets.find((target) => target.id === selectedId) ?? targets[0];
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

  const [supplementalScore, setSupplementalScore] = useState<number | undefined>(
    existing?.supplementalScore,
  );
  const [comment, setComment] = useState(existing?.comment ?? "");

  function selectTarget(targetId: string) {
    setSelectedId(targetId);
    const target = targets.find((item) => item.id === targetId);
    if (!target) return;
    const saved = findWorkEvaluation(
      data.workEvaluations ?? [],
      period,
      currentUser.id,
      target.id,
    );
    setSupplementalScore(saved?.supplementalScore);
    setComment(saved?.comment ?? "");
  }

  function handleSave() {
    if (!selected || !draft) return;
    const normalizedSupplemental = canSupplemental
      ? normalizeSupplementalScore(supplementalScore)
      : undefined;
    onSave(
      selected.id,
      {
        ...draft,
        supplementalScore: normalizedSupplemental,
        overallScore: calcOverallScore(draft.scores, normalizedSupplemental),
      },
      comment.trim() || undefined,
    );
  }

  if (targets.length === 0 || !selected || !draft) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        평가 대상이 없습니다
      </p>
    );
  }

  const displayOverall = calcOverallScore(
    draft.scores,
    canSupplemental ? supplementalScore : undefined,
  );

  return (
    <div className="space-y-4">
      {!compact && (
        <p className="text-xs text-zinc-500">
          실행 진행율 · 재계약율 · 계약금액 자동 산출 · 대상 {targets.length}명 ·
          미저장 {pendingCount}명
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {targets.map((target) => {
          const done = Boolean(
            findWorkEvaluation(
              data.workEvaluations ?? [],
              period,
              currentUser.id,
              target.id,
            ),
          );
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
              <span className="font-medium">
                {target.id === currentUser.id ? `${target.name} (본인)` : target.name}
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

      <AutoScorePanel draft={draft} overall={displayOverall} />

      {canSupplemental && (
        <SupplementalScorePanel
          value={supplementalScore}
          onChange={setSupplementalScore}
        />
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <Textarea
          label="코멘트"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={
            canSupplemental
              ? "추가 평가 근거 · 강점 · 보완점"
              : "자동 평가 확인 메모"
          }
        />
        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={handleSave}>
            {existing ? "평가 갱신" : "평가 저장"}
          </Button>
        </div>
      </div>

      {compact && targets.length > 3 && (
        <p className="text-center text-xs text-zinc-500">
          <Link href="/evaluations" className="text-emerald-400 hover:underline">
            +{targets.length - 3}명 더 보기
          </Link>
        </p>
      )}
    </div>
  );
}

function AutoScorePanel({
  draft,
  overall,
}: {
  draft: ReturnType<typeof resolveWorkEvaluationDraft>;
  overall: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-emerald-400" />
          <p className="text-sm font-medium text-zinc-200">실적 자동 평가</p>
          <Badge variant={scoreBadgeVariant(overall)}>
            종합 {overall.toFixed(1)} / 5
          </Badge>
        </div>
        <Badge variant="info">자동 산출</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {criterionList().map((key) => (
          <div
            key={key}
            className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3"
          >
            <p className="text-sm font-medium text-zinc-200">
              {WORK_EVALUATION_CRITERIA[key].label}
            </p>
            <p className="text-[11px] text-zinc-500">
              {WORK_EVALUATION_CRITERIA[key].description}
            </p>
            <p className="mt-2 text-xs text-cyan-400/90">
              실적 {formatMetricValue(key, draft.metrics)}
            </p>
            <p className="mt-2 inline-flex items-center gap-1 font-mono text-lg text-emerald-400">
              <Star className="h-4 w-4" />
              {draft.scores[key].toFixed(1)}
              <span className="text-xs text-zinc-500">
                ({scoreToPercent(draft.scores[key])}%)
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SupplementalScorePanel({
  value,
  onChange,
}: {
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  const score = value ?? 3;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-amber-200">추가 평가 (임원·대표)</p>
          <p className="text-[11px] text-zinc-500">
            자동 평가와 별도 · 1~5점 (선택)
          </p>
        </div>
        <span className="inline-flex items-center gap-1 font-mono text-sm text-amber-300">
          <Star className="h-3.5 w-3.5" />
          {score.toFixed(1)}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={0.5}
        value={score}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-amber-500"
      />
      <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
        <span>1</span>
        <button
          type="button"
          className="text-zinc-500 hover:text-zinc-300"
          onClick={() => onChange(undefined)}
        >
          추가 평가 없음
        </button>
        <span>5</span>
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

  if (evaluations.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        등록된 업무평가가 없습니다
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
            <th className="px-3 py-2 font-medium">피평가자</th>
            <th className="px-3 py-2 font-medium">평가자</th>
            <th className="px-3 py-2 font-medium">자동 실적</th>
            <th className="px-3 py-2 font-medium">추가</th>
            <th className="px-3 py-2 font-medium">종합</th>
          </tr>
        </thead>
        <tbody>
          {evaluations.map((evaluation) => (
            <tr key={evaluation.id} className="border-b border-zinc-800/60">
              <td className="px-3 py-2.5 text-zinc-200">
                {data.users.find((user) => user.id === evaluation.evaluateeId)?.name ??
                  evaluation.evaluateeId}
              </td>
              <td className="px-3 py-2.5 text-zinc-400">
                {data.users.find((user) => user.id === evaluation.evaluatorId)?.name ??
                  evaluation.evaluatorId}
              </td>
              <td className="px-3 py-2.5 text-xs text-zinc-500">
                진행 {evaluation.metrics.executionProgressPercent.toFixed(0)}% ·
                연장 {evaluation.metrics.extensionRatePercent.toFixed(0)}%
              </td>
              <td className="px-3 py-2.5 text-zinc-400">
                {evaluation.supplementalScore?.toFixed(1) ?? "-"}
              </td>
              <td className="px-3 py-2.5">
                <Badge variant={scoreBadgeVariant(evaluation.overallScore)}>
                  {evaluation.overallScore.toFixed(1)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WorkEvaluationPageContent() {
  const { activeRole } = useRole();
  const canView = canViewWorkEvaluations(activeRole);
  const canSubmit = canSubmitWorkEvaluation(activeRole);
  const canSupplemental = canAddSupplementalEvaluation(activeRole);

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
          {canSupplemental
            ? "실행 진행율 · 재계약율 · 계약금액 자동 평가 + 임원·대표 추가 평가(1~5점)"
            : canSubmit
              ? `${getEvaluationScopeLabel(activeRole)} · 실적 자동 산출 결과를 저장합니다.`
              : "전사 업무평가 현황을 조회합니다."}
        </p>
      </div>
      <WorkEvaluationPanel compact={false} showHeaderLink={false} />
    </div>
  );
}
