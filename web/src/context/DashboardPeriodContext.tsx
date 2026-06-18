"use client";

import {
  createContext,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useData } from "@/context/DataContext";
import {
  createDefaultPeriodFilter,
  periodFilterLabel,
  type PeriodFilterValue,
} from "@/lib/date-filter-utils";
import {
  buildDashboardPeriodScope,
  filterContractsInPeriod,
  type DashboardPeriodScope,
} from "@/lib/dashboard-period-utils";
import { filterContractsByRole } from "@/lib/selectors";
import type { UserRole } from "@/lib/types";

interface DashboardPeriodContextValue {
  periodFilter: PeriodFilterValue;
  setPeriodFilter: (value: PeriodFilterValue) => void;
  periodLabel: string;
  scope: DashboardPeriodScope;
}

const DashboardPeriodContext = createContext<DashboardPeriodContextValue | null>(
  null,
);

export function DashboardPeriodProvider({ children }: { children: ReactNode }) {
  const data = useData();
  const deferredData = useDeferredValue(data);
  const [periodFilter, setPeriodFilter] = useState(createDefaultPeriodFilter);

  const scope = useMemo(
    () => buildDashboardPeriodScope(deferredData, periodFilter),
    [
      deferredData.contracts,
      deferredData.contractRecords,
      deferredData.workOrders,
      deferredData.expenses,
      periodFilter,
    ],
  );

  const value = useMemo(
    () => ({
      periodFilter,
      setPeriodFilter,
      periodLabel: periodFilterLabel(periodFilter),
      scope,
    }),
    [periodFilter, scope],
  );

  return (
    <DashboardPeriodContext.Provider value={value}>
      {children}
    </DashboardPeriodContext.Provider>
  );
}

export function useDashboardPeriod() {
  const ctx = useContext(DashboardPeriodContext);
  const data = useData();
  const fallbackFilter = useMemo(() => createDefaultPeriodFilter(), []);
  const fallbackScope = useMemo(
    () => buildDashboardPeriodScope(data, fallbackFilter),
    [data, fallbackFilter],
  );

  if (!ctx) {
    return {
      periodFilter: fallbackFilter,
      setPeriodFilter: () => {},
      periodLabel: periodFilterLabel(fallbackFilter),
      scope: fallbackScope,
    };
  }
  return ctx;
}

export function useDashboardPeriodScope() {
  return useDashboardPeriod().scope;
}

export function useRolePeriodContracts(role: UserRole, userId: string) {
  const data = useData();
  const { scope } = useDashboardPeriod();

  return useMemo(() => {
    const roleContracts = filterContractsByRole(data, role, userId);
    return filterContractsInPeriod(roleContracts, scope.contractIds);
  }, [data, role, userId, scope.contractIds]);
}

export function useRolePeriodContractIds(role: UserRole, userId: string) {
  const contracts = useRolePeriodContracts(role, userId);
  return useMemo(() => new Set(contracts.map((c) => c.id)), [contracts]);
}
