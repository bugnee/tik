import { cn } from "@/lib/cn";
import { TASK_CHANNEL_BADGE_CLASSES } from "@/lib/task-channel-utils";
import type { TaskChannelAccent } from "@/lib/types";

export const DEFAULT_TAB_ACCENTS: TaskChannelAccent[] = [
  "cyan",
  "emerald",
  "amber",
  "violet",
  "sky",
  "rose",
  "fuchsia",
];

const TAB_INACTIVE_CLASSES: Record<TaskChannelAccent, string> = {
  cyan: "text-cyan-600/70 hover:bg-cyan-500/10 hover:text-cyan-600 dark:text-cyan-500/50 dark:hover:text-cyan-400",
  emerald:
    "text-emerald-600/70 hover:bg-emerald-500/10 hover:text-emerald-600 dark:text-emerald-500/50 dark:hover:text-emerald-400",
  violet:
    "text-violet-600/70 hover:bg-violet-500/10 hover:text-violet-600 dark:text-violet-500/50 dark:hover:text-violet-400",
  fuchsia:
    "text-fuchsia-600/70 hover:bg-fuchsia-500/10 hover:text-fuchsia-600 dark:text-fuchsia-500/50 dark:hover:text-fuchsia-400",
  amber:
    "text-amber-600/70 hover:bg-amber-500/10 hover:text-amber-600 dark:text-amber-500/50 dark:hover:text-amber-400",
  orange:
    "text-orange-600/70 hover:bg-orange-500/10 hover:text-orange-600 dark:text-orange-500/50 dark:hover:text-orange-400",
  rose: "text-rose-600/70 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-500/50 dark:hover:text-rose-400",
  sky: "text-sky-600/70 hover:bg-sky-500/10 hover:text-sky-600 dark:text-sky-500/50 dark:hover:text-sky-400",
  lime: "text-lime-600/70 hover:bg-lime-500/10 hover:text-lime-600 dark:text-lime-500/50 dark:hover:text-lime-400",
};

export function getTabAccent(index: number): TaskChannelAccent {
  return DEFAULT_TAB_ACCENTS[index % DEFAULT_TAB_ACCENTS.length];
}

export function getTabButtonClass(
  accent: TaskChannelAccent,
  active: boolean,
  baseClass?: string,
): string {
  return cn(
    baseClass ??
      "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
    active ? TASK_CHANNEL_BADGE_CLASSES[accent] : TAB_INACTIVE_CLASSES[accent],
  );
}

export function getTabPillClass(
  accent: TaskChannelAccent,
  active: boolean,
): string {
  return cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
    active
      ? cn(TASK_CHANNEL_BADGE_CLASSES[accent], "border-transparent")
      : cn(
          TAB_INACTIVE_CLASSES[accent],
          "border-[var(--border)] bg-[var(--card-muted)]",
        ),
  );
}

/** 클릭 선택형 카드(진행 현황·분야 필터 등) */
export function getTabCardClass(
  accent: TaskChannelAccent,
  active: boolean,
  baseClass?: string,
): string {
  return cn(
    baseClass ?? "rounded-xl border p-4 text-left transition-all",
    active
      ? cn(TASK_CHANNEL_BADGE_CLASSES[accent], "ring-2 border-transparent")
      : cn(
          "border-[var(--border)] bg-[var(--card-muted)]",
          "hover:border-zinc-400/40 hover:bg-[var(--card-muted)] dark:hover:border-zinc-600 dark:hover:bg-zinc-900/50",
        ),
  );
}
