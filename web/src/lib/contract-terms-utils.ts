import type {
  AppData,
  Contract,
  ContractInput,
  TaskChannelDefinition,
  UserRole,
} from "./types";
import { DEMO_TODAY } from "./contract-lifecycle";
import { isLeaderManagedContract } from "./contract-access-utils";
import {
  getContractTargetChannels,
  getContractTargetCount,
} from "./task-channel-utils";

/** 최초 계약 시작일 기준 연장·성과급 체크 가능까지 개월 수 */
export const EXTENSION_CONTRACT_MIN_MONTHS_AFTER_START = 3;

function addCalendarMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function getExtensionContractEligibleDate(contractStartDate: string): string {
  return addCalendarMonths(
    contractStartDate,
    EXTENSION_CONTRACT_MIN_MONTHS_AFTER_START,
  );
}

export function canEnableExtensionContractCheckbox(
  contractStartDate: string,
  today = DEMO_TODAY,
): boolean {
  if (!contractStartDate) return false;
  return today >= getExtensionContractEligibleDate(contractStartDate);
}

export function getExtensionContractCheckboxGuide(
  contractStartDate: string,
  today = DEMO_TODAY,
): string {
  if (!contractStartDate) {
    return "계약 시작일 입력 후 안내가 표시됩니다.";
  }
  const eligibleFrom = getExtensionContractEligibleDate(contractStartDate);
  if (canEnableExtensionContractCheckbox(contractStartDate, today)) {
    return "최초 계약 후 3개월 경과 · 연장·성과급 정책 적용 가능";
  }
  return `최초 계약(${contractStartDate}) 후 3개월 · ${eligibleFrom}부터 체크 가능`;
}

export type ContractTermsChangeMode = "amend" | "renewal" | "recontract";

export function canEditContractTerms(
  data: AppData,
  contract: Contract,
  role: UserRole,
  userId: string,
): boolean {
  if (role === "ceo" || role === "executive" || role === "finance_manager") {
    return true;
  }
  if (role === "team_leader") {
    const user = data.users.find((u) => u.id === userId);
    return contract.teamId === user?.teamId;
  }
  if (role === "staff") {
    if (isLeaderManagedContract(data, contract)) return false;
    return contract.assignedStaffId === userId;
  }
  return false;
}

export function hasMaterialTermsChange(
  old: Contract,
  merged: Contract,
  channels: TaskChannelDefinition[],
): boolean {
  if (old.monthlyFee !== merged.monthlyFee) return true;
  if (old.contractStartDate !== merged.contractStartDate) return true;
  if (old.contractEndDate !== merged.contractEndDate) return true;
  if (old.hasPlaceSetting !== merged.hasPlaceSetting) return true;

  for (const channel of getContractTargetChannels(channels)) {
    if (
      getContractTargetCount(old, channel) !==
      getContractTargetCount(merged, channel)
    ) {
      return true;
    }
  }
  return false;
}

export function applyRenewalSideEffects(
  contract: Contract,
  input: Partial<ContractInput>,
): Partial<ContractInput> {
  return {
    ...input,
    isExtension: true,
    renewalMonthCount: Math.max(1, contract.renewalMonthCount + 1),
    clientDepositStatus: "pending",
    lastClientDepositDate: undefined,
  };
}

/** 해지된 계약 재체결 — 성과급 회차·연장 상태 초기화 */
export function applyRecontractAfterTermination(
  _contract: Contract,
  input: Partial<ContractInput>,
): Partial<ContractInput> {
  return {
    ...input,
    status: "active",
    terminationReason: undefined,
    terminatedAt: undefined,
    isExtension: false,
    renewalMonthCount: 1,
    clientDepositStatus: undefined,
    lastClientDepositDate: undefined,
  };
}

export function canRecontractAfterTermination(
  data: AppData,
  contract: Contract,
  role: UserRole,
  userId: string,
): boolean {
  if (contract.status !== "terminated") return false;
  return canEditContractTerms(data, contract, role, userId);
}

export function termsChangeRecordNote(
  mode: ContractTermsChangeMode,
  renewalMonthCount: number,
): string {
  if (mode === "recontract") {
    return "해지 후 재계약 · 성과급 1월차부터";
  }
  return mode === "renewal"
    ? `재계약 · ${renewalMonthCount}월차`
    : "계약 조건 변경";
}

export type ContractTermsFormValues = Pick<
  ContractInput,
  | "monthlyFee"
  | "contractStartDate"
  | "contractEndDate"
  | "hasPlaceSetting"
  | "assignedStaffId"
  | "teamId"
  | "targetOptimized"
  | "targetInfluencer"
  | "targetExperience"
  | "targetInstaCard"
  | "channelTargets"
  | "isExtension"
  | "hasReferralPromo"
  | "referrerPartnerId"
>;

export function contractToTermsForm(contract: Contract): ContractTermsFormValues {
  return {
    monthlyFee: contract.monthlyFee,
    contractStartDate: contract.contractStartDate,
    contractEndDate: contract.contractEndDate,
    hasPlaceSetting: contract.hasPlaceSetting,
    assignedStaffId: contract.assignedStaffId,
    teamId: contract.teamId,
    targetOptimized: contract.targetOptimized,
    targetInfluencer: contract.targetInfluencer,
    targetExperience: contract.targetExperience,
    targetInstaCard: contract.targetInstaCard,
    channelTargets: contract.channelTargets,
    isExtension: contract.isExtension,
    hasReferralPromo: contract.hasReferralPromo,
    referrerPartnerId: contract.referrerPartnerId,
  };
}
