"use client";

import { createContext, useContext } from "react";
import type { FinanceStore } from "@/features/finance/create-finance-store";

const FinanceStoreContext = createContext<FinanceStore | null>(null);

export function FinanceStoreProvider({
  value,
  children,
}: {
  value: FinanceStore;
  children: React.ReactNode;
}) {
  return (
    <FinanceStoreContext.Provider value={value}>
      {children}
    </FinanceStoreContext.Provider>
  );
}

/** 재무·원가·입금 확인 전용 store (Phase 2) */
export function useFinanceStore(): FinanceStore {
  const store = useContext(FinanceStoreContext);
  if (!store) {
    throw new Error("useFinanceStore는 FinanceStoreProvider 내부에서 사용하세요.");
  }
  return store;
}
