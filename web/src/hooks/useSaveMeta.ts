"use client";

import { useCallback, useEffect, useState } from "react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { todayISO } from "@/lib/execution-utils";
import { getUserName } from "@/lib/selectors";
import type { SaveMetaSnapshot } from "@/lib/save-meta-utils";

export type SaveMetaInitial = {
  savedAt?: string;
  savedByUserId?: string;
  savedBy?: string;
};

function resolveSavedByName(
  data: ReturnType<typeof useData>,
  initial?: SaveMetaInitial | null,
): string | undefined {
  if (!initial) return undefined;
  if (initial.savedBy?.trim()) return initial.savedBy.trim();
  if (initial.savedByUserId) {
    return getUserName(data, initial.savedByUserId);
  }
  return undefined;
}

/** 폼 저장 이력 — SaveButton에 savedAt / savedBy 전달 */
export function useSaveMeta(initial?: SaveMetaInitial | null) {
  const data = useData();
  const { currentUser } = useRole();
  const [meta, setMeta] = useState<SaveMetaSnapshot>(() => ({
    savedAt: initial?.savedAt,
    savedBy: resolveSavedByName(data, initial),
    savedByUserId: initial?.savedByUserId,
  }));

  useEffect(() => {
    setMeta({
      savedAt: initial?.savedAt,
      savedBy: resolveSavedByName(data, initial),
      savedByUserId: initial?.savedByUserId,
    });
  }, [
    data,
    initial?.savedAt,
    initial?.savedBy,
    initial?.savedByUserId,
  ]);

  const recordSave = useCallback(
    (override?: Partial<SaveMetaSnapshot>) => {
      setMeta({
        savedAt: override?.savedAt ?? todayISO(),
        savedBy: override?.savedBy ?? currentUser.name,
        savedByUserId: override?.savedByUserId ?? currentUser.id,
      });
    },
    [currentUser.id, currentUser.name],
  );

  return {
    savedAt: meta.savedAt,
    savedBy: meta.savedBy,
    recordSave,
  };
}
