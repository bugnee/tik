"use client";

import { useCallback, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

/**
 * 테이블 정렬 공통 훅 — 대시보드·관리·재무 목록에서 동일 동작
 */
export function useTableSort<T extends string>(
  defaultKey: T,
  defaultDirection: SortDirection = "asc",
) {
  const [sortKey, setSortKey] = useState<T>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDirection>(defaultDirection);

  const toggleSort = useCallback(
    (key: T, preferredDirection?: SortDirection) => {
      if (sortKey === key) {
        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
        return;
      }
      setSortKey(key);
      setSortDir(preferredDirection ?? (key === defaultKey ? "asc" : "desc"));
    },
    [sortKey, defaultKey],
  );

  const sortProps = useCallback(
    (key: T) => ({
      active: sortKey === key,
      direction: sortDir,
      onClick: () => toggleSort(key),
    }),
    [sortKey, sortDir, toggleSort],
  );

  return { sortKey, sortDir, toggleSort, sortProps };
}

/** compare 함수 + useTableSort 결과로 정렬된 배열 반환 */
export function useSortedItems<T, K extends string>(
  items: T[],
  sortKey: K,
  sortDir: SortDirection,
  compare: (a: T, b: T, key: K) => number,
): T[] {
  return useMemo(() => {
    const list = [...items];
    list.sort((a, b) => {
      const cmp = compare(a, b, sortKey);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [items, sortKey, sortDir, compare]);
}
