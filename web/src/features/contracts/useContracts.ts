"use client";

import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { useContractStore } from "@/features/contracts/ContractStoreContext";
import type { ContractStore } from "@/features/contracts/create-contract-store";

/** 계약 슬라이스 + mutation — 신규 코드는 useData 대신 이 훅 사용 권장 */
export function useContracts(): ContractStore & {
  contracts: ReturnType<typeof useData>["contracts"];
  contractRecords: ReturnType<typeof useData>["contractRecords"];
  contractMemos: ReturnType<typeof useData>["contractMemos"];
  executions: ReturnType<typeof useData>["executions"];
  extensionApprovals: ReturnType<typeof useData>["extensionApprovals"];
} {
  const data = useData();
  const store = useContractStore();
  return useMemo(
    () => ({
      contracts: data.contracts,
      contractRecords: data.contractRecords,
      contractMemos: data.contractMemos,
      executions: data.executions,
      extensionApprovals: data.extensionApprovals,
      ...store,
    }),
    [
      data.contracts,
      data.contractRecords,
      data.contractMemos,
      data.executions,
      data.extensionApprovals,
      store,
    ],
  );
}
