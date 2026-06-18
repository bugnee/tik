import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  /** 저장 대기 등 — 입력값이 baseline과 다를 때 강조 */
  dirty?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      disabled,
      dirty,
      children,
      ...props
    },
    ref,
  ) => {
    const variants = {
      primary:
        "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/30",
      secondary:
        "border border-[var(--border)] bg-[var(--card-muted)] text-[var(--foreground)] hover:bg-[var(--card)] dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:border-zinc-700",
      ghost:
        "text-[var(--muted)] hover:bg-[var(--card-muted)] hover:text-[var(--foreground)] dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200",
      danger:
        "bg-rose-600/90 text-white hover:bg-rose-500 shadow-lg shadow-rose-900/20",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-11 px-5 text-sm gap-2",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-all touch-manipulation",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variants[variant],
          sizes[size],
          dirty &&
            "ring-2 ring-amber-400/60 shadow-lg shadow-amber-900/20 dark:ring-amber-400/50",
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
