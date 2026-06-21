"use client";

import {
  REFERRAL_COST_CHIP,
} from "@/components/work-orders/referral-commission-styles";
import { cn } from "@/lib/cn";
import type { WorkOrderCostLine } from "@/lib/types";
import {
  WORK_ORDER_COST_ACCENT,
  WORK_ORDER_COST_LABELS,
  WORK_ORDER_COST_SURFACE,
} from "@/lib/work-order-utils";

export function WorkOrderCostBreakdown({
  lines,
  className,
  align = "end",
  showNoCostLabel = false,
  variant = "default",
}: {
  lines: WorkOrderCostLine[];
  className?: string;
  align?: "start" | "end";
  /** 금액 0일 때 '비용 없음' 표시 (파트너 배정만 한 경우) */
  showNoCostLabel?: boolean;
  /** 리셀러 수수료 — emerald 톤 + 수수료 라벨 */
  variant?: "default" | "referral";
}) {
  const items = lines.filter((line) => line.amount > 0);
  if (items.length === 0) {
    if (!showNoCostLabel) return null;
    return (
      <span className="text-[10px] text-zinc-500">비용 없음</span>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5",
        align === "end" ? "justify-end" : "justify-start",
        className,
      )}
    >
      {items.map((line) => (
        <span
          key={line.type}
          className={cn(
            variant === "referral"
              ? REFERRAL_COST_CHIP
              : cn(
                  "inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] leading-tight",
                  WORK_ORDER_COST_SURFACE[line.type],
                  WORK_ORDER_COST_ACCENT[line.type],
                ),
          )}
        >
          {variant === "referral" ? "수수료" : WORK_ORDER_COST_LABELS[line.type]}{" "}
          {line.amount.toLocaleString()}원
        </span>
      ))}
    </div>
  );
}
