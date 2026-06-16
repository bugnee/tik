"use client";

import { Input } from "@/components/ui/FormFields";
import { cn } from "@/lib/cn";
import {
  PERIOD_MODE_LABELS,
  type PeriodFilterValue,
  type PeriodMode,
} from "@/lib/date-filter-utils";

const MODES: PeriodMode[] = ["day", "month", "year", "range"];

type PeriodFilterBarProps = {
  value: PeriodFilterValue;
  onChange: (value: PeriodFilterValue) => void;
  summary?: string;
  className?: string;
};

export function PeriodFilterBar({
  value,
  onChange,
  summary,
  className,
}: PeriodFilterBarProps) {
  function setMode(mode: PeriodMode) {
    onChange({ ...value, mode });
  }

  function patch(partial: Partial<PeriodFilterValue>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 sm:p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          조회 기간
        </span>
        <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMode(mode)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                value.mode === mode
                  ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300",
              )}
            >
              {PERIOD_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
        {summary && (
          <span className="ml-auto text-xs text-zinc-500">{summary}</span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {value.mode === "day" && (
          <Input
            label="일자"
            type="date"
            value={value.day}
            onChange={(e) => patch({ day: e.target.value })}
            className="w-44"
          />
        )}
        {value.mode === "month" && (
          <Input
            label="월"
            type="month"
            value={value.month}
            onChange={(e) => patch({ month: e.target.value })}
            className="w-44"
          />
        )}
        {value.mode === "year" && (
          <Input
            label="년"
            type="number"
            min={2020}
            max={2100}
            value={value.year}
            onChange={(e) => patch({ year: e.target.value.slice(0, 4) })}
            className="w-32"
          />
        )}
        {value.mode === "range" && (
          <>
            <Input
              label="시작일"
              type="date"
              value={value.rangeFrom}
              onChange={(e) => patch({ rangeFrom: e.target.value })}
              className="w-44"
            />
            <Input
              label="종료일"
              type="date"
              value={value.rangeTo}
              onChange={(e) => patch({ rangeTo: e.target.value })}
              className="w-44"
            />
          </>
        )}
      </div>
    </div>
  );
}
