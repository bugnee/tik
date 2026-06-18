"use client";

import { Input } from "@/components/ui/FormFields";
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
            commaFormat={false}
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
