import type { AppData, BonusPolicySettings, Contract, Expense } from "./types";
import { sumPolicyBonuses } from "./bonus-utils";

/**
 * 순이익 = 총매출 − 모든 집행비용 − 성과급 − 소개비
 * - 모든 비용: 입금 여부와 관계없이 전체 원가
 * - 파트너 지급비용: partnerId가 연결된 원가
 */
export interface PLBreakdown {
  totalRevenue: number;
  partnerPaymentCost: number;
  otherCost: number;
  totalCost: number;
  /** 입금 완료된 원가만 (참고용) */
  executionCost: number;
  staffBonus: number;
  teamLeaderBonus: number;
  executiveBonus: number;
  referralFee: number;
  netProfit: number;
}

export function calculatePL(
  contracts: Contract[],
  expenses: Expense[],
  bonusPolicy: BonusPolicySettings,
  data: Pick<AppData, "teams">,
): PLBreakdown {
  const totalRevenue = contracts.reduce((s, c) => s + c.monthlyFee, 0);

  const partnerPaymentCost = expenses
    .filter((e) => e.partnerId)
    .reduce((s, e) => s + e.amount, 0);

  const otherCost = expenses
    .filter((e) => !e.partnerId)
    .reduce((s, e) => s + e.amount, 0);

  const totalCost = partnerPaymentCost + otherCost;

  const executionCost = expenses
    .filter((e) => e.payoutStatus === "paid")
    .reduce((s, e) => s + e.amount, 0);

  const { staffBonus, teamLeaderBonus, executiveBonus } = sumPolicyBonuses(
    contracts,
    bonusPolicy,
    data,
  );

  const referralContracts = contracts.filter((c) => c.hasReferralPromo);
  const referralFee = Math.round(
    referralContracts.reduce((s, c) => s + c.monthlyFee, 0) * 0.1,
  );

  const netProfit =
    totalRevenue -
    totalCost -
    staffBonus -
    teamLeaderBonus -
    executiveBonus -
    referralFee;

  return {
    totalRevenue,
    partnerPaymentCost,
    otherCost,
    totalCost,
    executionCost,
    staffBonus,
    teamLeaderBonus,
    executiveBonus,
    referralFee,
    netProfit,
  };
}

export function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
