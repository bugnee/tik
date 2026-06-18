/** 워크오더 반려 사유 — 선택형 + 기타 직접 입력 */
export const WORK_ORDER_REJECT_REASON_OTHER = "other" as const;

export type WorkOrderRejectReasonOption = {
  id: string;
  label: string;
};

export const PARTNER_WORK_REJECT_REASONS: WorkOrderRejectReasonOption[] = [
  { id: "condition_mismatch", label: "조건 불일치 (단가·범위·채널)" },
  { id: "schedule_unavailable", label: "일정 불가 · 마감 맞추기 어려움" },
  { id: "cost_adjustment", label: "견적·비용 재조율 필요" },
  { id: "capacity_full", label: "당월 제작·섭외 용량 초과" },
  { id: "content_policy", label: "업종·콘텐츠 정책상 진행 불가" },
  { id: WORK_ORDER_REJECT_REASON_OTHER, label: "기타 (직접 입력)" },
];

export const STAFF_WORK_REJECT_REASONS: WorkOrderRejectReasonOption[] = [
  { id: "partner_terms", label: "파트너 조건·견적 재협의 필요" },
  { id: "client_request", label: "고객사 요청으로 보류" },
  { id: "internal_review", label: "내부 검토 후 재요청 예정" },
  { id: "schedule_change", label: "일정·마감 변경 필요" },
  { id: WORK_ORDER_REJECT_REASON_OTHER, label: "기타 (직접 입력)" },
];

export function resolveWorkOrderRejectReason(
  presetId: string,
  customText: string,
  options: WorkOrderRejectReasonOption[],
): string | null {
  if (!presetId) return null;
  if (presetId === WORK_ORDER_REJECT_REASON_OTHER) {
    const trimmed = customText.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return options.find((option) => option.id === presetId)?.label ?? null;
}
