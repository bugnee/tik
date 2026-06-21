"use client";

import { Input } from "@/components/ui/FormFields";
import { MonthPickerInput } from "@/components/ui/MonthPickerInput";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { cn } from "@/lib/cn";
import {
  EXECUTION_PERIOD_MODE_LABELS,
  type ExecutionPeriodFilterValue,
  type ExecutionPeriodMode,
} from "@/lib/execution-period-utils";
import { getTabButtonClass } from "@/lib/tab-ui-utils";
import type { TaskChannelAccent } from "@/lib/types";
import type { ResolvedContractPeriod } from "@/lib/contract-period-utils";

const MODES: ExecutionPeriodMode[] = [
  "contract",
  "day",
  "month",
  "year",
  "range",
];

const MODE_ACCENTS: Record<ExecutionPeriodMode, TaskChannelAccent> = {
  contract: "cyan",
  day: "emerald",
  month: "amber",
  year: "violet",
  range: "rose",
};

type ExecutionPeriodFilterBarProps = {
  value: ExecutionPeriodFilterValue;
  onChange: (value: ExecutionPeriodFilterValue) => void;
  resolved: ResolvedContractPeriod;
  className?: string;
};

/** 실행 진행 — 계약 기간 기본 · 일·월·년·기간 조회 */
export function ExecutionPeriodFilterBar({
  value,
  onChange,
  resolved,
  className,
}: ExecutionPeriodFilterBarProps) {
  function setMode(mode: ExecutionPeriodMode) {
    onChange({ ...value, mode });
  }

  function patch(partial: Partial<ExecutionPeriodFilterValue>) {
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
                MODE_ACCENTS[mode],
                value.mode === mode,
                "rounded-md px-3 py-1.5 text-xs font-medium",
              )}
            >
              {EXECUTION_PERIOD_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-cyan-600 dark:text-cyan-400/90">
          {resolved.label}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {value.mode === "contract" && (
          <p className="text-xs text-zinc-500">
            계약 전체 기간 · {resolved.start} ~ {resolved.end}
          </p>
        )}
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
