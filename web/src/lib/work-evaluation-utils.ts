import { DEMO_TODAY } from "@/lib/contract-lifecycle";
import {
  filterContractsByRole,
  getExtensionRate,
  getMonthlyProgressRate,
  getTeamName,
  getUserName,
} from "@/lib/selectors";
import type {
  AppData,
  User,
  UserRole,
  WorkEvaluation,
  WorkEvaluationCriterion,
  WorkEvaluationInput,
  WorkEvaluationMetrics,
  WorkEvaluationScores,
} from "@/lib/types";
import { WORK_EVALUATION_ACHIEVEMENT_BANDS, WORK_EVALUATION_CRITERIA, WORK_EVALUATION_KPI_TARGETS, WORK_EVALUATION_OVERALL_GRADES, WORK_EVALUATION_SCORE_MAX, WORK_EVALUATION_STAFF_CONTRIBUTION_FACTOR, WORK_EVALUATION_WEIGHTS, type WorkEvaluationGrade } from "@/lib/types";

const INTERNAL_EVALUATOR_ROLES: UserRole[] = [
  "team_leader",
  "executive",
  "ceo",
];

export function canSubmitWorkEvaluation(role: UserRole): boolean {
  return INTERNAL_EVALUATOR_ROLES.includes(role);
}

export function canViewWorkEvaluations(role: UserRole): boolean {
  if (role === "finance_manager") return false;
  return role === "ceo" || role === "executive" || role === "team_leader";
}

export function currentEvaluationPeriod(reference = DEMO_TODAY): string {
  return reference.slice(0, 7);
}

export function computeEvaluationMetrics(
  data: AppData,
  evaluatee: User,
): WorkEvaluationMetrics {
  const contracts = filterContractsByRole(
    data,
    evaluatee.role,
    evaluatee.id,
  ).filter((contract) => contract.status === "active");

  const executionProgressPercent =
    contracts.length > 0
      ? contracts.reduce(
          (sum, contract) => sum + getMonthlyProgressRate(data, contract),
          0,
        ) / contracts.length
      : 0;

  const extensionRatePercent = getExtensionRate(contracts);
  const contractAmountTotal = contracts.reduce(
    (sum, contract) => sum + contract.monthlyFee,
    0,
  );
  const companyRevenueTotal = getCompanyActiveRevenueTotal(data);
  const companyRevenueSharePercent =
    companyRevenueTotal > 0
      ? (contractAmountTotal / companyRevenueTotal) * 100
      : 0;

  return {
    executionProgressPercent: Math.round(executionProgressPercent * 10) / 10,
    extensionRatePercent: Math.round(extensionRatePercent * 10) / 10,
    contractAmountTotal,
    contractCount: contracts.length,
    companyRevenueSharePercent:
      Math.round(companyRevenueSharePercent * 10) / 10,
  };
}

function getCompanyActiveRevenueTotal(data: AppData): number {
  return data.contracts
    .filter((contract) => contract.status === "active")
    .reduce((sum, contract) => sum + contract.monthlyFee, 0);
}

/** KPI 목표 대비 달성률(%) — 120% 초과 구간은 그대로 반영 */
export function getCriterionAchievementPercent(
  key: WorkEvaluationCriterion,
  metrics: WorkEvaluationMetrics,
): number {
  switch (key) {
    case "executionProgress":
      return (
        (metrics.executionProgressPercent /
          WORK_EVALUATION_KPI_TARGETS.executionProgressPercent) *
        100
      );
    case "extensionRate":
      return metrics.extensionRatePercent <= 0
        ? 0
        : (metrics.extensionRatePercent /
            WORK_EVALUATION_KPI_TARGETS.extensionRatePercent) *
          100;
    case "contractVolume": {
      const attributedShare =
        metrics.companyRevenueSharePercent *
        WORK_EVALUATION_STAFF_CONTRIBUTION_FACTOR;
      const targetShare =
        WORK_EVALUATION_KPI_TARGETS.companyRevenueSharePercent *
        WORK_EVALUATION_STAFF_CONTRIBUTION_FACTOR;
      return targetShare <= 0
        ? 0
        : (attributedShare / targetShare) * 100;
    }
  }
}

/** 달성률 → 구간 점수·등급 */
export function achievementPercentToGradeScore(achievementPercent: number): {
  score: number;
  grade: WorkEvaluationGrade;
  gradeLabel: string;
} {
  const value = Math.max(0, achievementPercent);
  for (const band of WORK_EVALUATION_ACHIEVEMENT_BANDS) {
    if (value >= band.minAchievement) {
      return {
        score: band.score,
        grade: band.grade,
        gradeLabel: band.label,
      };
    }
  }
  const fallback = WORK_EVALUATION_ACHIEVEMENT_BANDS.at(-1)!;
  return {
    score: fallback.score,
    grade: fallback.grade,
    gradeLabel: fallback.label,
  };
}

export function getOverallEvaluationGrade(overallScore: number): {
  grade: WorkEvaluationGrade;
  label: string;
} {
  for (const row of WORK_EVALUATION_OVERALL_GRADES) {
    if (overallScore >= row.minScore) {
      return { grade: row.grade, label: row.label };
    }
  }
  const fallback = WORK_EVALUATION_OVERALL_GRADES.at(-1)!;
  return { grade: fallback.grade, label: fallback.label };
}

export type WorkEvaluationBreakdownRow = {
  key: WorkEvaluationCriterion;
  targetDisplay: string;
  actualDisplay: string;
  achievementPercent: number;
  grade: WorkEvaluationGrade;
  gradeLabel: string;
  score: number;
  weightPercent: number;
  weightedScore: number;
};

export function buildWorkEvaluationBreakdown(
  metrics: WorkEvaluationMetrics,
  scores: WorkEvaluationScores,
): WorkEvaluationBreakdownRow[] {
  return criterionList().map((key) => {
    const achievementPercent = getCriterionAchievementPercent(key, metrics);
    const graded = achievementPercentToGradeScore(achievementPercent);
    return {
      key,
      targetDisplay: formatKpiTarget(key),
      actualDisplay: formatMetricValue(key, metrics),
      achievementPercent: Math.round(achievementPercent * 10) / 10,
      grade: graded.grade,
      gradeLabel: graded.gradeLabel,
      score: scores[key],
      weightPercent: WORK_EVALUATION_CRITERIA[key].weightPercent,
      weightedScore: getWeightedCriterionScore(scores, key),
    };
  });
}

function criterionScoreFromMetrics(
  key: WorkEvaluationCriterion,
  metrics: WorkEvaluationMetrics,
): number {
  const achievement = getCriterionAchievementPercent(key, metrics);
  return achievementPercentToGradeScore(achievement).score;
}

export function computeAutoEvaluationScores(
  _data: AppData,
  _evaluatee: User,
  metrics = computeEvaluationMetrics(_data, _evaluatee),
): WorkEvaluationScores {
  return {
    executionProgress: criterionScoreFromMetrics("executionProgress", metrics),
    extensionRate: criterionScoreFromMetrics("extensionRate", metrics),
    contractVolume: criterionScoreFromMetrics("contractVolume", metrics),
  };
}

export function calcOverallScore(scores: WorkEvaluationScores): number {
  const weighted =
    scores.executionProgress * WORK_EVALUATION_WEIGHTS.executionProgress +
    scores.extensionRate * WORK_EVALUATION_WEIGHTS.extensionRate +
    scores.contractVolume * WORK_EVALUATION_WEIGHTS.contractVolume;
  return Math.round(weighted * 10) / 10;
}

export function normalizeWorkEvaluationScores(
  scores: Partial<WorkEvaluationScores>,
): WorkEvaluationScores {
  const clamp = (value: number | undefined) =>
    clampScore(value ?? WORK_EVALUATION_SCORE_MAX / 2);

  return {
    executionProgress: clamp(scores.executionProgress),
    extensionRate: clamp(scores.extensionRate),
    contractVolume: clamp(scores.contractVolume),
  };
}

export function resolveWorkEvaluationDraft(
  data: AppData,
  evaluatee: User,
  saved?: WorkEvaluation,
) {
  void saved;
  const metrics = computeEvaluationMetrics(data, evaluatee);
  const autoScores = computeAutoEvaluationScores(data, evaluatee, metrics);

  return {
    metrics,
    scores: autoScores,
    overallScore: calcOverallScore(autoScores),
  };
}

export function getEvaluationTargets(
  data: AppData,
  role: UserRole,
  userId: string,
): User[] {
  if (!canSubmitWorkEvaluation(role)) return [];

  const current = data.users.find((user) => user.id === userId);
  if (!current) return [];

  if (role === "ceo") {
    return sortEvaluatees(
      data.users.filter(
        (user) => user.role === "staff" || user.role === "team_leader",
      ),
      userId,
    );
  }

  if (role === "team_leader") {
    const teamId = current.teamId;
    if (!teamId) return [current];
    const members = data.users.filter(
      (user) =>
        user.teamId === teamId &&
        (user.role === "staff" || user.id === userId),
    );
    return sortEvaluatees(members, userId);
  }

  if (role === "executive") {
    const teamIds = new Set(
      data.teams.filter((team) => team.executiveId === userId).map((team) => team.id),
    );
    const members = data.users.filter(
      (user) =>
        user.teamId &&
        teamIds.has(user.teamId) &&
        (user.role === "staff" || user.role === "team_leader"),
    );
    return sortEvaluatees(members, userId);
  }

  return [];
}

function sortEvaluatees(users: User[], evaluatorId: string): User[] {
  return [...users].sort((a, b) => {
    if (a.id === evaluatorId) return -1;
    if (b.id === evaluatorId) return 1;
    return a.name.localeCompare(b.name, "ko");
  });
}

/** 업무평가 대상·목록 정렬 키 */
export type WorkEvaluationSortKey =
  | "score_desc"
  | "score_asc"
  | "name_asc"
  | "name_desc"
  | "unsaved_first"
  | "saved_first";

export const WORK_EVALUATION_SORT_OPTIONS: {
  value: WorkEvaluationSortKey;
  label: string;
}[] = [
  { value: "score_desc", label: "높은 점수순" },
  { value: "score_asc", label: "낮은 점수순" },
  { value: "name_asc", label: "이름순" },
  { value: "name_desc", label: "이름 역순" },
  { value: "unsaved_first", label: "미저장 우선" },
  { value: "saved_first", label: "저장됨 우선" },
];

export const DEFAULT_WORK_EVALUATION_SORT: WorkEvaluationSortKey = "score_desc";

/** 평가 대상 카드 정렬 — 자동 산출 점수·저장 여부·이름 기준 */
export function sortEvaluationTargets(
  data: AppData,
  targets: User[],
  sortKey: WorkEvaluationSortKey,
  context: { period: string; evaluatorId: string },
): User[] {
  const rows = targets.map((user) => {
    const saved = findWorkEvaluation(
      data.workEvaluations ?? [],
      context.period,
      context.evaluatorId,
      user.id,
    );
    const draft = resolveWorkEvaluationDraft(data, user, saved);
    return {
      user,
      overallScore: draft.overallScore,
      saved: Boolean(saved),
    };
  });

  const byName = (a: (typeof rows)[0], b: (typeof rows)[0]) =>
    a.user.name.localeCompare(b.user.name, "ko");

  const sorted = [...rows].sort((a, b) => {
    switch (sortKey) {
      case "score_desc":
        return b.overallScore - a.overallScore || byName(a, b);
      case "score_asc":
        return a.overallScore - b.overallScore || byName(a, b);
      case "name_asc":
        return byName(a, b);
      case "name_desc":
        return byName(b, a);
      case "unsaved_first":
        return Number(a.saved) - Number(b.saved) || b.overallScore - a.overallScore;
      case "saved_first":
        return Number(b.saved) - Number(a.saved) || b.overallScore - a.overallScore;
      default:
        return b.overallScore - a.overallScore;
    }
  });

  return sorted.map((row) => row.user);
}

/** 저장된 평가 목록 정렬 */
export function sortWorkEvaluations(
  evaluations: WorkEvaluation[],
  data: AppData,
  sortKey: WorkEvaluationSortKey,
): WorkEvaluation[] {
  const rows = evaluations.map((evaluation) => ({
    evaluation,
    name:
      data.users.find((user) => user.id === evaluation.evaluateeId)?.name ??
      evaluation.evaluateeId,
  }));

  const byName = (a: (typeof rows)[0], b: (typeof rows)[0]) =>
    a.name.localeCompare(b.name, "ko");

  return [...rows]
    .sort((a, b) => {
      switch (sortKey) {
        case "score_desc":
          return b.evaluation.overallScore - a.evaluation.overallScore || byName(a, b);
        case "score_asc":
          return a.evaluation.overallScore - b.evaluation.overallScore || byName(a, b);
        case "name_asc":
          return byName(a, b);
        case "name_desc":
          return byName(b, a);
        default:
          return b.evaluation.overallScore - a.evaluation.overallScore;
      }
    })
    .map((row) => row.evaluation);
}

export function findWorkEvaluation(
  evaluations: WorkEvaluation[],
  period: string,
  evaluatorId: string,
  evaluateeId: string,
): WorkEvaluation | undefined {
  return evaluations.find(
    (item) =>
      item.period === period &&
      item.evaluatorId === evaluatorId &&
      item.evaluateeId === evaluateeId,
  );
}

export function getVisibleWorkEvaluations(
  data: AppData,
  role: UserRole,
  userId: string,
  period = currentEvaluationPeriod(),
): WorkEvaluation[] {
  const list = (data.workEvaluations ?? [])
    .filter((item) => item.period === period)
    .map((item) => normalizeWorkEvaluationRecord(data, item));

  if (role === "ceo") {
    return list.sort((a, b) => b.overallScore - a.overallScore);
  }

  if (role === "executive") {
    const teamIds = new Set(
      data.teams.filter((team) => team.executiveId === userId).map((team) => team.id),
    );
    return list
      .filter((item) => {
        const evaluatee = data.users.find((user) => user.id === item.evaluateeId);
        return (
          item.evaluatorId === userId ||
          (evaluatee?.teamId && teamIds.has(evaluatee.teamId))
        );
      })
      .sort((a, b) => b.overallScore - a.overallScore);
  }

  if (role === "team_leader") {
    const teamId = data.users.find((user) => user.id === userId)?.teamId;
    return list
      .filter((item) => {
        const evaluatee = data.users.find((user) => user.id === item.evaluateeId);
        return item.evaluatorId === userId || evaluatee?.teamId === teamId;
      })
      .sort((a, b) => b.overallScore - a.overallScore);
  }

  return [];
}

export function normalizeWorkEvaluationRecord(
  data: AppData,
  evaluation: WorkEvaluation,
): WorkEvaluation {
  const evaluatee = data.users.find((user) => user.id === evaluation.evaluateeId);
  if (!evaluatee) return evaluation;

  const draft = resolveWorkEvaluationDraft(data, evaluatee, evaluation);
  return {
    ...evaluation,
    metrics: draft.metrics,
    scores: draft.scores,
    overallScore: calcOverallScore(draft.scores),
  };
}

export function getEvaluationScopeLabel(role: UserRole): string {
  switch (role) {
    case "team_leader":
      return "팀원 · 본인 · 실적 자동 평가";
    case "executive":
      return "산하 팀장 · 담당 · 실적 자동 평가";
    case "ceo":
      return "전사 실적 자동 평가";
    default:
      return "업무평가";
  }
}

export function scoreToPercent(value: number): number {
  return Math.round((value / WORK_EVALUATION_SCORE_MAX) * 100);
}

export function getWeightedCriterionScore(
  scores: WorkEvaluationScores,
  key: WorkEvaluationCriterion,
): number {
  return scores[key] * WORK_EVALUATION_WEIGHTS[key];
}

export function scoreBadgeVariant(
  score: number,
): "success" | "warning" | "danger" | "info" {
  const { grade } = getOverallEvaluationGrade(score);
  switch (grade) {
    case "S":
    case "A":
      return "success";
    case "B":
      return "info";
    case "C":
      return "warning";
    default:
      return "danger";
  }
}

export function formatKpiTarget(key: WorkEvaluationCriterion): string {
  switch (key) {
    case "executionProgress":
      return `${WORK_EVALUATION_KPI_TARGETS.executionProgressPercent}%`;
    case "extensionRate":
      return `${WORK_EVALUATION_KPI_TARGETS.extensionRatePercent}%`;
    case "contractVolume":
      return `전사 ${WORK_EVALUATION_KPI_TARGETS.companyRevenueSharePercent}% (기여 ${Math.round(WORK_EVALUATION_STAFF_CONTRIBUTION_FACTOR * 100)}%)`;
  }
}

/** @deprecated computeAutoEvaluationScores 사용 */
export function suggestEvaluationScores(
  data: AppData,
  evaluatee: User,
): WorkEvaluationScores {
  return computeAutoEvaluationScores(data, evaluatee);
}

function clampScore(value: number): number {
  return Math.min(
    WORK_EVALUATION_SCORE_MAX,
    Math.max(1, Math.round(value * 10) / 10),
  );
}

export function buildWorkEvaluationInput(
  input: WorkEvaluationInput,
): Omit<WorkEvaluation, "id"> {
  const scores = normalizeWorkEvaluationScores(input.scores);
  const now = new Date().toISOString().slice(0, 10);
  return {
    ...input,
    scores,
    metrics: input.metrics,
    overallScore: calcOverallScore(scores),
    createdAt: now,
    updatedAt: now,
  };
}

export function formatEvaluateeMeta(
  data: AppData,
  evaluatee: User,
): string {
  const team = evaluatee.teamId ? getTeamName(data, evaluatee.teamId) : "팀 미배정";
  const metrics = computeEvaluationMetrics(data, evaluatee);
  if (evaluatee.role === "staff") {
    return `${team} · 담당 ${metrics.contractCount}곳 · ${formatAmount(metrics.contractAmountTotal)}`;
  }
  if (evaluatee.role === "team_leader") {
    return `${team} · 팀장 · ${formatAmount(metrics.contractAmountTotal)}`;
  }
  return team;
}

export function formatAmount(amount: number): string {
  if (amount >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(1)}억`;
  }
  if (amount >= 10_000) {
    return `${Math.round(amount / 10_000)}만`;
  }
  return amount.toLocaleString("ko-KR");
}

export function formatMetricValue(
  key: WorkEvaluationCriterion,
  metrics: WorkEvaluationMetrics,
): string {
  switch (key) {
    case "executionProgress":
      return `${metrics.executionProgressPercent.toFixed(1)}%`;
    case "extensionRate":
      return `${metrics.extensionRatePercent.toFixed(1)}%`;
    case "contractVolume":
      return `${formatAmount(metrics.contractAmountTotal)} · 전사 ${metrics.companyRevenueSharePercent.toFixed(1)}% (기여 ${Math.round(WORK_EVALUATION_STAFF_CONTRIBUTION_FACTOR * 100)}%)`;
  }
}

export function criterionList(): WorkEvaluationCriterion[] {
  return Object.keys(WORK_EVALUATION_CRITERIA) as WorkEvaluationCriterion[];
}

export function getEvaluatorName(data: AppData, evaluation: WorkEvaluation): string {
  return getUserName(data, evaluation.evaluatorId);
}

export function getEvaluateeName(data: AppData, evaluation: WorkEvaluation): string {
  return getUserName(data, evaluation.evaluateeId);
}
