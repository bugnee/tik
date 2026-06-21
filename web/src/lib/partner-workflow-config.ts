/**
 * 파트너 자체 업무 흐름 (업무요청·승인·결과입력·결제요청) 활성화 여부.
 * false: 담당자가 전부 입력 · 파트너는 조회 + Q&A 소통만 (구조·액션 코드는 유지).
 */
export const PARTNER_SELF_SERVICE_WORKFLOW_ENABLED = false;

/** 담당 제출 시 파트ner 승인·담당 확인 단계 생략 → approved 로 바로 진행 */
export function skipPartnerApprovalStages(): boolean {
  return !PARTNER_SELF_SERVICE_WORKFLOW_ENABLED;
}
