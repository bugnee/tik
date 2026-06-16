"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatKRW } from "@/lib/finance";
import { DEMO_TODAY } from "@/lib/contract-lifecycle";
import {
  buildMonthGrid,
  entriesDueOnDate,
  entriesOnDate,
  entriesStartingOnDate,
  parseYearMonth,
  shiftMonth,
  STAGE_CALENDAR_COLORS,
  toCalendarEntries,
  type PartnerWorkCalendarEntry,
} from "@/lib/partner-work-calendar-utils";
import type { EnrichedWorkOrder } from "@/lib/work-order-utils";
import { WORK_ORDER_STAGE_LABELS } from "@/lib/work-order-utils";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

type PartnerWorkCalendarProps = {
  orders: EnrichedWorkOrder[];
};

export function PartnerWorkCalendar({ orders }: PartnerWorkCalendarProps) {
  const [month, setMonth] = useState(DEMO_TODAY.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(DEMO_TODAY);

  const entries = useMemo(() => toCalendarEntries(orders), [orders]);
  const cells = useMemo(() => buildMonthGrid(month), [month]);
  const { year, month: monthNum } = parseYearMonth(month);

  const dayEntries = useMemo(
    () => entriesOnDate(entries, selectedDate),
    [entries, selectedDate],
  );
  const startEntries = useMemo(
    () => entriesStartingOnDate(entries, selectedDate),
    [entries, selectedDate],
  );
  const dueEntries = useMemo(
    () => entriesDueOnDate(entries, selectedDate),
    [entries, selectedDate],
  );

  return (
    <Card glow={orders.length > 0}>
      <CardHeader
        title="업무 일정 캘린더"
        subtitle="업무별 시작일 · 마감일 · 기간 표시"
        action={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, -1))}
              className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              aria-label="이전 달"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[96px] text-center text-sm font-medium text-zinc-200">
              {year}년 {monthNum}월
            </span>
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, 1))}
              className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              aria-label="다음 달"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2 text-[10px] text-zinc-500">
        {(
          ["pending_approval", "approved", "delivered", "paid"] as const
        ).map((stage) => (
          <span key={stage} className="inline-flex items-center gap-1">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                STAGE_CALENDAR_COLORS[stage].bar,
              )}
            />
            {STAGE_CALENDAR_COLORS[stage].label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-zinc-500">
        {WEEKDAYS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const dayItems = entriesOnDate(entries, cell.date);
          const isSelected = cell.date === selectedDate;

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => {
                setSelectedDate(cell.date);
                if (!cell.inMonth) {
                  setMonth(cell.date.slice(0, 7));
                }
              }}
              className={cn(
                "min-h-[72px] rounded-lg border p-1 text-left transition-colors sm:min-h-[84px]",
                cell.inMonth
                  ? "border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700"
                  : "border-transparent bg-zinc-950/20 text-zinc-600",
                cell.isToday && "ring-1 ring-cyan-500/40",
                isSelected && "border-cyan-500/50 bg-cyan-500/5",
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium",
                  cell.isToday ? "text-cyan-400" : "text-zinc-400",
                )}
              >
                {cell.day}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayItems.slice(0, 2).map((entry) => (
                  <CalendarRangeBar key={entry.order.id} entry={entry} />
                ))}
                {dayItems.length > 2 && (
                  <p className="text-[9px] text-zinc-600">
                    +{dayItems.length - 2}건
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-zinc-300">
          <CalendarDays className="h-4 w-4 text-zinc-500" />
          <span className="font-medium">{selectedDate}</span>
          <span className="text-zinc-500">· 진행 {dayEntries.length}건</span>
        </div>

        {dayEntries.length === 0 ? (
          <p className="text-sm text-zinc-500">해당 일자에 예정된 업무가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {dayEntries.map((entry) => (
              <CalendarEntryRow key={entry.order.id} entry={entry} />
            ))}
          </div>
        )}

        {(startEntries.length > 0 || dueEntries.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800/80 pt-3 text-[11px]">
            {startEntries.length > 0 && (
              <Badge variant="info">시작 {startEntries.length}건</Badge>
            )}
            {dueEntries.length > 0 && (
              <Badge variant="warning">마감 {dueEntries.length}건</Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function CalendarRangeBar({ entry }: { entry: PartnerWorkCalendarEntry }) {
  const colors = STAGE_CALENDAR_COLORS[entry.order.stage];
  const isStart = entry.startDate === entry.endDate ? false : true;

  return (
    <div
      className={cn("truncate rounded px-1 py-0.5 text-[9px]", colors.bar, "text-zinc-950")}
      title={`${entry.order.clientName} · ${entry.startDate} ~ ${entry.endDate}`}
    >
      {entry.order.clientName.slice(0, 4)}
      {isStart && entry.startDate !== entry.endDate ? "…" : ""}
    </div>
  );
}

function CalendarEntryRow({ entry }: { entry: PartnerWorkCalendarEntry }) {
  const colors = STAGE_CALENDAR_COLORS[entry.order.stage];

  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-zinc-200">
            {entry.order.clientName}
          </p>
          <p className="truncate text-xs text-zinc-500">{entry.order.title}</p>
        </div>
        <span className={cn("shrink-0 text-xs font-medium", colors.text)}>
          {WORK_ORDER_STAGE_LABELS[entry.order.stage]}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-zinc-400">
        시작 <span className="font-medium text-cyan-400/90">{entry.startDate}</span>
        {" · "}
        마감 <span className="font-medium text-amber-400/90">{entry.endDate}</span>
      </p>
      <p className="mt-1 text-[11px] text-zinc-600">
        {formatKRW(entry.order.totalAmount)}
      </p>
    </div>
  );
}
