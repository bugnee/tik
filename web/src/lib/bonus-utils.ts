import type {
  AppData,
  BonusPayment,
  BonusPolicySettings,
  Contract,
  UserRole,
} from "./types";
import { isLeaderManagedContract } from "./contract-access-utils";
import {
  BONUS_AMOUNT_TAX_LABEL,
  BONUS_ELIGIBILITY_MIN_RENEWAL_MONTHS,
  BONUS_MONTHLY_CLOSING_DAY,
  BONUS_PAYMENT_DELAY_LABEL,
  BONUS_PAYMENT_DELAY_MONTHS,
  BONUS_PAY_POLICY_NOTICE,
  BONUS_PAY_SCHEDULE_SUMMARY,
  BONUS_SALARY_PAY_DAY,
} from "./types";

export {
  BONUS_AMOUNT_TAX_LABEL,
  BONUS_MONTHLY_CLOSING_DAY,
  BONUS_PAY_POLICY_NOTICE,
  BONUS_PAY_SCHEDULE_SUMMARY,
  BONUS_PAYMENT_DELAY_LABEL,
  BONUS_PAYMENT_DELAY_MONTHS,
  BONUS_SALARY_PAY_DAY,
};

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function calcBonusSettlementPeriod(clientDepositDate: string): string {
  return addMonths(clientDepositDate, BONUS_PAYMENT_DELAY_MONTHS).slice(0, 7);
}

function dateInSettlementPeriod(period: string, day: number): string {
  const [year, month] = period.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const safeDay = Math.min(day, lastDay);
  return `${period}-${String(safeDay).padStart(2, "0")}`;
}

export function calcBonusClosingDeadline(clientDepositDate: string): string {
  return dateInSettlementPeriod(
    calcBonusSettlementPeriod(clientDepositDate),
    BONUS_MONTHLY_CLOSING_DAY,
  );
}

export function calcScheduledPayDate(clientDepositDate: string): string {
  return dateInSettlementPeriod(
    calcBonusSettlementPeriod(clientDepositDate),
    BONUS_SALARY_PAY_DAY,
  );
}

export function isBonusClosingPassed(
  closingDeadline: string,
  referenceDate = todayISO(),
): boolean {
  return referenceDate > closingDeadline;
}

export function isBonusPayDue(
  scheduledPayDate: string,
  referenceDate = todayISO(),
): boolean {
  return scheduledPayDate <= referenceDate;
}

export function daysUntilDate(
  targetDate: string,
  referenceDate = todayISO(),
): number {
  const ref = new Date(`${referenceDate}T12:00:00`);
  const target = new Date(`${targetDate}T12:00:00`);
  return Math.ceil((target.getTime() - ref.getTime()) / 86_400_000);
}

export function daysUntilScheduledPay(
  scheduledPayDate: string,
  referenceDate = todayISO(),
): number {
  return daysUntilDate(scheduledPayDate, referenceDate);
}

export function formatBonusKRW(amount: number): string {
  return `${new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount)} ${BONUS_AMOUNT_TAX_LABEL}`;
}

export function formatBonusPayScheduleLabel(
  clientDepositDate: string,
  scheduledPayDate: string,
  closingDeadline?: string,
): string {
  const closing =
    closingDeadline ?? calcBonusClosingDeadline(clientDepositDate);
  return `업체 입금 ${clientDepositDate} → 마감 ${closing} → 급여 합산 ${scheduledPayDate}`;
}

export function getBonusPayStatusMessage(
  scheduledPayDate: string,
  closingDeadline?: string,
  referenceDate = todayISO(),
): string {
  const closing = closingDeadline ?? scheduledPayDate;

  if (!isBonusClosingPassed(closing, referenceDate)) {
    const daysLeft = daysUntilDate(closing, referenceDate);
    return `마감 ${closing} (D-${daysLeft}) · 급여 합산 ${scheduledPayDate}`;
  }

  if (isBonusPayDue(scheduledPayDate, referenceDate)) {
    return `급여 합산 지급 가능 (${scheduledPayDate})`;
  }

  const daysLeft = daysUntilDate(scheduledPayDate, referenceDate);
  return `급여 합산 지급 예정 ${scheduledPayDate} (D-${daysLeft})`;
}

export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function isBonusEligible(contract: Contract): boolean {
  return (
    contract.status === "active" &&
    contract.isExtension &&
    contract.renewalMonthCount >= BONUS_ELIGIBILITY_MIN_RENEWAL_MONTHS
  );
}

export function getEligibilityMessage(contract: Contract): string {
  if (contract.status === "terminated") {
    return "계약 해지됨 · 재계약 후 새 시작일 기준 3개월 경과 시 연장 적용, 4월차부터 성과급(세전) 지급 대상";
  }
  if (!contract.isExtension) {
    return "연장(재계약) 계약만 성과급 대상입니다. 최초 계약 3개월 경과 후 연장 전환 필요";
  }
  if (contract.renewalMonthCount < BONUS_ELIGIBILITY_MIN_RENEWAL_MONTHS) {
    return `재계약 3개월 이상 후 ${BONUS_ELIGIBILITY_MIN_RENEWAL_MONTHS}월차부터 지급 가능 (현재 ${contract.renewalMonthCount}월차)`;
  }
  if (!contract.lastClientDepositDate) {
    return "업체 입금일 등록 후 지급 신청 가능";
  }
  const closing = calcBonusClosingDeadline(contract.lastClientDepositDate);
  const scheduled = calcScheduledPayDate(contract.lastClientDepositDate);
  return `지급 신청 가능 · 마감 ${closing} · 급여 합산 ${scheduled} (${BONUS_PAY_SCHEDULE_SUMMARY})`;
}

export function canRequestBonus(contract: Contract): boolean {
  return isBonusEligible(contract) && Boolean(contract.lastClientDepositDate);
}

export function getExecutiveForTeam(
  data: Pick<AppData, "teams">,
  teamId: string,
): string | undefined {
  return data.teams.find((t) => t.id === teamId)?.executiveId;
}

export function getLeaderForStaff(
  data: AppData,
  staffId: string,
): string | undefined {
  const staff = data.users.find((u) => u.id === staffId);
  if (!staff?.teamId) return undefined;
  return data.teams.find((t) => t.id === staff.teamId)?.leaderId;
}

export function getExecutiveLimit(
  policy: BonusPolicySettings,
  executiveId: string,
): number {
  return policy.executiveMaxPercent[executiveId] ?? 0;
}

export function getTeamLeaderLimit(
  policy: BonusPolicySettings,
  leaderId: string,
): number {
  return policy.teamLeaderMaxPercent[leaderId] ?? 0;
}

export function getStaffPercent(
  policy: BonusPolicySettings,
  staffId: string,
): number {
  return policy.staffPercent[staffId] ?? 0;
}

export function validateTeamLeaderLimit(
  data: AppData,
  policy: BonusPolicySettings,
  leaderId: string,
  percent: number,
): string | null {
  const team = data.teams.find((t) => t.leaderId === leaderId);
  if (!team?.executiveId) return "팀 정보를 찾을 수 없습니다.";
  const execLimit = getExecutiveLimit(policy, team.executiveId);
  if (percent > execLimit) {
    return `상위 배분 한도 ${execLimit}%를 초과할 수 없습니다.`;
  }
  return null;
}

export function validateStaffPercent(
  data: AppData,
  policy: BonusPolicySettings,
  staffId: string,
  percent: number,
): string | null {
  const leaderId = getLeaderForStaff(data, staffId);
  if (!leaderId) return "담당자 팀 정보를 찾을 수 없습니다.";
  const leaderLimit = getTeamLeaderLimit(policy, leaderId);
  if (percent > leaderLimit) {
    return `팀장 배분 한도 ${leaderLimit}%를 초과할 수 없습니다.`;
  }
  return null;
}

export function sumPolicyBonuses(
  contracts: Contract[],
  policy: BonusPolicySettings,
  data: Pick<AppData, "teams"> & { users?: AppData["users"] },
) {
  let staffBonus = 0;
  let teamLeaderBonus = 0;
  let executiveBonus = 0;
  for (const c of contracts) {
    if (!isBonusEligible(c)) continue;
    const amounts = calcBonusAmounts(c, policy, data);
    staffBonus += amounts.staffBonusAmount;
    teamLeaderBonus += amounts.teamLeaderBonusAmount;
    executiveBonus += amounts.executiveBonusAmount;
  }
  return { staffBonus, teamLeaderBonus, executiveBonus };
}

export function calcBonusAmounts(
  contract: Contract,
  policy: BonusPolicySettings,
  data: Pick<AppData, "teams"> & { users?: AppData["users"] },
) {
  const assignee = data.users?.find((u) => u.id === contract.assignedStaffId);
  const execId = getExecutiveForTeam(data, contract.teamId);
  const execPct = execId ? getExecutiveLimit(policy, execId) : 0;

  if (assignee?.role === "team_leader") {
    const leaderLimit = getTeamLeaderLimit(policy, contract.assignedStaffId);
    const teamLeaderPct = leaderLimit;
    const executivePct = Math.max(0, execPct - leaderLimit);
    const teamLeaderBonusAmount = Math.round(
      (contract.monthlyFee * teamLeaderPct) / 100,
    );
    const executiveBonusAmount = Math.round(
      (contract.monthlyFee * executivePct) / 100,
    );

    return {
      staffBonusAmount: 0,
      teamLeaderBonusAmount,
      executiveBonusAmount,
      staffPercentApplied: 0,
      teamLeaderPercentApplied: teamLeaderPct,
      executivePercentApplied: executivePct,
      totalAmount: teamLeaderBonusAmount + executiveBonusAmount,
    };
  }

  const staffPct = getStaffPercent(policy, contract.assignedStaffId);
  const team = data.teams.find((t) => t.id === contract.teamId);
  const leaderLimit = team?.leaderId
    ? getTeamLeaderLimit(policy, team.leaderId)
    : staffPct;

  const teamLeaderPct = Math.max(0, leaderLimit - staffPct);
  const executivePct = Math.max(0, execPct - leaderLimit);

  const staffBonusAmount = Math.round((contract.monthlyFee * staffPct) / 100);
  const teamLeaderBonusAmount = Math.round(
    (contract.monthlyFee * teamLeaderPct) / 100,
  );
  const executiveBonusAmount = Math.round(
    (contract.monthlyFee * executivePct) / 100,
  );

  return {
    staffBonusAmount,
    teamLeaderBonusAmount,
    executiveBonusAmount,
    staffPercentApplied: staffPct,
    teamLeaderPercentApplied: teamLeaderPct,
    executivePercentApplied: executivePct,
    totalAmount:
      staffBonusAmount + teamLeaderBonusAmount + executiveBonusAmount,
  };
}

export type BonusAmounts = ReturnType<typeof calcBonusAmounts>;

export type BonusTier = "staff" | "team_leader" | "executive";

/** 결재 단계보다 상위 성과급 구간은 해당 결재권자에게 노출하지 않음 */
export function canSeeBonusTier(
  viewerRole: UserRole,
  tier: BonusTier,
): boolean {
  switch (viewerRole) {
    case "ceo":
    case "finance_manager":
      return true;
    case "executive":
      return tier === "staff" || tier === "team_leader" || tier === "executive";
    case "team_leader":
      return tier === "staff" || tier === "team_leader";
    case "staff":
      return tier === "staff";
    default:
      return false;
  }
}

export function calcVisibleBonusTotal(
  amounts: BonusAmounts,
  viewerRole: UserRole,
): number {
  let total = 0;
  if (canSeeBonusTier(viewerRole, "staff")) {
    total += amounts.staffBonusAmount;
  }
  if (canSeeBonusTier(viewerRole, "team_leader")) {
    total += amounts.teamLeaderBonusAmount;
  }
  if (canSeeBonusTier(viewerRole, "executive")) {
    total += amounts.executiveBonusAmount;
  }
  return total;
}

export function getVisibleBonusTierCells(
  amounts: BonusAmounts,
  viewerRole: UserRole,
): { tier: BonusTier; label: string; value: number }[] {
  const cells: { tier: BonusTier; label: string; value: number }[] = [];
  if (canSeeBonusTier(viewerRole, "staff")) {
    cells.push({
      tier: "staff",
      label: `담당 ${amounts.staffPercentApplied}%`,
      value: amounts.staffBonusAmount,
    });
  }
  if (canSeeBonusTier(viewerRole, "team_leader")) {
    cells.push({
      tier: "team_leader",
      label: `팀장 ${amounts.teamLeaderPercentApplied}%`,
      value: amounts.teamLeaderBonusAmount,
    });
  }
  if (canSeeBonusTier(viewerRole, "executive")) {
    cells.push({
      tier: "executive",
      label: `임직원 ${amounts.executivePercentApplied}%`,
      value: amounts.executiveBonusAmount,
    });
  }
  return cells;
}

export function formatVisibleBonusBreakdown(
  amounts: BonusAmounts,
  viewerRole: UserRole,
): string {
  return getVisibleBonusTierCells(amounts, viewerRole)
    .map((cell) => {
      const pct = cell.label.match(/(\d+(?:\.\d+)?)%/)?.[1] ?? "0";
      return `${cell.label.split(" ")[0]} ${formatBonusKRW(cell.value)} (${pct}%)`;
    })
    .join(" · ");
}

export function createBonusPaymentFromContract(
  contract: Contract,
  policy: BonusPolicySettings,
  data: AppData,
  requestedBy: string,
  period = currentPeriod(),
): Omit<BonusPayment, "id"> {
  const amounts = calcBonusAmounts(contract, policy, data);
  const today = todayISO();
  const clientDepositDate = contract.lastClientDepositDate!;
  const closingDeadline = calcBonusClosingDeadline(clientDepositDate);
  const scheduledPayDate = calcScheduledPayDate(clientDepositDate);
  const assignee = data.users.find((u) => u.id === contract.assignedStaffId);
  const initialStage =
    assignee?.role === "team_leader"
      ? ("pending_executive" as const)
      : ("pending_team_leader" as const);

  return {
    contractId: contract.id,
    period,
    staffId: contract.assignedStaffId,
    ...amounts,
    renewalMonthAtRequest: contract.renewalMonthCount,
    clientDepositDate,
    closingDeadline,
    scheduledPayDate,
    stage: initialStage,
    requestedBy,
    requestedAt: today,
    createdAt: today,
  };
}

export function getPendingBonusForRole(
  payments: BonusPayment[],
  role: "staff" | "team_leader" | "executive" | "ceo" | "finance_manager",
  userId?: string,
): BonusPayment[] {
  switch (role) {
    case "staff":
      return payments.filter(
        (p) =>
          p.requestedBy === userId &&
          !["paid", "rejected"].includes(p.stage),
      );
    case "team_leader":
      return payments.filter((p) => p.stage === "pending_team_leader");
    case "executive":
      return payments.filter((p) => p.stage === "pending_executive");
    case "ceo":
      return payments.filter((p) => p.stage === "pending_ceo");
    case "finance_manager":
      return payments.filter((p) => p.stage === "ceo_confirmed");
    default:
      return [];
  }
}

export function enrichBonusPayment(data: AppData, payment: BonusPayment) {
  const contract = data.contracts.find((c) => c.id === payment.contractId);
  const staff = data.users.find((u) => u.id === payment.staffId);
  const team = contract
    ? data.teams.find((t) => t.id === contract.teamId)
    : undefined;
  const clientDepositDate =
    payment.clientDepositDate ??
    contract?.lastClientDepositDate ??
    payment.createdAt;
  const closingDeadline =
    payment.closingDeadline ?? calcBonusClosingDeadline(clientDepositDate);
  const scheduledPayDate =
    payment.scheduledPayDate ?? calcScheduledPayDate(clientDepositDate);
  const isPayDue = isBonusPayDue(scheduledPayDate);
  const daysUntilPay = daysUntilScheduledPay(scheduledPayDate);
  const isClosingPassed = isBonusClosingPassed(closingDeadline);

  return {
    ...payment,
    clientDepositDate,
    closingDeadline,
    scheduledPayDate,
    clientName: contract?.clientName ?? "-",
    staffName: staff?.name ?? "-",
    teamName: team?.name ?? "-",
    monthlyFee: contract?.monthlyFee ?? 0,
    renewalMonthCount: contract?.renewalMonthCount ?? 0,
    isPayDue,
    isClosingPassed,
    daysUntilPay,
    payStatusMessage: getBonusPayStatusMessage(
      scheduledPayDate,
      closingDeadline,
    ),
  };
}

export function filterBonusForTeamLeader(
  data: AppData,
  payments: BonusPayment[],
  leaderUserId: string,
): BonusPayment[] {
  const team = data.teams.find((t) => t.leaderId === leaderUserId);
  if (!team) return [];
  return payments.filter((p) => {
    const contract = data.contracts.find((c) => c.id === p.contractId);
    if (!contract || contract.teamId !== team.id) return false;
    return !isLeaderManagedContract(data, contract);
  });
}

export function filterBonusForExecutive(
  data: AppData,
  payments: BonusPayment[],
  executiveUserId: string,
): BonusPayment[] {
  const teamIds = data.teams
    .filter((t) => t.executiveId === executiveUserId)
    .map((t) => t.id);
  return payments.filter((p) => {
    const contract = data.contracts.find((c) => c.id === p.contractId);
    return contract && teamIds.includes(contract.teamId);
  });
}

export type EnrichedBonusPayment = ReturnType<typeof enrichBonusPayment>;

export function defaultBonusPolicy(): BonusPolicySettings {
  return {
    executiveMaxPercent: { "u-exec-1": 10 },
    teamLeaderMaxPercent: {
      "u-leader-1": 5,
      "u-leader-2": 5,
    },
    staffPercent: {
      "u-staff-1": 2.5,
      "u-staff-2": 2,
      "u-staff-3": 2.5,
      "u-staff-4": 2,
    },
  };
}
