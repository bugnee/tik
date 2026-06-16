import type { Contract, ContractRecord, WorkOrder } from "./types";
import { DEMO_TODAY } from "./contract-lifecycle";
import { calcContractWorkProgress } from "./work-order-utils";
import type { TaskChannelDefinition } from "./types";

export type ContractPeriodViewMode = "cycle30" | "month" | "year";

export interface ContractPeriodSelection {
  mode: ContractPeriodViewMode;
  /** 30일(회차) 모드 — 1부터 시작 */
  cycleIndex: number;
  month: string;
  year: string;
}

export interface BillingCycle {
  index: number;
  start: string;
  end: string;
  period?: string;
  label: string;
}

export interface ResolvedContractPeriod {
  start: string;
  end: string;
  label: string;
  cycleIndex?: number;
  monthKey?: string;
  yearKey?: string;
}

export const CONTRACT_PERIOD_MODE_LABELS: Record<
  ContractPeriodViewMode,
  string
> = {
  cycle30: "30일(회차)",
  month: "월",
  year: "년",
};

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function lastDayOfMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return new Date(y, m, 0).toISOString().slice(0, 10);
}

export function getBillingCycles(
  contract: Contract,
  records: ContractRecord[],
): BillingCycle[] {
  const sorted = [...records].sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  );

  if (sorted.length > 0) {
    return sorted.map((record, i) => ({
      index: i + 1,
      start: record.startedAt,
      end: record.endedAt ?? contract.contractEndDate,
      period: record.period,
      label: `${i + 1}회차 · ${record.startedAt} ~ ${record.endedAt ?? "진행중"}${
        record.period ? ` (${record.period})` : ""
      }`,
    }));
  }

  const count = Math.max(contract.renewalMonthCount, 1);
  return Array.from({ length: count }, (_, i) => {
    const index = i + 1;
    const start = addDays(contract.contractStartDate, (index - 1) * 30);
    const end = addDays(start, 29);
    return {
      index,
      start,
      end,
      label: `${index}회차 (30일) · ${start} ~ ${end}`,
    };
  });
}

export function getCurrentCycleIndex(
  contract: Contract,
  records: ContractRecord[],
  today = DEMO_TODAY,
): number {
  const cycles = getBillingCycles(contract, records);
  const active = cycles.find((c) => today >= c.start && today <= c.end);
  if (active) return active.index;
  return cycles[cycles.length - 1]?.index ?? 1;
}

export function createDefaultContractPeriodSelection(
  contract: Contract,
  records: ContractRecord[],
  today = DEMO_TODAY,
): ContractPeriodSelection {
  return {
    mode: "cycle30",
    cycleIndex: getCurrentCycleIndex(contract, records, today),
    month: today.slice(0, 7),
    year: today.slice(0, 4),
  };
}

export function resolveContractPeriod(
  selection: ContractPeriodSelection,
  contract: Contract,
  records: ContractRecord[],
): ResolvedContractPeriod {
  if (selection.mode === "cycle30") {
    const cycles = getBillingCycles(contract, records);
    const cycle =
      cycles.find((c) => c.index === selection.cycleIndex) ??
      cycles[cycles.length - 1];
    if (!cycle) {
      return {
        start: contract.contractStartDate,
        end: contract.contractEndDate,
        label: `${contract.contractStartDate} ~ ${contract.contractEndDate}`,
        cycleIndex: 1,
      };
    }
    return {
      start: cycle.start,
      end: cycle.end,
      label: cycle.label,
      cycleIndex: cycle.index,
    };
  }

  if (selection.mode === "month") {
    const start = `${selection.month}-01`;
    const end = lastDayOfMonth(selection.month);
    return {
      start,
      end,
      label: `${selection.month.replace("-", "년 ")}월 · ${start} ~ ${end}`,
      monthKey: selection.month,
    };
  }

  const start = `${selection.year}-01-01`;
  const end = `${selection.year}-12-31`;
  return {
    start,
    end,
    label: `${selection.year}년 · ${start} ~ ${end}`,
    yearKey: selection.year,
  };
}

export function dateInContractPeriod(
  date: string | undefined,
  period: Pick<ResolvedContractPeriod, "start" | "end">,
): boolean {
  if (!date) return false;
  return date >= period.start && date <= period.end;
}

export function filterLinksByContractPeriod<
  T extends {
    completedDate?: string;
    enteredAt?: string;
    dueDate?: string;
  },
>(links: T[], period: Pick<ResolvedContractPeriod, "start" | "end">): T[] {
  return links.filter((link) =>
    dateInContractPeriod(
      link.completedDate || link.enteredAt || link.dueDate,
      period,
    ),
  );
}

export function filterWorkOrdersByContractPeriod(
  orders: WorkOrder[],
  period: Pick<ResolvedContractPeriod, "start" | "end">,
): WorkOrder[] {
  return orders.filter((order) => dateInContractPeriod(order.dueDate, period));
}

export function filterActivityByContractPeriod<
  T extends { date: string },
>(items: T[], period: Pick<ResolvedContractPeriod, "start" | "end">): T[] {
  return items.filter((item) => dateInContractPeriod(item.date, period));
}

export function getPeriodProgressRate(
  workOrders: WorkOrder[],
  taskChannels: TaskChannelDefinition[],
  period: Pick<ResolvedContractPeriod, "start" | "end">,
  fallbackPercent: number,
): number {
  const scoped = filterWorkOrdersByContractPeriod(workOrders, period);
  if (scoped.length > 0) {
    return calcContractWorkProgress(scoped, taskChannels).weightedPercent;
  }
  return fallbackPercent;
}

export function getPeriodRemainingDays(
  period: Pick<ResolvedContractPeriod, "end">,
  today = DEMO_TODAY,
): number {
  const end = new Date(`${period.end}T12:00:00`);
  const from = new Date(`${today}T12:00:00`);
  return Math.ceil((end.getTime() - from.getTime()) / 86_400_000);
}

export function contractRecordsForPeriod(
  records: ContractRecord[],
  period: ResolvedContractPeriod,
): ContractRecord[] {
  if (period.cycleIndex != null) {
    const sorted = [...records].sort((a, b) =>
      a.startedAt.localeCompare(b.startedAt),
    );
    const record = sorted[period.cycleIndex - 1];
    return record ? [record] : [];
  }
  if (period.monthKey) {
    return records.filter((r) => r.period === period.monthKey);
  }
  if (period.yearKey) {
    return records.filter((r) => r.period.startsWith(period.yearKey!));
  }
  return records.filter((r) =>
    dateInContractPeriod(r.startedAt, period),
  );
}
