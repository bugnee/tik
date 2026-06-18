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
import { WORK_EVALUATION_CRITERIA } from "@/lib/types";

const INTERNAL_EVALUATOR_ROLES: UserRole[] = [
  "team_leader",
  "executive",
  "ceo",
];

const SUPPLEMENTAL_EVALUATOR_ROLES: UserRole[] = ["executive", "ceo"];

export function canSubmitWorkEvaluation(role: UserRole): boolean {
  return INTERNAL_EVALUATOR_ROLES.includes(role);
}

export function canAddSupplementalEvaluation(role: UserRole): boolean {
  return SUPPLEMENTAL_EVALUATOR_ROLES.includes(role);
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

  return {
    executionProgressPercent: Math.round(executionProgressPercent * 10) / 10,
    extensionRatePercent: Math.round(extensionRatePercent * 10) / 10,
    contractAmountTotal,
    contractCount: contracts.length,
  };
}

function peerContractAmountBenchmark(data: AppData, evaluatee: User): number {
  const peers = data.users.filter((user) => user.role === evaluatee.role);
  const totals = peers.map((user) =>
    computeEvaluationMetrics(data, user).contractAmountTotal,
  );
  return Math.max(...totals, 1);
}

function percentToScore(percent: number): number {
  return clampScore(1 + (Math.min(100, Math.max(0, percent)) / 100) * 4);
}

function contractVolumeToScore(
  data: AppData,
  evaluatee: User,
  totalAmount: number,
): number {
  if (totalAmount <= 0) return 1;
  const benchmark = peerContractAmountBenchmark(data, evaluatee);
  const ratio = totalAmount / benchmark;
  return clampScore(1 + Math.min(1, ratio) * 4);
}

export function computeAutoEvaluationScores(
  data: AppData,
  evaluatee: User,
  metrics = computeEvaluationMetrics(data, evaluatee),
): WorkEvaluationScores {
  return {
    executionProgress: percentToScore(metrics.executionProgressPercent),
    extensionRate: percentToScore(metrics.extensionRatePercent),
    contractVolume: contractVolumeToScore(
      data,
      evaluatee,
      metrics.contractAmountTotal,
    ),
  };
}

export function calcOverallScore(
  scores: WorkEvaluationScores,
  supplementalScore?: number,
): number {
  const values = [...Object.values(scores)];
  if (supplementalScore != null) {
    values.push(clampScore(supplementalScore));
  }
  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

export function normalizeWorkEvaluationScores(
  scores: Partial<WorkEvaluationScores>,
): WorkEvaluationScores {
  const clamp = (value: number | undefined) => clampScore(value ?? 3);

  return {
    executionProgress: clamp(scores.executionProgress),
    extensionRate: clamp(scores.extensionRate),
    contractVolume: clamp(scores.contractVolume),
  };
}

export function normalizeSupplementalScore(value?: number): number | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  return clampScore(value);
}

export function resolveWorkEvaluationDraft(
  data: AppData,
  evaluatee: User,
  saved?: WorkEvaluation,
) {
  const metrics = computeEvaluationMetrics(data, evaluatee);
  const autoScores = computeAutoEvaluationScores(data, evaluatee, metrics);
  const supplementalScore = saved?.supplementalScore;

  return {
    metrics,
    scores: autoScores,
    supplementalScore,
    overallScore: calcOverallScore(autoScores, supplementalScore),
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
    supplementalScore: evaluation.supplementalScore,
    overallScore: calcOverallScore(draft.scores, evaluation.supplementalScore),
  };
}

export function getEvaluationScopeLabel(role: UserRole): string {
  switch (role) {
    case "team_leader":
      return "팀원 · 본인 · 실적 자동 평가";
    case "executive":
      return "산하 팀장 · 담당 · 자동 + 추가 평가";
    case "ceo":
      return "전사 자동 평가 + 추가 평가";
    default:
      return "업무평가";
  }
}

export function scoreToPercent(value: number): number {
  return Math.round((value / 5) * 100);
}

export function scoreBadgeVariant(
  score: number,
): "success" | "warning" | "danger" | "info" {
  if (score >= 4.2) return "success";
  if (score >= 3.5) return "info";
  if (score >= 2.5) return "warning";
  return "danger";
}

/** @deprecated computeAutoEvaluationScores 사용 */
export function suggestEvaluationScores(
  data: AppData,
  evaluatee: User,
): WorkEvaluationScores {
  return computeAutoEvaluationScores(data, evaluatee);
}

function clampScore(value: number): number {
  return Math.min(5, Math.max(1, Math.round(value * 10) / 10));
}

export function buildWorkEvaluationInput(
  input: WorkEvaluationInput,
): Omit<WorkEvaluation, "id"> {
  const scores = normalizeWorkEvaluationScores(input.scores);
  const supplementalScore = normalizeSupplementalScore(input.supplementalScore);
  const now = new Date().toISOString().slice(0, 10);
  return {
    ...input,
    scores,
    metrics: input.metrics,
    supplementalScore,
    overallScore: calcOverallScore(scores, supplementalScore),
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
      return formatAmount(metrics.contractAmountTotal);
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
