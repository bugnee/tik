"use client";

import Link from "next/link";
import { ChevronRight, ListTodo } from "lucide-react";
import { NavAlertBadge } from "@/components/ui/NavAlertBadge";
import { useRoleActionItems } from "@/hooks/useRoleActionItems";
import { cn } from "@/lib/cn";

/** 대시보드 상단 — 처리 대기 업무 요약 */
export function PendingActionsPanel({ className }: { className?: string }) {
  const { items, totalCount } = useRoleActionItems();

  if (totalCount <= 0) return null;

  return (
    <section
      className={cn(
        "rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-[var(--card-muted)] to-[var(--card-muted)] p-3 sm:p-4",
        className,
      )}
      aria-label="해야 할 일"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-100">
          <ListTodo className="h-4 w-4 text-amber-300" />
          해야 할 일
        </span>
        <NavAlertBadge count={totalCount} inline />
        <span className="text-xs text-zinc-400">
          메뉴 뱃지와 동일 기준 · 클릭하면 해당 화면으로 이동
        </span>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5 text-sm transition-colors hover:border-amber-500/30 hover:bg-amber-500/5"
            >
              <span className="min-w-0 flex-1 truncate text-zinc-200">
                {item.label}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5">
                <NavAlertBadge count={item.count} inline />
                <ChevronRight className="h-4 w-4 text-zinc-500" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
