import type {
  AppData,
  Contract,
  ContractInput,
  TaskChannelDefinition,
  UserRole,
} from "./types";
import { isLeaderManagedContract } from "./contract-access-utils";
import {
  getContractTargetChannels,
  getContractTargetCount,
} from "./task-channel-utils";

export type ContractTermsChangeMode = "amend" | "renewal";

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

export function termsChangeRecordNote(
  mode: ContractTermsChangeMode,
  renewalMonthCount: number,
): string {
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
