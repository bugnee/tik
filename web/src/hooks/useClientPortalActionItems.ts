"use client";

import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import {
  getActiveClientPortalActionItems,
  type ClientPortalActionItem,
} from "@/lib/client-portal-utils";
import { getClientContractForUser } from "@/lib/selectors";

/** 고객사 포털 처리 항목 — 탭 뱃지와 동일 기준 */
export function useClientPortalActionItems(
  contractIdOverride?: string,
): ClientPortalActionItem[] | null {
  const data = useData();
  const { currentUser, activeRole } = useRole();

  return useMemo(() => {
    if (activeRole !== "client" && !contractIdOverride) return null;

    const contract = contractIdOverride
      ? (data.contracts.find((c) => c.id === contractIdOverride) ?? null)
      : getClientContractForUser(
          data,
          currentUser.id,
          currentUser.contractId,
        );

    return getActiveClientPortalActionItems(data, contract, currentUser.id);
  }, [
    activeRole,
    contractIdOverride,
    currentUser.contractId,
    currentUser.id,
    data,
  ]);
}
