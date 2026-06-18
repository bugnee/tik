"use client";

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
}: {
  lines: WorkOrderCostLine[];
  className?: string;
  align?: "start" | "end";
}) {
  const items = lines.filter((line) => line.amount > 0);
  if (items.length === 0) return null;

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
            "inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] leading-tight",
            WORK_ORDER_COST_SURFACE[line.type],
            WORK_ORDER_COST_ACCENT[line.type],
          )}
        >
          {WORK_ORDER_COST_LABELS[line.type]}{" "}
          {line.amount.toLocaleString()}원
        </span>
      ))}
    </div>
  );
}
