"use client";

import { createContext, useContext } from "react";
import type { BonusStore } from "@/features/bonus/create-bonus-store";

const BonusStoreContext = createContext<BonusStore | null>(null);

export function BonusStoreProvider({
  value,
  children,
}: {
  value: BonusStore;
  children: React.ReactNode;
}) {
  return (
    <BonusStoreContext.Provider value={value}>
      {children}
    </BonusStoreContext.Provider>
  );
}

/** 성과급 정책·결재 전용 store (Phase 4) */
export function useBonusStore(): BonusStore {
  const store = useContext(BonusStoreContext);
  if (!store) {
    throw new Error("useBonusStore는 BonusStoreProvider 내부에서 사용하세요.");
  }
  return store;
}
