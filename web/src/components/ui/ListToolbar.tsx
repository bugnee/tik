"use client";

import type { ReactNode } from "react";
import { SearchBar } from "@/components/ui/DataTable";
import {
  LIST_SEARCH_PLACEHOLDERS,
  LIST_SORT_HINT,
} from "@/lib/list-ui-consistency";
import { cn } from "@/lib/cn";

type ListToolbarProps = {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  /** 정렬 가능 테이블 위 안내 */
  showSortHint?: boolean;
  sortHint?: string;
  className?: string;
};

/** 목록 상단 — 검색·필터·정렬 안내 통일 */
export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = LIST_SEARCH_PLACEHOLDERS.default,
  filters,
  showSortHint = false,
  sortHint = LIST_SORT_HINT,
  className,
}: ListToolbarProps) {
  const hasSearch = onSearchChange !== undefined;

  if (!hasSearch && !filters && !showSortHint) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        {hasSearch ? (
          <SearchBar
            value={search ?? ""}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        ) : null}
        {filters}
      </div>
      {showSortHint ? (
        <p className="shrink-0 text-[11px] text-[var(--muted)]">{sortHint}</p>
      ) : null}
    </div>
  );
}
