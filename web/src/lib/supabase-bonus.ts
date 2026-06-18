import type { BonusPayment, BonusPaymentStage } from "./types";

/** Supabase `bonus_payments` row */
export interface DbBonusPayment {
  id: string;
  contract_id: string;
  period: string;
  staff_id: string;
  staff_bonus_amount: number;
  team_leader_bonus_amount: number;
  executive_bonus_amount: number;
  staff_percent_applied: number;
  team_leader_percent_applied: number;
  executive_percent_applied: number;
  renewal_month_at_request: number;
  total_amount: number;
  client_deposit_date: string;
  closing_deadline: string;
  scheduled_pay_date: string;
  stage: BonusPaymentStage;
  requested_by?: string | null;
  requested_at?: string | null;
  team_leader_approved_by?: string | null;
  team_leader_approved_at?: string | null;
  executive_approved_by?: string | null;
  executive_approved_at?: string | null;
  ceo_approved_by?: string | null;
  ceo_approved_at?: string | null;
  paid_by?: string | null;
  paid_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  created_at: string;
}

export function bonusPaymentToDb(payment: BonusPayment): DbBonusPayment {
  return {
    id: payment.id,
    contract_id: payment.contractId,
    period: payment.period,
    staff_id: payment.staffId,
    staff_bonus_amount: payment.staffBonusAmount,
    team_leader_bonus_amount: payment.teamLeaderBonusAmount,
    executive_bonus_amount: payment.executiveBonusAmount,
    staff_percent_applied: payment.staffPercentApplied,
    team_leader_percent_applied: payment.teamLeaderPercentApplied,
    executive_percent_applied: payment.executivePercentApplied,
    renewal_month_at_request: payment.renewalMonthAtRequest,
    total_amount: payment.totalAmount,
    client_deposit_date: payment.clientDepositDate,
    closing_deadline: payment.closingDeadline,
    scheduled_pay_date: payment.scheduledPayDate,
    stage: payment.stage,
    requested_by: payment.requestedBy ?? null,
    requested_at: payment.requestedAt ?? null,
    team_leader_approved_by: payment.teamLeaderApprovedBy ?? null,
    team_leader_approved_at: payment.teamLeaderApprovedAt ?? null,
    executive_approved_by: payment.executiveApprovedBy ?? null,
    executive_approved_at: payment.executiveApprovedAt ?? null,
    ceo_approved_by: payment.ceoApprovedBy ?? null,
    ceo_approved_at: payment.ceoApprovedAt ?? null,
    paid_by: payment.paidBy ?? null,
    paid_at: payment.paidAt ?? null,
    rejected_by: payment.rejectedBy ?? null,
    rejected_at: payment.rejectedAt ?? null,
    created_at: payment.createdAt,
  };
}

export function bonusPaymentFromDb(row: DbBonusPayment): BonusPayment {
  return {
    id: row.id,
    contractId: row.contract_id,
    period: row.period,
    staffId: row.staff_id,
    staffBonusAmount: row.staff_bonus_amount,
    teamLeaderBonusAmount: row.team_leader_bonus_amount,
    executiveBonusAmount: row.executive_bonus_amount,
    staffPercentApplied: row.staff_percent_applied,
    teamLeaderPercentApplied: row.team_leader_percent_applied,
    executivePercentApplied: row.executive_percent_applied,
    renewalMonthAtRequest: row.renewal_month_at_request,
    totalAmount: row.total_amount,
    clientDepositDate: row.client_deposit_date,
    closingDeadline: row.closing_deadline,
    scheduledPayDate: row.scheduled_pay_date,
    stage: row.stage,
    requestedBy: row.requested_by ?? undefined,
    requestedAt: row.requested_at ?? undefined,
    teamLeaderApprovedBy: row.team_leader_approved_by ?? undefined,
    teamLeaderApprovedAt: row.team_leader_approved_at ?? undefined,
    executiveApprovedBy: row.executive_approved_by ?? undefined,
    executiveApprovedAt: row.executive_approved_at ?? undefined,
    ceoApprovedBy: row.ceo_approved_by ?? undefined,
    ceoApprovedAt: row.ceo_approved_at ?? undefined,
    paidBy: row.paid_by ?? undefined,
    paidAt: row.paid_at ?? undefined,
    rejectedBy: row.rejected_by ?? undefined,
    rejectedAt: row.rejected_at ?? undefined,
    createdAt: row.created_at,
  };
}

export const BONUS_PAYMENTS_TABLE = "bonus_payments" as const;
