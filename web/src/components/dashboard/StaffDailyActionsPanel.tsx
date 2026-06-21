"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight, ListChecks } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { cn } from "@/lib/cn";
import { getStaffDailyActions } from "@/lib/staff-daily-workflow-utils";

/** 실무 담당 — 오늘 처리할 우선 업무 (최대 5건) */
export function StaffDailyActionsPanel({ className }: { className?: string }) {
  const data = useData();
  const { currentUser } = useRole();

  const actions = useMemo(
    () => getStaffDailyActions(data, currentUser.id),
    [data, currentUser.id],
  );

  if (actions.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-[var(--card-muted)] to-[var(--card-muted)] p-3 sm:p-4",
        className,
      )}
      aria-label="오늘 할 일"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-violet-100">
          <ListChecks className="h-4 w-4 text-violet-300" />
          오늘 할 일
        </span>
        <span className="text-xs text-zinc-400">
          긴급도 순 · 최대 {actions.length}건
        </span>
      </div>

      <ul className="space-y-2">
        {actions.map((action) => (
          <li key={action.id}>
            <Link
              href={action.href}
              className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5 transition-colors hover:border-violet-500/30 hover:bg-violet-500/5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-200">
                  {action.label}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">{action.reason}</p>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
