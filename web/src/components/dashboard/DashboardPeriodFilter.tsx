"use client";

import { PeriodFilterBar } from "@/components/ui/PeriodFilterBar";
import { useDashboardPeriod } from "@/context/DashboardPeriodContext";

export function DashboardPeriodFilter() {
  const { periodFilter, setPeriodFilter, periodLabel } = useDashboardPeriod();

  return (
    <PeriodFilterBar
      value={periodFilter}
      onChange={setPeriodFilter}
      summary={`${periodLabel} 기준 조회`}
    />
  );
}
