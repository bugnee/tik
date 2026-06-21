import type { AppData, Contract, ContractTermsProposedValues, TaskChannelDefinition, UserRole } from "./types";
import type { ContractTermsChangeMode, ContractTermsFormValues } from "./contract-terms-utils";
import { hasMaterialTermsChange } from "./contract-terms-utils";
import {
  getContractTargetChannels,
  getContractTargetCount,
} from "./task-channel-utils";

/** 팀장·임원·대표 — 조건 변경 즉시 적용 가능 */
export function canDirectApplyContractTerms(role: UserRole): boolean {
  return role === "ceo" || role === "executive" || role === "team_leader";
}

export type TermsFormFieldKey =
  | keyof ContractTermsFormValues
  | `channel:${string}`;

export const TERMS_FIELD_LABELS: Record<string, string> = {
  monthlyFee: "월 광고비",
  contractStartDate: "계약 시작일",
  contractEndDate: "계약 종료일",
  hasPlaceSetting: "플레이스세팅",
  assignedStaffId: "담당자",
  teamId: "담당 팀",
  targetOptimized: "최적화 목표",
  targetInfluencer: "인플루언서 목표",
  targetExperience: "체험단 목표",
  targetInstaCard: "인스타카드 목표",
  targetYoutube: "유튜브 목표",
  targetInstagram: "인스타그램 목표",
  targetClip: "클립 목표",
  targetTiktok: "틱톡 목표",
  isExtension: "연장 계약",
  hasReferralPromo: "리셀러 프로모션",
  referrerPartnerId: "리셀러",
};

export const TERMS_MODE_LABELS: Record<ContractTermsChangeMode, string> = {
  amend: "조건 변경",
  renewal: "재계약",
  recontract: "해지 후 재계약",
};

/** baseline 대비 변경된 필드 키 — UI 하이라이트·결재 요약용 */
export function getTermsFormChangedFields(
  baseline: ContractTermsFormValues,
  proposed: ContractTermsProposedValues,
  channels: TaskChannelDefinition[],
): TermsFormFieldKey[] {
  const changed: TermsFormFieldKey[] = [];
  const scalarKeys: (keyof ContractTermsFormValues)[] = [
    "monthlyFee",
    "contractStartDate",
    "contractEndDate",
    "hasPlaceSetting",
    "assignedStaffId",
    "teamId",
    "isExtension",
    "hasReferralPromo",
    "referrerPartnerId",
  ];

  for (const key of scalarKeys) {
    const baseVal = baseline[key];
    const propVal = proposed[key] ?? baseVal;
    if (baseVal !== propVal) {
      changed.push(key);
    }
  }

  const baselineContract = { ...baseline } as Contract;
  const proposedContract = { ...baseline, ...proposed } as Contract;
  for (const channel of getContractTargetChannels(channels)) {
    if (
      getContractTargetCount(baselineContract, channel) !==
      getContractTargetCount(proposedContract, channel)
    ) {
      changed.push(`channel:${channel.id}`);
    }
  }

  return changed;
}

export function formatChangedFieldsSummary(
  changedFields: TermsFormFieldKey[],
  channels: TaskChannelDefinition[],
): string {
  return changedFields
    .map((key) => {
      if (key.startsWith("channel:")) {
        const channelId = key.slice("channel:".length);
        const channel = channels.find((c) => c.id === channelId);
        return channel ? `${channel.label} 목표` : key;
      }
      return TERMS_FIELD_LABELS[key] ?? key;
    })
    .join(", ");
}

/** 변경 필드 amber 강조 클래스 */
export function getChangedFieldHighlightClass(changed: boolean): string {
  return changed
    ? "border-amber-500/40 bg-amber-500/5 focus:border-amber-500/60 focus:ring-amber-500/20"
    : "";
}

/** 변경 필드 래퍼(체크박스 등) amber 강조 */
export function getChangedFieldWrapperClass(changed: boolean): string {
  return changed
    ? "rounded-xl border border-amber-500/40 bg-amber-500/5 px-3 py-2"
    : "";
}

/** 팀장 결재 필요 여부 — 실무·재무는 상신, 팀장 이상은 즉시 적용 */
export function requiresTermsApproval(
  role: UserRole,
  mode: ContractTermsChangeMode,
  contract: Contract,
  baseline: ContractTermsFormValues,
  proposed: ContractTermsProposedValues,
  channels: TaskChannelDefinition[],
): boolean {
  if (canDirectApplyContractTerms(role)) return false;
  if (mode === "renewal" || mode === "recontract") return true;

  const merged = { ...contract, ...baseline, ...proposed } as Contract;
  return hasMaterialTermsChange(contract, merged, channels);
}

/** 최신 pending 결재 (계약별) */
export function getPendingContractTermsApproval(
  data: AppData,
  contractId: string,
) {
  return [...(data.contractTermsApprovals ?? [])]
    .filter((a) => a.contractId === contractId && a.status === "pending")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}
