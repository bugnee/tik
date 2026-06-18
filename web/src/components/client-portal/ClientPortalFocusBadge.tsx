"use client";

import { cn } from "@/lib/cn";

const variants = {
  default: "bg-zinc-800/90 text-zinc-300 ring-1 ring-zinc-700 hover:bg-zinc-700/90",
  success:
    "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25",
  warning:
    "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30 hover:bg-amber-500/25",
  danger:
    "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30 hover:bg-rose-500/25",
  info: "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30 hover:bg-cyan-500/25",
};

const activeRings: Record<keyof typeof variants, string> = {
  default: "ring-zinc-400/60",
  success: "ring-emerald-400/60",
  warning: "ring-amber-400/60",
  danger: "ring-rose-400/60",
  info: "ring-cyan-400/60",
};

const focusRings: Record<keyof typeof variants, string> = {
  default: "focus-visible:ring-zinc-500/50",
  success: "focus-visible:ring-emerald-500/50",
  warning: "focus-visible:ring-amber-500/50",
  danger: "focus-visible:ring-rose-500/50",
  info: "focus-visible:ring-cyan-500/50",
};

export function ClientPortalFocusBadge({
  children,
  variant = "default",
  onClick,
  active,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
        focusRings[variant],
        variants[variant],
        active && cn("ring-2 ring-offset-1 ring-offset-zinc-950", activeRings[variant]),
      )}
    >
      {children}
    </button>
  );
}
