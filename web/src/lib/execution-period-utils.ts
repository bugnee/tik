import { DEMO_TODAY } from "@/lib/contract-lifecycle";
import {
  dateInContractPeriod,
  type ResolvedContractPeriod,
} from "@/lib/contract-period-utils";
import { getWorkOrderActivityDate } from "@/lib/dashboard-period-utils";
import type { Contract, Execution, WorkOrder } from "@/lib/types";

/** 실행 진행 조회 모드 — contract가 기본(계약 전체 기간) */
export type ExecutionPeriodMode =
  | "contract"
  | "day"
  | "month"
  | "year"
  | "range";

export interface ExecutionPeriodFilterValue {
  mode: ExecutionPeriodMode;
  day: string;
  month: string;
  year: string;
  rangeFrom: string;
  rangeTo: string;
}

export const EXECUTION_PERIOD_MODE_LABELS: Record<ExecutionPeriodMode, string> =
  {
    contract: "계약",
    day: "일",
    month: "월",
    year: "년",
    range: "기간",
  };

/** 계약 기간을 기본값으로 하는 실행 진행 필터 */
export function createDefaultExecutionPeriodFilter(
  contract: Contract,
  today = DEMO_TODAY,
): ExecutionPeriodFilterValue {
  return {
    mode: "contract",
    day: today,
    month: today.slice(0, 7),
    year: today.slice(0, 4),
    rangeFrom: contract.contractStartDate,
    rangeTo: contract.contractEndDate,
  };
}

export function resolveExecutionPeriod(
  filter: ExecutionPeriodFilterValue,
  contract: Contract,
): ResolvedContractPeriod {
  if (filter.mode === "contract") {
    return {
      start: contract.contractStartDate,
      end: contract.contractEndDate,
      label: `계약기간 · ${contract.contractStartDate} ~ ${contract.contractEndDate}`,
    };
  }

  if (filter.mode === "day") {
    return {
      start: filter.day,
      end: filter.day,
      label: filter.day,
    };
  }

  if (filter.mode === "month") {
    const start = `${filter.month}-01`;
    const [y, m] = filter.month.split("-").map(Number);
    const end = new Date(y, m, 0).toISOString().slice(0, 10);
    return {
      start,
      end,
      label: `${filter.month.replace("-", "년 ")}월 · ${start} ~ ${end}`,
      monthKey: filter.month,
    };
  }

  if (filter.mode === "year") {
    const start = `${filter.year}-01-01`;
    const end = `${filter.year}-12-31`;
    return {
      start,
      end,
      label: `${filter.year}년 · ${start} ~ ${end}`,
      yearKey: filter.year,
    };
  }

  return {
    start: filter.rangeFrom,
    end: filter.rangeTo,
    label: `${filter.rangeFrom} ~ ${filter.rangeTo}`,
  };
}

export function workOrderInExecutionPeriod(
  order: WorkOrder,
  period: Pick<ResolvedContractPeriod, "start" | "end">,
): boolean {
  return (
    dateInContractPeriod(order.dueDate, period) ||
    dateInContractPeriod(getWorkOrderActivityDate(order), period) ||
    dateInContractPeriod(order.requestedAt, period)
  );
}

export function filterWorkOrdersInExecutionPeriod(
  orders: WorkOrder[],
  period: Pick<ResolvedContractPeriod, "start" | "end">,
): WorkOrder[] {
  return orders.filter((order) => workOrderInExecutionPeriod(order, period));
}

export function executionInExecutionPeriod(
  execution: Execution,
  period: Pick<ResolvedContractPeriod, "start" | "end">,
): boolean {
  if (dateInContractPeriod(execution.dueDate, period)) return true;
  if (dateInContractPeriod(execution.completedDate, period)) return true;
  if (dateInContractPeriod(execution.enteredAt, period)) return true;

  return execution.postLinks.some((link) =>
    dateInContractPeriod(
      link.completedDate || link.enteredAt || link.dueDate,
      period,
    ),
  );
}

export function filterExecutionsInExecutionPeriod(
  executions: Execution[],
  period: Pick<ResolvedContractPeriod, "start" | "end">,
): Execution[] {
  return executions.filter((execution) =>
    executionInExecutionPeriod(execution, period),
  );
}

/** 기간 내 포스트 링크만 남긴 실행 복사본 (표시용) */
export function scopeExecutionPostLinksToPeriod(
  execution: Execution,
  period: Pick<ResolvedContractPeriod, "start" | "end">,
): Execution {
  const scopedLinks = execution.postLinks.filter((link) =>
    dateInContractPeriod(
      link.completedDate || link.enteredAt || link.dueDate,
      period,
    ),
  );
  if (scopedLinks.length === execution.postLinks.length) return execution;
  return { ...execution, postLinks: scopedLinks };
}

export function experienceEntryInExecutionPeriod(
  date: string | undefined,
  period: Pick<ResolvedContractPeriod, "start" | "end">,
): boolean {
  return dateInContractPeriod(date, period);
}
