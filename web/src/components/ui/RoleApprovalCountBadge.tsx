"use client";

import { cn } from "@/lib/cn";

/** 역할별 승인 대기 실행 건수 뱃지 */
export function RoleApprovalCountBadge({
  count,
  className,
  compact = false,
}: {
  count: number;
  className?: string;
  /** true면 숫자만 표시 */
  compact?: boolean;
}) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-amber-500 font-bold text-zinc-950 shadow-sm",
        compact
          ? "h-4 min-w-4 px-1 text-[10px] leading-none"
          : "px-2 py-0.5 text-[11px]",
        className,
      )}
      aria-label={`승인 대기 ${count}건`}
    >
      {compact ? (count > 99 ? "99+" : count) : `승인 ${count}건`}
    </span>
  );
}
