import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  accent = "emerald",
  onValueClick,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  accent?: "emerald" | "cyan" | "amber" | "rose";
  /** 숫자(값) 클릭 시 목록 등 상세 표시 */
  onValueClick?: () => void;
}) {
  const accents = {
    emerald: "text-emerald-400 bg-emerald-500/10 ring-emerald-500/20",
    cyan: "text-cyan-400 bg-cyan-500/10 ring-cyan-500/20",
    amber: "text-amber-400 bg-amber-500/10 ring-amber-500/20",
    rose: "text-rose-400 bg-rose-500/10 ring-rose-500/20",
  };

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 backdrop-blur-sm sm:rounded-2xl sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1 sm:space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {label}
          </p>
          {onValueClick ? (
            <button
              type="button"
              onClick={onValueClick}
              className="text-left text-xl font-bold tracking-tight text-zinc-50 underline-offset-4 transition-colors hover:text-emerald-300 hover:underline sm:text-2xl"
            >
              {value}
            </button>
          ) : (
            <p className="text-xl font-bold tracking-tight text-zinc-50 sm:text-2xl">
              {value}
            </p>
          )}
          {subValue && (
            <p className="text-xs text-zinc-500">{subValue}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.positive ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {trend.positive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        <div
          className={cn(
            "rounded-xl p-2.5 ring-1 ring-inset",
            accents[accent],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
