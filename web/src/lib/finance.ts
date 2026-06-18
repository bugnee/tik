import type { AppData, BonusPolicySettings, Contract, Expense } from "./types";
import { sumPolicyBonuses } from "./bonus-utils";

/**
 * 순이익 = 총매출 − 모든 집행비용 − 성과급(세전) − 리셀러 수수료
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

/** 숫자 입력 필드 표시용 — 천 단위 콤마 */
export function formatNumberWithCommas(
  value: number | string | undefined | null,
): string {
  if (value === undefined || value === null || value === "") return "";

  const raw = String(value).replace(/,/g, "");
  if (raw === "-") return "-";

  const negative = raw.startsWith("-");
  const unsigned = negative ? raw.slice(1) : raw;
  if (unsigned === "") return negative ? "-" : "";

  const dotIndex = unsigned.indexOf(".");
  const intPart = dotIndex >= 0 ? unsigned.slice(0, dotIndex) : unsigned;
  const decimalPart = dotIndex >= 0 ? unsigned.slice(dotIndex + 1) : "";

  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatted =
    dotIndex >= 0 ? `${formattedInt}.${decimalPart}` : formattedInt;

  return negative ? `-${formatted}` : formatted;
}

export function stripNumberCommas(value: string): string {
  return value.replace(/,/g, "");
}

export function parseNumberInput(value: string): number {
  const cleaned = stripNumberCommas(value).trim();
  if (cleaned === "" || cleaned === "-") return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sanitizeNumericInput(
  raw: string,
  allowDecimal: boolean,
): string {
  const withoutCommas = stripNumberCommas(raw);
  let result = "";
  let hasDot = false;

  for (let i = 0; i < withoutCommas.length; i += 1) {
    const ch = withoutCommas[i];
    if (ch === "-" && result === "") {
      result += ch;
      continue;
    }
    if (allowDecimal && ch === "." && !hasDot) {
      hasDot = true;
      result += ch;
      continue;
    }
    if (/\d/.test(ch)) {
      result += ch;
    }
  }

  return result;
}
