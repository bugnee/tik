import type {
  AppData,
  BonusPayment,
  BonusPolicySettings,
  Contract,
} from "./types";
import { isLeaderManagedContract } from "./contract-access-utils";
import {
  BONUS_ELIGIBILITY_MIN_RENEWAL_MONTHS,
  BONUS_PAYMENT_DELAY_DAYS,
  BONUS_PAY_POLICY_NOTICE,
} from "./types";

export { BONUS_PAY_POLICY_NOTICE, BONUS_PAYMENT_DELAY_DAYS };

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function calcScheduledPayDate(clientDepositDate: string): string {
  return addDays(clientDepositDate, BONUS_PAYMENT_DELAY_DAYS);
}

export function isBonusPayDue(
  scheduledPayDate: string,
  referenceDate = todayISO(),
): boolean {
  return scheduledPayDate <= referenceDate;
}

export function daysUntilScheduledPay(
  scheduledPayDate: string,
  referenceDate = todayISO(),
): number {
  const ref = new Date(`${referenceDate}T12:00:00`);
  const target = new Date(`${scheduledPayDate}T12:00:00`);
  return Math.ceil((target.getTime() - ref.getTime()) / 86_400_000);
}

export function formatBonusPayScheduleLabel(
  clientDepositDate: string,
  scheduledPayDate: string,
): string {
  return `업체 입금 ${clientDepositDate} → 지급 예정 ${scheduledPayDate}`;
}

export function getBonusPayStatusMessage(
  scheduledPayDate: string,
  referenceDate = todayISO(),
): string {
  if (isBonusPayDue(scheduledPayDate, referenceDate)) {
    return `지급 가능 (예정일 ${scheduledPayDate})`;
  }
  const daysLeft = daysUntilScheduledPay(scheduledPayDate, referenceDate);
  return `지급 예정 ${scheduledPayDate} (D-${daysLeft})`;
}

export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function isBonusEligible(contract: Contract): boolean {
  return (
    contract.isExtension &&
    contract.status === "active" &&
    contract.renewalMonthCount >= BONUS_ELIGIBILITY_MIN_RENEWAL_MONTHS
  );
}

export function getEligibilityMessage(contract: Contract): string {
  if (!contract.isExtension) return "연장(재계약) 계약만 성과급 대상입니다.";
  if (contract.renewalMonthCount < BONUS_ELIGIBILITY_MIN_RENEWAL_MONTHS) {
    return `재계약 3개월 이상 후 ${BONUS_ELIGIBILITY_MIN_RENEWAL_MONTHS}월차부터 지급 가능 (현재 ${contract.renewalMonthCount}월차)`;
  }
  if (!contract.lastClientDepositDate) {
    return "업체 입금일 등록 후 지급 신청 가능";
  }
  const scheduled = calcScheduledPayDate(contract.lastClientDepositDate);
  return `지급 신청 가능 · 예정 지급일 ${scheduled} (입금 + ${BONUS_PAYMENT_DELAY_DAYS}일)`;
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
    return `임원 한도 ${execLimit}%를 초과할 수 없습니다.`;
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
    payment.clientDepositDate ?? contract?.lastClientDepositDate ?? payment.createdAt;
  const scheduledPayDate =
    payment.scheduledPayDate ?? calcScheduledPayDate(clientDepositDate);
  const isPayDue = isBonusPayDue(scheduledPayDate);
  const daysUntilPay = daysUntilScheduledPay(scheduledPayDate);

  return {
    ...payment,
    clientDepositDate,
    scheduledPayDate,
    clientName: contract?.clientName ?? "-",
    staffName: staff?.name ?? "-",
    teamName: team?.name ?? "-",
    monthlyFee: contract?.monthlyFee ?? 0,
    renewalMonthCount: contract?.renewalMonthCount ?? 0,
    isPayDue,
    daysUntilPay,
    payStatusMessage: getBonusPayStatusMessage(scheduledPayDate),
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
