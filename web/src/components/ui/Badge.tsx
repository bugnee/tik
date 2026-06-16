import { cn } from "@/lib/cn";

const variants = {
  default: "bg-zinc-800 text-zinc-300",
  success: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
  danger: "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30",
  info: "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
