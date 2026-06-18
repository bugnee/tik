"use client";

import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { useFinanceStore } from "@/features/finance/FinanceStoreContext";
import type { FinanceStore } from "@/features/finance/create-finance-store";

/** 재무·원가 슬라이스 + mutation */
export function useFinance(): FinanceStore & {
  expenses: ReturnType<typeof useData>["expenses"];
  fundBudget: ReturnType<typeof useData>["fundBudget"];
} {
  const data = useData();
  const store = useFinanceStore();
  return useMemo(
    () => ({
      expenses: data.expenses,
      fundBudget: data.fundBudget,
      ...store,
    }),
    [data.expenses, data.fundBudget, store],
  );
}
