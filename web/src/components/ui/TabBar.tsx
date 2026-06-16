import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface TabBarItem<T extends string> {
  id: T;
  label: string;
  /** 모바일에서 더 짧게 표시할 라벨 (없으면 label 사용) */
  shortLabel?: string;
  icon?: LucideIcon;
}

interface TabBarProps<T extends string> {
  items: TabBarItem<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

/** 화면 너비에 맞게 탭 버튼을 균등 배치 (폰·태블릿·PC 공통) */
export function TabBar<T extends string>({
  items,
  active,
  onChange,
  className,
}: TabBarProps<T>) {
  return (
    <div
      className={cn(
        "flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-1",
        className,
      )}
      role="tablist"
    >
      {items.map(({ id, label, shortLabel, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-medium transition-colors touch-manipulation sm:gap-2 sm:px-4 sm:py-2 sm:text-sm",
              isActive
                ? "bg-emerald-600 text-white"
                : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            <span className="truncate sm:hidden">{shortLabel ?? label}</span>
            <span className="hidden truncate sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
