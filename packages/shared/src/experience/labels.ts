import type { ExperienceSchedulingStatus } from "./types";

/** 체험단 상태 라벨 — ERP·공개 포털 공통 */
export const EXPERIENCE_SCHEDULING_STATUS_LABELS: Record<
  ExperienceSchedulingStatus,
  string
> = {
  draft: "작성 중",
  coordinating: "고객사 조율",
  confirmed: "일정 확정",
  recruiting: "참가자 접수",
  completed: "완료",
  cancelled: "취소",
};
