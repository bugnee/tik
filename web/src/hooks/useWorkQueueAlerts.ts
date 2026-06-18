"use client";

import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { getWorkQueueAlerts } from "@/lib/notification-utils";

/** 역할별 파트너 업무 큐 알림 — Navbar·대시보드 뱃지용 */
export function useWorkQueueAlerts() {
  const data = useData();
  const { currentUser, activeRole } = useRole();

  return useMemo(
    () => getWorkQueueAlerts(data, currentUser.id, activeRole),
    [data, currentUser.id, activeRole],
  );
}
