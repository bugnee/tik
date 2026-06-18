"use client";

import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import {
  getRoleActionItems,
  getTotalRoleActionCount,
  type RoleActionItem,
} from "@/lib/role-action-utils";

/** 역할별 처리 대기 업무 목록 */
export function useRoleActionItems(): {
  items: RoleActionItem[];
  totalCount: number;
} {
  const data = useData();
  const { currentUser, activeRole } = useRole();

  return useMemo(() => {
    const items = getRoleActionItems(data, currentUser.id, activeRole);
    return {
      items,
      totalCount: getTotalRoleActionCount(items),
    };
  }, [data, currentUser.id, activeRole]);
}
