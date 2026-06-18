"use client";

import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { useBonusStore } from "@/features/bonus/BonusStoreContext";
import type { BonusStore } from "@/features/bonus/create-bonus-store";

/** 성과급 슬라이스 + mutation — 신규 코드는 useData 대신 이 훅 사용 권장 */
export function useBonus(): BonusStore & {
  bonusPayments: ReturnType<typeof useData>["bonusPayments"];
  bonusPolicy: ReturnType<typeof useData>["bonusPolicy"];
} {
  const data = useData();
  const store = useBonusStore();
  return useMemo(
    () => ({
      bonusPayments: data.bonusPayments,
      bonusPolicy: data.bonusPolicy,
      ...store,
    }),
    [data.bonusPayments, data.bonusPolicy, store],
  );
}
