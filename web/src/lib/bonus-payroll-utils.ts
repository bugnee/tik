import type { AppData, BonusPayment, BonusPaymentStage, UserRole } from "./types";
import { ROLE_LABELS } from "./types";
import { addMonths, todayISO } from "./bonus-utils";
import { getUserName } from "./selectors";

/** 급여 합산(25일) 기준 인원별 집계 — 재무·대표·임원 전용 */
export const BONUS_PAYROLL_VIEW_ROLES: UserRole[] = [
  "finance_manager",
  "ceo",
  "executive",
];

const PAYROLL_INCLUDED_STAGES: BonusPaymentStage[] = [
  "pending_executive",
  "pending_ceo",
  "ceo_confirmed",
  "paid",
];

export function canViewBonusPayrollSummary(role: UserRole): boolean {
  return BONUS_PAYROLL_VIEW_ROLES.includes(role);
}

export function payMonthFromScheduledDate(scheduledPayDate: string): string {
  return scheduledPayDate.slice(0, 7);
}

export function currentCalendarMonth(referenceDate = todayISO()): string {
  return referenceDate.slice(0, 7);
}

export function nextCalendarMonth(referenceDate = todayISO()): string {
  return addMonths(referenceDate, 1).slice(0, 7);
}

function isPayrollIncluded(payment: BonusPayment): boolean {
  return PAYROLL_INCLUDED_STAGES.includes(payment.stage);
}

type PayeeSlice = {
  userId: string;
  amount: number;
  tier: "staff" | "team_leader" | "executive";
};

function resolvePayeeSlices(
  data: Pick<AppData, "contracts" | "teams">,
  payment: BonusPayment,
): PayeeSlice[] {
  const contract = data.contracts.find((c) => c.id === payment.contractId);
  const team = contract
    ? data.teams.find((t) => t.id === contract.teamId)
    : undefined;
  const slices: PayeeSlice[] = [];

  if (payment.staffBonusAmount > 0) {
    slices.push({
      userId: payment.staffId,
      amount: payment.staffBonusAmount,
      tier: "staff",
    });
  }
  if (payment.teamLeaderBonusAmount > 0 && team?.leaderId) {
    slices.push({
      userId: team.leaderId,
      amount: payment.teamLeaderBonusAmount,
      tier: "team_leader",
    });
  }
  if (payment.executiveBonusAmount > 0 && team?.executiveId) {
    slices.push({
      userId: team.executiveId,
      amount: payment.executiveBonusAmount,
      tier: "executive",
    });
  }

  return slices;
}

export type BonusPayrollPersonRow = {
  userId: string;
  userName: string;
  role: UserRole;
  roleLabel: string;
  staffTotal: number;
  teamLeaderTotal: number;
  executiveTotal: number;
  grandTotal: number;
  paymentCount: number;
};

export function aggregateBonusPayrollByPerson(
  data: AppData,
  payments: BonusPayment[],
  payMonth: string,
): BonusPayrollPersonRow[] {
  const byUser = new Map<
    string,
    Omit<BonusPayrollPersonRow, "userName" | "role" | "roleLabel">
  >();

  for (const payment of payments) {
    if (!isPayrollIncluded(payment)) continue;
    if (payMonthFromScheduledDate(payment.scheduledPayDate) !== payMonth) {
      continue;
    }

    const slices = resolvePayeeSlices(data, payment);
    const touchedUsers = new Set<string>();

    for (const slice of slices) {
      const existing = byUser.get(slice.userId) ?? {
        userId: slice.userId,
        staffTotal: 0,
        teamLeaderTotal: 0,
        executiveTotal: 0,
        grandTotal: 0,
        paymentCount: 0,
      };

      if (slice.tier === "staff") existing.staffTotal += slice.amount;
      if (slice.tier === "team_leader") {
        existing.teamLeaderTotal += slice.amount;
      }
      if (slice.tier === "executive") {
        existing.executiveTotal += slice.amount;
      }
      existing.grandTotal += slice.amount;
      byUser.set(slice.userId, existing);
      touchedUsers.add(slice.userId);
    }

    for (const userId of touchedUsers) {
      const row = byUser.get(userId);
      if (row) row.paymentCount += 1;
    }
  }

  return Array.from(byUser.values())
    .map((row) => {
      const user = data.users.find((u) => u.id === row.userId);
      const role = user?.role ?? "staff";
      return {
        ...row,
        userName: getUserName(data, row.userId),
        role,
        roleLabel: ROLE_LABELS[role] ?? role,
      };
    })
    .sort((a, b) => b.grandTotal - a.grandTotal);
}

export function sumBonusPayrollRows(rows: BonusPayrollPersonRow[]): number {
  return rows.reduce((sum, row) => sum + row.grandTotal, 0);
}

export function listBonusPayrollMonths(
  payments: BonusPayment[],
  referenceDate = todayISO(),
): string[] {
  const months = new Set<string>();
  months.add(currentCalendarMonth(referenceDate));
  months.add(nextCalendarMonth(referenceDate));

  for (const payment of payments) {
    if (!isPayrollIncluded(payment)) continue;
    months.add(payMonthFromScheduledDate(payment.scheduledPayDate));
  }

  return Array.from(months).sort((a, b) => b.localeCompare(a));
}

export function formatPayMonthLabel(period: string): string {
  const [year, month] = period.split("-");
  return `${year}년 ${Number(month)}월 급여 합산`;
}
