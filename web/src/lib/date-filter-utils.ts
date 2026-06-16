import { DEMO_TODAY } from "@/lib/contract-lifecycle";

export type PeriodMode = "day" | "month" | "year" | "range";

export interface PeriodFilterValue {
  mode: PeriodMode;
  day: string;
  month: string;
  year: string;
  rangeFrom: string;
  rangeTo: string;
}

export function createDefaultPeriodFilter(today = DEMO_TODAY): PeriodFilterValue {
  return {
    mode: "month",
    day: today,
    month: today.slice(0, 7),
    year: today.slice(0, 4),
    rangeFrom: `${today.slice(0, 7)}-01`,
    rangeTo: today,
  };
}

export function matchesPeriodDate(
  date: string | undefined,
  filter: PeriodFilterValue,
): boolean {
  if (!date) return false;
  switch (filter.mode) {
    case "day":
      return date === filter.day;
    case "month":
      return date.startsWith(filter.month);
    case "year":
      return date.startsWith(filter.year);
    case "range":
      return date >= filter.rangeFrom && date <= filter.rangeTo;
    default:
      return true;
  }
}

export function periodFilterLabel(filter: PeriodFilterValue): string {
  switch (filter.mode) {
    case "day":
      return filter.day;
    case "month":
      return `${filter.month.replace("-", "년 ")}월`;
    case "year":
      return `${filter.year}년`;
    case "range":
      return `${filter.rangeFrom} ~ ${filter.rangeTo}`;
    default:
      return "";
  }
}

export const PERIOD_MODE_LABELS: Record<PeriodMode, string> = {
  day: "일",
  month: "월",
  year: "년",
  range: "기간",
};
