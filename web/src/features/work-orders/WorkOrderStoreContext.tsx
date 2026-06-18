"use client";

import { createContext, useContext } from "react";
import type { WorkOrderStore } from "@/features/work-orders/create-work-order-store";

const WorkOrderStoreContext = createContext<WorkOrderStore | null>(null);

export function WorkOrderStoreProvider({
  value,
  children,
}: {
  value: WorkOrderStore;
  children: React.ReactNode;
}) {
  return (
    <WorkOrderStoreContext.Provider value={value}>
      {children}
    </WorkOrderStoreContext.Provider>
  );
}

/** 작업지시·파트너 협업 전용 store (Phase 3) */
export function useWorkOrderStore(): WorkOrderStore {
  const store = useContext(WorkOrderStoreContext);
  if (!store) {
    throw new Error(
      "useWorkOrderStore는 WorkOrderStoreProvider 내부에서 사용하세요.",
    );
  }
  return store;
}
