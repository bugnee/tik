"use client";

import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import {
  getClientPortalBadgeCounts,
  type ClientPortalBadgeCounts,
} from "@/lib/client-portal-utils";
import { getClientContractForUser } from "@/lib/selectors";

/** 고객사 포털 탭별 알림 건수 — Navbar·탭바 공용 */
export function useClientPortalBadgeCounts(
  contractIdOverride?: string,
): ClientPortalBadgeCounts | null {
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

    return getClientPortalBadgeCounts(data, contract, currentUser.id);
  }, [
    activeRole,
    contractIdOverride,
    currentUser.contractId,
    currentUser.id,
    data,
  ]);
}
