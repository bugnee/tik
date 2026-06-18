"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card-muted)] p-0.5",
        className,
      )}
      role="group"
      aria-label="테마 선택"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors touch-manipulation sm:px-2.5",
          theme === "light"
            ? "bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30 dark:text-amber-300"
            : "text-[var(--muted)] hover:text-[var(--foreground)]",
        )}
        title="낮 모드"
      >
        <Sun className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">낮</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors touch-manipulation sm:px-2.5",
          theme === "dark"
            ? "bg-violet-500/15 text-violet-600 ring-1 ring-violet-500/30 dark:text-violet-300"
            : "text-[var(--muted)] hover:text-[var(--foreground)]",
        )}
        title="밤 모드"
      >
        <Moon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">밤</span>
      </button>
    </div>
  );
}
