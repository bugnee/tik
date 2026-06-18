"use client";

import { createContext, useContext } from "react";
import type { ContractStore } from "@/features/contracts/create-contract-store";

const ContractStoreContext = createContext<ContractStore | null>(null);

export function ContractStoreProvider({
  value,
  children,
}: {
  value: ContractStore;
  children: React.ReactNode;
}) {
  return (
    <ContractStoreContext.Provider value={value}>
      {children}
    </ContractStoreContext.Provider>
  );
}

/** 계약·실행·연장 전용 store (Phase 2) */
export function useContractStore(): ContractStore {
  const store = useContext(ContractStoreContext);
  if (!store) {
    throw new Error(
      "useContractStore는 ContractStoreProvider 내부에서 사용하세요.",
    );
  }
  return store;
}
