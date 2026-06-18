import type { WorkOrder, WorkOrderStage } from "./types";
import type { EnrichedWorkOrder } from "./work-order-utils";
import { DEMO_TODAY } from "./contract-lifecycle";

export interface PartnerWorkCalendarEntry {
  order: EnrichedWorkOrder;
  startDate: string;
  endDate: string;
}

export function getWorkOrderStartDate(order: WorkOrder): string {
  return order.approvedAt ?? order.requestedAt ?? order.createdAt;
}

export function getWorkOrderEndDate(order: WorkOrder): string {
  return order.dueDate;
}

export function toCalendarEntries(
  orders: EnrichedWorkOrder[],
): PartnerWorkCalendarEntry[] {
  return orders.map((order) => ({
    order,
    startDate: getWorkOrderStartDate(order),
    endDate: getWorkOrderEndDate(order),
  }));
}

export function isDateInRange(
  date: string,
  start: string,
  end: string,
): boolean {
  return date >= start && date <= end;
}

export function entriesOnDate(
  entries: PartnerWorkCalendarEntry[],
  date: string,
): PartnerWorkCalendarEntry[] {
  return entries.filter((entry) =>
    isDateInRange(date, entry.startDate, entry.endDate),
  );
}

export function entriesStartingOnDate(
  entries: PartnerWorkCalendarEntry[],
  date: string,
): PartnerWorkCalendarEntry[] {
  return entries.filter((entry) => entry.startDate === date);
}

export function entriesDueOnDate(
  entries: PartnerWorkCalendarEntry[],
  date: string,
): PartnerWorkCalendarEntry[] {
  return entries.filter((entry) => entry.endDate === date);
}

export function parseYearMonth(isoMonth: string): { year: number; month: number } {
  const [y, m] = isoMonth.split("-").map(Number);
  return { year: y, month: m };
}

export function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth(isoMonth: string, delta: number): string {
  const { year, month } = parseYearMonth(isoMonth);
  const d = new Date(year, month - 1 + delta, 1);
  return formatYearMonth(d.getFullYear(), d.getMonth() + 1);
}

export interface CalendarDayCell {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

export function buildMonthGrid(
  isoMonth: string,
  today = DEMO_TODAY,
): CalendarDayCell[] {
  const { year, month } = parseYearMonth(isoMonth);
  const first = new Date(year, month - 1, 1);
  const startOffset = first.getDay();
  const gridStart = new Date(year, month - 1, 1 - startOffset);
  const cells: CalendarDayCell[] = [];

  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    cells.push({
      date,
      day: d.getDate(),
      inMonth: d.getMonth() === month - 1,
      isToday: date === today,
    });
  }

  return cells;
}

export const STAGE_CALENDAR_COLORS: Record<
  WorkOrderStage,
  { bar: string; text: string; label: string }
> = {
  draft: {
    bar: "bg-zinc-600",
    text: "text-zinc-400",
    label: "준비",
  },
  pending_approval: {
    bar: "bg-amber-500",
    text: "text-amber-400",
    label: "승인대기",
  },
  pending_staff_confirm: {
    bar: "bg-violet-500",
    text: "text-violet-400",
    label: "담당확인",
  },
  approved: {
    bar: "bg-cyan-500",
    text: "text-cyan-400",
    label: "진행",
  },
  delivered: {
    bar: "bg-emerald-500",
    text: "text-emerald-400",
    label: "입금대기",
  },
  paid: {
    bar: "bg-emerald-600",
    text: "text-emerald-500",
    label: "입금완료",
  },
  order_ready: {
    bar: "bg-zinc-500",
    text: "text-zinc-400",
    label: "완료",
  },
  rejected: {
    bar: "bg-rose-500",
    text: "text-rose-400",
    label: "반려",
  },
  cancelled: {
    bar: "bg-zinc-600",
    text: "text-zinc-400",
    label: "취소",
  },
  on_hold: {
    bar: "bg-violet-500",
    text: "text-violet-400",
    label: "보류",
  },
  postponed: {
    bar: "bg-orange-500",
    text: "text-orange-400",
    label: "연기",
  },
};
