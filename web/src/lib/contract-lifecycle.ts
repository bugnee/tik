import type { Contract, PipelineCategory } from "./types";

export const DEMO_TODAY = "2026-06-16";
export const EXTENSION_IMMINENT_DAYS = 14;
export const CONTRACT_ENDING_DAYS = 7;

export function daysUntil(endDate: string, fromDate = DEMO_TODAY): number {
  const end = new Date(`${endDate}T12:00:00`);
  const from = new Date(`${fromDate}T12:00:00`);
  return Math.ceil((end.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function getPipelineCategory(
  contract: Contract,
  today = DEMO_TODAY,
): PipelineCategory {
  if (contract.status === "terminated") return "contract_ending";

  const remaining = daysUntil(contract.contractEndDate, today);

  if (remaining <= CONTRACT_ENDING_DAYS) return "contract_ending";
  if (!contract.isExtension && remaining <= EXTENSION_IMMINENT_DAYS) {
    return "extension_imminent";
  }
  return "in_progress";
}

export function filterByPipeline(
  contracts: Contract[],
  category: PipelineCategory,
  today = DEMO_TODAY,
): Contract[] {
  return contracts.filter(
    (c) => getPipelineCategory(c, today) === category,
  );
}

export function countPipeline(
  contracts: Contract[],
  today = DEMO_TODAY,
): Record<PipelineCategory, number> {
  const counts: Record<PipelineCategory, number> = {
    in_progress: 0,
    extension_imminent: 0,
    contract_ending: 0,
  };
  contracts.forEach((c) => {
    counts[getPipelineCategory(c, today)]++;
  });
  return counts;
}

/** 계약현황 표시 — 진행 중이면 「진행중」, 종료·만료면 종료일 */
export function getContractStatusDisplay(
  contract: Contract,
  today = DEMO_TODAY,
): { label: string; isInProgress: boolean; sortKey: string } {
  if (contract.status === "terminated") {
    const endDate = contract.terminatedAt ?? contract.contractEndDate;
    return { label: endDate, isInProgress: false, sortKey: endDate };
  }

  if (daysUntil(contract.contractEndDate, today) < 0) {
    return {
      label: contract.contractEndDate,
      isInProgress: false,
      sortKey: contract.contractEndDate,
    };
  }

  return { label: "진행중", isInProgress: true, sortKey: "9999-12-31" };
}
