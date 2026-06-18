import { DEMO_TODAY } from "@/lib/contract-lifecycle";
import {
  contractRecordMatchesPeriod,
  getPeriodMonthKey,
  type PeriodFilterValue,
} from "@/lib/dashboard-period-utils";
import type { AppData, Contract, ContractRecord } from "@/lib/types";

export type MonthlyContractCategory = "new" | "extension" | "terminated";

export interface MonthlyContractStatusSummary {
  monthKey: string;
  totalOperating: number;
  newCount: number;
  extensionCount: number;
  terminatedCount: number;
  newContracts: Contract[];
  extensionContracts: Contract[];
  terminatedContracts: Contract[];
}

export const MONTHLY_CONTRACT_CATEGORY_LABELS: Record<
  MonthlyContractCategory,
  string
> = {
  new: "신규 계약",
  extension: "연장",
  terminated: "종료",
};

export function currentMonthKey(today = DEMO_TODAY): string {
  return today.slice(0, 7);
}

export function formatContractMonthLabel(period: string): string {
  const [year, month] = period.split("-");
  return `${year}년 ${Number(month)}월`;
}

function priorMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isNewContractEvent(
  records: ContractRecord[],
  record: ContractRecord,
  monthKey: string,
): boolean {
  if (record.period !== monthKey) return false;
  if (record.isExtension || record.terminationReason) return false;
  if (record.note === "신규 계약") return true;
  const hasEarlier = records.some(
    (r) => r.contractId === record.contractId && r.period < monthKey,
  );
  return !hasEarlier && record.startedAt.startsWith(monthKey);
}

function isExtensionEvent(
  records: ContractRecord[],
  record: ContractRecord,
  monthKey: string,
): boolean {
  if (record.period !== monthKey || !record.isExtension) return false;
  if (
    record.note?.includes("재계약") ||
    record.note?.includes("해지 후 재계약") ||
    record.note === "재계약 조건 반영"
  ) {
    return true;
  }
  const prev = records.find(
    (r) =>
      r.contractId === record.contractId &&
      r.period === priorMonthKey(monthKey),
  );
  return Boolean(prev && !prev.isExtension);
}

function isTerminatedEvent(
  record: ContractRecord,
  contract: Contract | undefined,
  monthKey: string,
  periodFilter: PeriodFilterValue,
): boolean {
  if (record.period === monthKey && record.terminationReason) return true;
  if (periodFilter.mode === "year") {
    return Boolean(contract?.terminatedAt?.startsWith(periodFilter.year));
  }
  if (contract?.terminatedAt?.startsWith(monthKey)) return true;
  return false;
}

export function calcMonthlyContractStatus(
  data: AppData,
  periodFilter: PeriodFilterValue,
): MonthlyContractStatusSummary {
  const { contracts, contractRecords } = data;
  const contractById = new Map(contracts.map((c) => [c.id, c]));
  const monthKey = getPeriodMonthKey(periodFilter);
  const monthRecords = contractRecords.filter((record) =>
    contractRecordMatchesPeriod(record, periodFilter),
  );

  const newIds = new Set<string>();
  const extensionIds = new Set<string>();
  const terminatedIds = new Set<string>();

  for (const record of monthRecords) {
    const contract = contractById.get(record.contractId);
    const eventMonth = record.period;
    if (isNewContractEvent(contractRecords, record, eventMonth)) {
      newIds.add(record.contractId);
    }
    if (isExtensionEvent(contractRecords, record, eventMonth)) {
      extensionIds.add(record.contractId);
    }
    if (isTerminatedEvent(record, contract, eventMonth, periodFilter)) {
      terminatedIds.add(record.contractId);
    }
  }

  for (const contract of contracts) {
    if (periodFilter.mode === "year") {
      if (contract.terminatedAt?.startsWith(periodFilter.year)) {
        terminatedIds.add(contract.id);
      }
    } else if (contract.terminatedAt?.startsWith(monthKey)) {
      terminatedIds.add(contract.id);
    }
  }

  const operatingIds = new Set(
    monthRecords
      .filter((r) => !r.terminationReason)
      .map((r) => r.contractId),
  );

  const pick = (ids: Set<string>) => contracts.filter((c) => ids.has(c.id));

  return {
    monthKey,
    totalOperating: operatingIds.size,
    newCount: newIds.size,
    extensionCount: extensionIds.size,
    terminatedCount: terminatedIds.size,
    newContracts: pick(newIds),
    extensionContracts: pick(extensionIds),
    terminatedContracts: pick(terminatedIds),
  };
}

export function getMonthlyContractCategoryContracts(
  summary: MonthlyContractStatusSummary,
  category: MonthlyContractCategory,
): Contract[] {
  switch (category) {
    case "new":
      return summary.newContracts;
    case "extension":
      return summary.extensionContracts;
    case "terminated":
      return summary.terminatedContracts;
  }
}
