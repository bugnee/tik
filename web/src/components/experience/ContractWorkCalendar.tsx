"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DEMO_TODAY } from "@/lib/contract-lifecycle";
import {
  buildMonthGrid,
  parseYearMonth,
  shiftMonth,
  STAGE_CALENDAR_COLORS,
} from "@/lib/partner-work-calendar-utils";
import {
  buildContractCalendarDayItems,
  countCalendarMarkersOnDate,
} from "@/lib/contract-work-calendar-utils";
import { enrichWorkOrder, WORK_ORDER_STAGE_LABELS } from "@/lib/work-order-utils";
import type { AppData, ExperienceCampaign } from "@/lib/types";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function ContractWorkCalendar({
  data,
  contractId,
  workOrderIds,
  experienceCampaigns,
  title = "업무 · 체험단 일정",
  subtitle = "집행 업무 기간 · 확정 체험일 · 조율 중 제안",
}: {
  data: AppData;
  contractId: string;
  workOrderIds?: string[];
  experienceCampaigns: ExperienceCampaign[];
  title?: string;
  subtitle?: string;
}) {
  const [month, setMonth] = useState(DEMO_TODAY.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(DEMO_TODAY);

  const enrichedOrders = useMemo(() => {
    let orders = data.workOrders.filter(
      (o) =>
        o.contractId === contractId &&
        o.stage !== "draft" &&
        o.stage !== "rejected",
    );
    if (workOrderIds?.length) {
      orders = orders.filter((o) => workOrderIds.includes(o.id));
    }
    return orders.map((o) => enrichWorkOrder(data, o));
  }, [data, contractId, workOrderIds]);

  const cells = useMemo(() => buildMonthGrid(month), [month]);
  const { year, month: monthNum } = parseYearMonth(month);

  const dayItems = useMemo(
    () =>
      buildContractCalendarDayItems(
        enrichedOrders,
        experienceCampaigns,
        selectedDate,
      ),
    [enrichedOrders, experienceCampaigns, selectedDate],
  );

  return (
    <Card glow>
      <CardHeader
        title={title}
        subtitle={subtitle}
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

      <div className="mb-3 flex flex-wrap gap-3 text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          체험 확정
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-violet-500" />
          일정 제안
        </span>
        {(["pending_approval", "approved", "delivered"] as const).map(
          (stage) => (
            <span key={stage} className="inline-flex items-center gap-1">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  STAGE_CALENDAR_COLORS[stage].bar,
                )}
              />
              업무 {STAGE_CALENDAR_COLORS[stage].label}
            </span>
          ),
        )}
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
          const markerCount = countCalendarMarkersOnDate(
            enrichedOrders,
            experienceCampaigns,
            cell.date,
          );
          const selected = cell.date === selectedDate;
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => setSelectedDate(cell.date)}
              className={cn(
                "relative flex min-h-[52px] flex-col items-center rounded-lg border px-0.5 py-1 text-[11px] transition-colors",
                cell.inMonth ? "border-zinc-800/80" : "border-transparent opacity-40",
                selected
                  ? "border-cyan-500/50 bg-cyan-500/10"
                  : "hover:border-zinc-700 hover:bg-zinc-900/60",
                cell.isToday && !selected && "ring-1 ring-emerald-500/40",
              )}
            >
              <span
                className={cn(
                  "font-medium",
                  cell.isToday ? "text-emerald-400" : "text-zinc-300",
                )}
              >
                {cell.day}
              </span>
              {markerCount > 0 && (
                <span className="mt-1 flex gap-0.5">
                  {Array.from({ length: Math.min(markerCount, 3) }).map(
                    (_, i) => (
                      <span
                        key={i}
                        className="h-1 w-1 rounded-full bg-cyan-400/80"
                      />
                    ),
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
        <p className="mb-3 text-xs font-medium text-zinc-400">
          {selectedDate} 일정
        </p>
        {dayItems.length === 0 ? (
          <p className="text-sm text-zinc-600">등록된 일정이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {dayItems.map((item, idx) => (
              <li
                key={`${item.kind}-${idx}`}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs ring-1 ring-inset",
                  item.colorClass,
                )}
              >
                <p className="font-medium">{item.label}</p>
                {item.sublabel && (
                  <p className="mt-0.5 opacity-80">{item.sublabel}</p>
                )}
                {item.workEntry && (
                  <Badge variant="default" className="mt-1.5 text-[10px]">
                    {WORK_ORDER_STAGE_LABELS[item.workEntry.order.stage]}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
