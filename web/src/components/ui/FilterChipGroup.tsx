"use client";

import { cn } from "@/lib/cn";
import {
  FILTER_CHIP_ALL_STYLES,
  type FilterChipStyleSet,
  type ListAccentTone,
  LIST_ACCENT_CHIP_STYLES,
} from "@/lib/list-ui-consistency";

export type FilterChipOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
  tone?: ListAccentTone;
  /** tone 대신 커스텀 스타일 (입금확인 등) */
  styles?: FilterChipStyleSet;
};

type FilterChipGroupProps<T extends string> = {
  value: T | "all";
  onChange: (value: T | "all") => void;
  options: FilterChipOption<T>[];
  allLabel?: string;
  className?: string;
};

/** 상태·카테고리 필터 — 구분색 통일 */
export function FilterChipGroup<T extends string>({
  value,
  onChange,
  options,
  allLabel = "전체",
  className,
}: FilterChipGroupProps<T>) {
  const totalCount = options.reduce((sum, opt) => sum + (opt.count ?? 0), 0);

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <FilterChipButton
        label={allLabel}
        count={totalCount}
        active={value === "all"}
        styles={FILTER_CHIP_ALL_STYLES}
        onClick={() => onChange("all")}
      />
      {options.map((opt) => {
        const styles =
          opt.styles ??
          LIST_ACCENT_CHIP_STYLES[opt.tone ?? "zinc"];
        const empty = (opt.count ?? 0) === 0;
        return (
          <FilterChipButton
            key={opt.value}
            label={opt.label}
            count={opt.count}
            active={value === opt.value}
            empty={empty}
            styles={styles}
            onClick={() => onChange(opt.value)}
          />
        );
      })}
    </div>
  );
}

function FilterChipButton({
  label,
  count,
  active,
  empty,
  styles,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  empty?: boolean;
  styles: FilterChipStyleSet;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={empty && !active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
        empty && !active
          ? styles.empty
          : active
            ? styles.active
            : styles.idle,
      )}
    >
      <span>{label}</span>
      {count !== undefined ? (
        <span
          className={cn(
            "tabular-nums",
            empty && !active ? "text-zinc-600" : styles.count,
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
