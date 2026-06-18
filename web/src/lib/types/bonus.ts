export type BonusPaymentStage =
  | "pending_staff"
  | "pending_team_leader"
  | "pending_executive"
  | "pending_ceo"
  | "ceo_confirmed"
  | "paid"
  | "rejected";

/** CEO→임원→팀장→담당 성과급 % 한도 (상위 한도 내에서만 하위 설정 가능) */
export interface BonusPolicySettings {
  /** CEO가 임원별로 설정하는 임직원 성과금 한도 (%) */
  executiveMaxPercent: Record<string, number>;
  /** 임원이 팀장별로 설정하는 담당 배분 한도 (%) */
  teamLeaderMaxPercent: Record<string, number>;
  /** 팀장이 담당별로 설정하는 성과급 (%) */
  staffPercent: Record<string, number>;
}

export interface BonusPayment {
  id: string;
  contractId: string;
  period: string;
  staffId: string;
  staffBonusAmount: number;
  teamLeaderBonusAmount: number;
  executiveBonusAmount: number;
  staffPercentApplied: number;
  teamLeaderPercentApplied: number;
  executivePercentApplied: number;
  renewalMonthAtRequest: number;
  totalAmount: number;
  /** 성과급 산정 기준 업체 입금일 */
  clientDepositDate: string;
  /** 정산 마감일 (매월 15일) — 해당 주기 확정 기한 */
  closingDeadline: string;
  /** 급여 합산 지급 예정일 (매월 25일) */
  scheduledPayDate: string;
  stage: BonusPaymentStage;
  requestedBy?: string;
  requestedAt?: string;
  teamLeaderApprovedBy?: string;
  teamLeaderApprovedAt?: string;
  executiveApprovedBy?: string;
  executiveApprovedAt?: string;
  ceoApprovedBy?: string;
  ceoApprovedAt?: string;
  paidBy?: string;
  paidAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  createdAt: string;
}

export const BONUS_ELIGIBILITY_MIN_RENEWAL_MONTHS = 4;

/** 입금 확인 후 익월 정산 주기 반영 */
export const BONUS_PAYMENT_DELAY_MONTHS = 1;

/** UI 안내용 (입금 → 익월 정산) */
export const BONUS_PAYMENT_DELAY_LABEL = "익월";

/** 성과급 정산 마감일 (매월) */
export const BONUS_MONTHLY_CLOSING_DAY = 15;

/** 급여 합산 지급일 (매월) */
export const BONUS_SALARY_PAY_DAY = 25;

/** 성과급 금액 표기 */
export const BONUS_AMOUNT_TAX_LABEL = "(세전)";

export const BONUS_PAY_SCHEDULE_SUMMARY =
  "매월 15일 마감 · 25일 급여 합산 지급";

export const BONUS_PAY_POLICY_NOTICE =
  "성과급(세전)은 업체 광고비 입금 확인 후 익월 정산되며, 매월 15일까지 마감·확정 후 해당 월 25일 급여에 합산 지급됩니다.";
