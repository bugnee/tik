export type WorkEvaluationCriterion =
  | "executionProgress"
  | "extensionRate"
  | "contractVolume";

export interface WorkEvaluationScores {
  executionProgress: number;
  extensionRate: number;
  contractVolume: number;
}

/** 자동 산출 실적 원본 */
export interface WorkEvaluationMetrics {
  executionProgressPercent: number;
  extensionRatePercent: number;
  contractAmountTotal: number;
  contractCount: number;
  /** 전사 활성 계약 월 광고비 대비 담당 비중(%) */
  companyRevenueSharePercent: number;
}

export interface WorkEvaluation {
  id: string;
  period: string;
  evaluateeId: string;
  evaluatorId: string;
  /** 실행 진행율 · 재계약율 · 계약금액 기반 자동 점수 */
  scores: WorkEvaluationScores;
  metrics: WorkEvaluationMetrics;
  overallScore: number;
  comment?: string;
  createdAt: string;
  updatedAt?: string;
}

export type WorkEvaluationInput = Omit<
  WorkEvaluation,
  "id" | "overallScore" | "createdAt" | "updatedAt"
>;

/** 업무평가 항목별·종합 점수 만점 */
export const WORK_EVALUATION_SCORE_MAX = 10;

/** KPI 목표값 — 달성률 산출용 */
export const WORK_EVALUATION_KPI_TARGETS = {
  /** 실행·워크오더 진행률 목표 */
  executionProgressPercent: 100,
  /** 재계약(연장) 비중 목표 */
  extensionRatePercent: 50,
  /** 전사 매출 대비 담당 목표 비중(%) */
  companyRevenueSharePercent: 15,
} as const;

export type WorkEvaluationGrade = "S" | "A" | "B" | "C" | "D" | "E";

/** 달성률 구간별 환산 점수 */
export const WORK_EVALUATION_ACHIEVEMENT_BANDS: {
  minAchievement: number;
  score: number;
  grade: WorkEvaluationGrade;
  label: string;
}[] = [
  { minAchievement: 120, score: 10, grade: "S", label: "탁월" },
  { minAchievement: 110, score: 9, grade: "A", label: "우수" },
  { minAchievement: 100, score: 8, grade: "B", label: "양호" },
  { minAchievement: 90, score: 7, grade: "C", label: "보통" },
  { minAchievement: 80, score: 6, grade: "D", label: "미흡" },
  { minAchievement: 0, score: 4, grade: "E", label: "저조" },
];

/** 종합 점수 → 최종 등급 */
export const WORK_EVALUATION_OVERALL_GRADES: {
  minScore: number;
  grade: WorkEvaluationGrade;
  label: string;
}[] = [
  { minScore: 9, grade: "S", label: "탁월" },
  { minScore: 8, grade: "A", label: "우수" },
  { minScore: 7, grade: "B", label: "양호" },
  { minScore: 6, grade: "C", label: "보통" },
  { minScore: 5, grade: "D", label: "미흡" },
  { minScore: 0, grade: "E", label: "저조" },
];

export const WORK_EVALUATION_WEIGHTS: Record<WorkEvaluationCriterion, number> = {
  executionProgress: 0.5,
  extensionRate: 0.25,
  contractVolume: 0.25,
};

/** 담당 계약금액 → 전사 매출 비중 환산 시 기여도 계수 */
export const WORK_EVALUATION_STAFF_CONTRIBUTION_FACTOR = 0.7;

export const WORK_EVALUATION_CRITERIA: Record<
  WorkEvaluationCriterion,
  { label: string; description: string; weightPercent: number }
> = {
  executionProgress: {
    label: "실행 업무 진행율",
    description: "목표 100% 대비 달성률",
    weightPercent: 50,
  },
  extensionRate: {
    label: "재계약율",
    description: "목표 50% 대비 달성률",
    weightPercent: 25,
  },
  contractVolume: {
    label: "계약금액",
    description: "전사 매출 목표 비중 15% 대비 · 기여 70% 반영",
    weightPercent: 25,
  },
};
