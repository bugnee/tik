"use client";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { calcWorkStatusSharePercent } from "@/lib/dashboard-work-status-utils";
import { cn } from "@/lib/cn";

export function WorkStatusShareBar({
  percent,
  barClassName,
  compact,
  className,
}: {
  percent: number;
  barClassName: string;
  compact?: boolean;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="min-w-[2rem] text-[10px] tabular-nums text-zinc-500">
        {clamped}%
      </span>
      <div
        className={cn(
          "overflow-hidden rounded-full bg-zinc-800",
          compact ? "h-1 w-8" : "h-1.5 w-12",
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all", barClassName)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export function WorkStatusMetricCell({
  count,
  total,
  accent,
  barClassName,
  onClick,
  compact,
}: {
  count: number;
  total: number;
  accent: string;
  barClassName: string;
  onClick: () => void;
  compact?: boolean;
}) {
  const share = calcWorkStatusSharePercent(count, total);

  return (
    <td className={cn("px-3", compact ? "py-2" : "py-2.5")}>
      <button
        type="button"
        onClick={onClick}
        disabled={count === 0}
        className={cn(
          "rounded-lg text-left transition-colors",
          count > 0
            ? "hover:bg-zinc-900/80"
            : "cursor-default",
        )}
      >
        <div className="flex flex-col items-start gap-0.5">
          <span
            className={cn(
              "font-bold tabular-nums",
              compact ? "text-sm" : "text-lg",
              count > 0
                ? `${accent} hover:underline`
                : "text-zinc-600",
            )}
          >
            {count}
          </span>
          {total > 0 && count > 0 && (
            <WorkStatusShareBar
              percent={share}
              barClassName={barClassName}
              compact={compact}
            />
          )}
        </div>
      </button>
    </td>
  );
}

export function WorkStatusExecutionProgress({
  percent,
  compact,
  className,
}: {
  percent: number;
  compact?: boolean;
  className?: string;
}) {
  const color =
    percent >= 85 ? "emerald" : percent >= 60 ? "cyan" : "amber";

  return (
    <div className={cn(compact ? "min-w-[5.5rem]" : "min-w-[7rem]", className)}>
      <ProgressBar
        value={percent}
        size="sm"
        showValue
        color={color}
      />
    </div>
  );
}

export function WorkStatusHeaderMetric({
  label,
  count,
  total,
  accent,
  barClassName,
}: {
  label: string;
  count: number;
  total: number;
  accent: string;
  barClassName: string;
}) {
  const share = calcWorkStatusSharePercent(count, total);

  return (
    <div className="flex min-w-[4.5rem] flex-col gap-0.5">
      <div className={cn("text-xs font-medium tabular-nums", accent)}>
        {label} {count}
        {total > 0 && count > 0 && (
          <span className="ml-1 text-[10px] font-normal text-zinc-500">
            {share}%
          </span>
        )}
      </div>
      {total > 0 && count > 0 && (
        <WorkStatusShareBar
          percent={share}
          barClassName={barClassName}
          compact
        />
      )}
    </div>
  );
}
