"use client";

import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { useWorkOrderStore } from "@/features/work-orders/WorkOrderStoreContext";
import type { WorkOrderStore } from "@/features/work-orders/create-work-order-store";

/** 작업지시 슬라이스 + mutation — 신규 코드는 useData 대신 이 훅 사용 권장 */
export function useWorkOrders(): WorkOrderStore & {
  workOrders: ReturnType<typeof useData>["workOrders"];
  taskChannels: ReturnType<typeof useData>["taskChannels"];
} {
  const data = useData();
  const store = useWorkOrderStore();
  return useMemo(
    () => ({
      workOrders: data.workOrders,
      taskChannels: data.taskChannels,
      ...store,
    }),
    [data.workOrders, data.taskChannels, store],
  );
}
