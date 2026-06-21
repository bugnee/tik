"use client";

import { Input } from "@/components/ui/FormFields";
import { MonthPickerInput } from "@/components/ui/MonthPickerInput";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { cn } from "@/lib/cn";
import { getTabButtonClass } from "@/lib/tab-ui-utils";
import type { TaskChannelAccent } from "@/lib/types";
import {
  PERIOD_MODE_LABELS,
  type PeriodFilterValue,
  type PeriodMode,
} from "@/lib/date-filter-utils";

const MODES: PeriodMode[] = ["day", "month", "year", "range"];

const PERIOD_MODE_ACCENTS: Record<PeriodMode, TaskChannelAccent> = {
  day: "cyan",
  month: "emerald",
  year: "amber",
  range: "violet",
};

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
        "flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-muted)] p-3 sm:p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          조회 기간
        </span>
        <div className="flex flex-wrap gap-1 rounded-lg border border-[var(--border)] bg-[var(--card-muted)] p-1">
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMode(mode)}
              className={getTabButtonClass(
                PERIOD_MODE_ACCENTS[mode],
                value.mode === mode,
                "rounded-md px-3 py-1.5 text-xs font-medium",
              )}
            >
              {PERIOD_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
        {summary && (
          <span className="ml-auto text-xs text-[var(--muted)]">{summary}</span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {value.mode === "day" && (
          <DatePickerInput
            label="일자"
            value={value.day}
            onChange={(day) => patch({ day })}
            className="w-auto min-w-[16rem]"
          />
        )}
        {value.mode === "month" && (
          <MonthPickerInput
            label="월"
            value={value.month}
            onChange={(month) => patch({ month })}
            className="w-44"
          />
        )}
        {value.mode === "year" && (
          <Input
            label="년"
            type="number"
            min={2020}
            max={2100}
            commaFormat={false}
            value={value.year}
            onChange={(e) => patch({ year: e.target.value.slice(0, 4) })}
            className="w-32"
          />
        )}
        {value.mode === "range" && (
          <>
            <DatePickerInput
              label="시작일"
              value={value.rangeFrom}
              onChange={(rangeFrom) => patch({ rangeFrom })}
              className="w-auto min-w-[16rem]"
            />
            <DatePickerInput
              label="종료일"
              value={value.rangeTo}
              onChange={(rangeTo) => patch({ rangeTo })}
              className="w-auto min-w-[16rem]"
            />
          </>
        )}
      </div>
    </div>
  );
}
