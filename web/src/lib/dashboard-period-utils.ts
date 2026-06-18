import { DEMO_TODAY } from "@/lib/contract-lifecycle";
import {
  matchesPeriodDate,
  periodFilterLabel,
  type PeriodFilterValue,
} from "@/lib/date-filter-utils";
import { getCompletionRate } from "@/lib/selectors";
import type {
  AppData,
  Contract,
  ContractRecord,
  Expense,
  TeamRanking,
  WorkOrder,
} from "@/lib/types";
import type { ContractPeriodSelection } from "@/lib/contract-period-utils";

export { periodFilterLabel, type PeriodFilterValue };

export function getPeriodReferenceDate(
  filter: PeriodFilterValue,
  today = DEMO_TODAY,
): string {
  switch (filter.mode) {
    case "day":
      return filter.day;
    case "month": {
      if (filter.month === today.slice(0, 7)) return today;
      const [year, month] = filter.month.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      return `${filter.month}-${String(lastDay).padStart(2, "0")}`;
    }
    case "year":
      return filter.year === today.slice(0, 4) ? today : `${filter.year}-12-31`;
    case "range":
      return filter.rangeTo;
    default:
      return today;
  }
}

export function getPeriodMonthKey(filter: PeriodFilterValue): string {
  switch (filter.mode) {
    case "day":
      return filter.day.slice(0, 7);
    case "month":
      return filter.month;
    case "year":
      return `${filter.year}-01`;
    case "range":
      return filter.rangeFrom.slice(0, 7);
    default:
      return DEMO_TODAY.slice(0, 7);
  }
}

export function contractRecordMatchesPeriod(
  record: ContractRecord,
  filter: PeriodFilterValue,
): boolean {
  if (filter.mode === "month") return record.period === filter.month;
  if (filter.mode === "year") return record.period.startsWith(filter.year);
  return (
    matchesPeriodDate(record.startedAt, filter) ||
    (record.endedAt ? matchesPeriodDate(record.endedAt, filter) : false)
  );
}

export function getContractIdsInPeriod(
  data: AppData,
  filter: PeriodFilterValue,
): Set<string> {
  const ids = new Set<string>();

  for (const record of data.contractRecords) {
    if (contractRecordMatchesPeriod(record, filter)) {
      ids.add(record.contractId);
    }
  }

  for (const contract of data.contracts) {
    if (
      matchesPeriodDate(contract.contractStartDate, filter) ||
      (contract.terminatedAt && matchesPeriodDate(contract.terminatedAt, filter))
    ) {
      ids.add(contract.id);
    }
  }

  return ids;
}

export function filterContractsInPeriod(
  contracts: Contract[],
  contractIds: Set<string>,
): Contract[] {
  return contracts.filter((c) => contractIds.has(c.id));
}

export function getContractFeeInPeriod(
  data: AppData,
  contract: Contract,
  filter: PeriodFilterValue,
): number {
  const record = data.contractRecords.find(
    (r) =>
      r.contractId === contract.id && contractRecordMatchesPeriod(r, filter),
  );
  return record?.monthlyFee ?? contract.monthlyFee;
}

export function getWorkOrderActivityDate(order: WorkOrder): string {
  return (
    order.paidAt ??
    order.deliveredAt ??
    order.approvedAt ??
    order.requestedAt ??
    order.dueDate
  );
}

export function workOrderMatchesPeriod(
  order: WorkOrder,
  filter: PeriodFilterValue,
): boolean {
  return (
    matchesPeriodDate(order.dueDate, filter) ||
    matchesPeriodDate(getWorkOrderActivityDate(order), filter) ||
    matchesPeriodDate(order.requestedAt, filter)
  );
}

export function filterWorkOrdersInPeriod(
  orders: WorkOrder[],
  filter: PeriodFilterValue,
): WorkOrder[] {
  return orders.filter((order) => workOrderMatchesPeriod(order, filter));
}

export function filterExpensesInPeriod(
  expenses: Expense[],
  filter: PeriodFilterValue,
): Expense[] {
  return expenses.filter((expense) =>
    matchesPeriodDate(expense.paymentDueDate, filter),
  );
}

export function getTeamRankingsForContracts(
  data: AppData,
  contracts: Contract[],
  getFee: (contract: Contract) => number = (c) => c.monthlyFee,
): TeamRanking[] {
  return data.teams.map((team) => {
    const teamContracts = contracts.filter((c) => c.teamId === team.id);
    const revenue = teamContracts.reduce((s, c) => s + getFee(c), 0);

    return {
      teamId: team.id,
      teamName: team.name,
      revenue,
      clientCount: teamContracts.length,
      completionRate:
        teamContracts.length > 0
          ? teamContracts.reduce((s, c) => s + getCompletionRate(data, c), 0) /
            teamContracts.length
          : 0,
    };
  });
}

export function dashboardPeriodToContractSelection(
  filter: PeriodFilterValue,
): ContractPeriodSelection {
  const month =
    filter.mode === "month"
      ? filter.month
      : filter.mode === "day"
        ? filter.day.slice(0, 7)
        : filter.mode === "range"
          ? filter.rangeFrom.slice(0, 7)
          : `${filter.year}-${DEMO_TODAY.slice(5, 7)}`;

  const year =
    filter.mode === "year"
      ? filter.year
      : filter.mode === "month"
        ? filter.month.slice(0, 4)
        : month.slice(0, 4);

  if (filter.mode === "year") {
    return { mode: "year", year, month, cycleIndex: 1 };
  }

  return { mode: "month", month, year, cycleIndex: 1 };
}

export function evaluationPeriodFromDashboard(
  filter: PeriodFilterValue,
  today = DEMO_TODAY,
): string {
  if (filter.mode === "month") return filter.month;
  if (filter.mode === "year") return `${filter.year}-${today.slice(5, 7)}`;
  if (filter.mode === "day") return filter.day.slice(0, 7);
  return filter.rangeFrom.slice(0, 7);
}

export interface DashboardPeriodScope {
  periodFilter: PeriodFilterValue;
  periodLabel: string;
  referenceDate: string;
  monthKey: string;
  contractIds: Set<string>;
  expenses: Expense[];
  workOrders: WorkOrder[];
  getContractFee: (contract: Contract) => number;
}

export function buildDashboardPeriodScope(
  data: AppData,
  periodFilter: PeriodFilterValue,
): DashboardPeriodScope {
  const contractIds = getContractIdsInPeriod(data, periodFilter);

  return {
    periodFilter,
    periodLabel: periodFilterLabel(periodFilter),
    referenceDate: getPeriodReferenceDate(periodFilter),
    monthKey: getPeriodMonthKey(periodFilter),
    contractIds,
    expenses: filterExpensesInPeriod(data.expenses, periodFilter),
    workOrders: filterWorkOrdersInPeriod(data.workOrders, periodFilter),
    getContractFee: (contract) =>
      getContractFeeInPeriod(data, contract, periodFilter),
  };
}
