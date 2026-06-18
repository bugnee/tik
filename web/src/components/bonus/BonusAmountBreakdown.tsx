"use client";

import {
  calcVisibleBonusTotal,
  formatBonusKRW,
  getVisibleBonusTierCells,
  type BonusAmounts,
} from "@/lib/bonus-utils";
import { cn } from "@/lib/cn";
import type { UserRole } from "@/lib/types";

function tierRoleLabel(cellLabel: string): string {
  return cellLabel.split(" ")[0] ?? cellLabel;
}

function tierPercent(cellLabel: string): string {
  return cellLabel.match(/(\d+(?:\.\d+)?)%/)?.[1] ?? "0";
}

function AmountCell({
  label,
  value,
  highlight,
  compact,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  compact?: boolean;
}) {
  const role = tierRoleLabel(label);
  const pct = tierPercent(label);

  return (
    <div
      className={cn(
        "rounded-lg border",
        compact ? "min-w-[5.5rem] px-2.5 py-1.5" : "px-3 py-2",
        highlight
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-zinc-800 bg-zinc-900/40",
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {highlight ? label : role}
      </p>
      <p
        className={cn(
          "mt-0.5 font-mono font-semibold",
          compact ? "text-xs" : "text-sm",
          highlight ? "text-emerald-400" : "text-zinc-300",
        )}
      >
        {formatBonusKRW(value)}
        {!highlight && (
          <span className="ml-0.5 text-[10px] font-normal text-zinc-500">
            (세전)
          </span>
        )}
      </p>
      {!highlight && (
        <p className="mt-0.5 text-[10px] tabular-nums text-zinc-600">{pct}%</p>
      )}
    </div>
  );
}

/** 역할별로 노출 가능한 성과급 구간만 표시 */
export function BonusAmountBreakdownGrid({
  amounts,
  viewerRole,
  totalLabel = "총 지급 성과금(세전)",
}: {
  amounts: BonusAmounts;
  viewerRole: UserRole;
  totalLabel?: string;
}) {
  const cells = getVisibleBonusTierCells(amounts, viewerRole);
  const visibleTotal = calcVisibleBonusTotal(amounts, viewerRole);
  const gridClass =
    cells.length <= 1
      ? "sm:grid-cols-2"
      : cells.length === 2
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`mt-3 grid gap-2 ${gridClass}`}>
      {cells.map((cell) => (
        <AmountCell
          key={cell.tier}
          label={cell.label}
          value={cell.value}
        />
      ))}
      <AmountCell label={totalLabel} value={visibleTotal} highlight />
    </div>
  );
}

export function BonusAmountBreakdownInline({
  amounts,
  viewerRole,
  className,
}: {
  amounts: BonusAmounts;
  viewerRole: UserRole;
  className?: string;
}) {
  const cells = getVisibleBonusTierCells(amounts, viewerRole);
  if (cells.length === 0) return null;

  return (
    <div className={cn("mt-2 flex flex-wrap gap-2", className)}>
      {cells.map((cell) => (
        <AmountCell
          key={cell.tier}
          label={cell.label}
          value={cell.value}
          compact
        />
      ))}
    </div>
  );
}
