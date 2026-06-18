"use client";

import { useMemo, useState } from "react";
import { Building2, RefreshCw, UserPlus, UserX } from "lucide-react";
import { ContractBriefListModal } from "@/components/contracts/ContractBriefListModal";
import { WorkStatusShareBar } from "@/components/dashboard/WorkStatusMetricCell";
import { Card, CardHeader } from "@/components/ui/Card";
import { useData } from "@/context/DataContext";
import { useDashboardPeriod, useDashboardPeriodScope } from "@/context/DashboardPeriodContext";
import { calcWorkStatusSharePercent } from "@/lib/dashboard-work-status-utils";
import {
  calcMonthlyContractStatus,
  getMonthlyContractCategoryContracts,
  MONTHLY_CONTRACT_CATEGORY_LABELS,
  type MonthlyContractCategory,
} from "@/lib/monthly-contract-status-utils";
import { cn } from "@/lib/cn";

const ROW_META: Record<
  MonthlyContractCategory,
  { accent: string; barClass: string; description: string; icon: typeof Building2 }
> = {
  new: {
    accent: "text-emerald-400",
    barClass: "bg-emerald-500",
    description: "당월 최초 계약 체결 업체",
    icon: UserPlus,
  },
  extension: {
    accent: "text-amber-400",
    barClass: "bg-amber-500",
    description: "당월 재계약·연장 전환 업체",
    icon: RefreshCw,
  },
  terminated: {
    accent: "text-rose-400",
    barClass: "bg-rose-500",
    description: "당월 계약 해지·종료 업체",
    icon: UserX,
  },
};

type ListModal = MonthlyContractCategory | null;

export function MonthlyContractStatusPanel({ className }: { className?: string }) {
  const data = useData();
  const { periodLabel } = useDashboardPeriod();
  const periodScope = useDashboardPeriodScope();
  const [listModal, setListModal] = useState<ListModal>(null);

  const summary = useMemo(
    () => calcMonthlyContractStatus(data, periodScope.periodFilter),
    [data, periodScope.periodFilter],
  );
  const monthLabel = periodLabel;

  const modalContracts = useMemo(() => {
    if (!listModal) return [];
    return getMonthlyContractCategoryContracts(summary, listModal);
  }, [summary, listModal]);

  const categories: MonthlyContractCategory[] = [
    "new",
    "extension",
    "terminated",
  ];

  const eventTotal =
    summary.newCount + summary.extensionCount + summary.terminatedCount;

  return (
    <>
      <Card glow className={className}>
        <CardHeader
          title={`당월 업체 · 계약현황 (${monthLabel})`}
          subtitle="신규 · 연장 · 종료 집계 — 숫자 클릭 시 업체 목록"
        />

        <div className="mb-4 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/30 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-500">당월 운영 업체</p>
            <p className="text-2xl font-bold tracking-tight text-zinc-50">
              {summary.totalOperating}
              <span className="ml-1 text-sm font-normal text-zinc-500">곳</span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500">
                <th className="px-3 py-2 font-medium">구분</th>
                <th className="px-3 py-2 font-medium">건수</th>
                <th className="px-3 py-2 font-medium">비중</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">
                  설명
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                const meta = ROW_META[category];
                const count =
                  category === "new"
                    ? summary.newCount
                    : category === "extension"
                      ? summary.extensionCount
                      : summary.terminatedCount;
                const clickable = count > 0;

                return (
                  <tr
                    key={category}
                    className={cn(
                      "border-b border-zinc-800/60 transition-colors",
                      clickable && "cursor-pointer hover:bg-zinc-900/50",
                    )}
                    onClick={() => clickable && setListModal(category)}
                  >
                    <td className="px-3 py-2.5 text-zinc-300">
                      <span className="inline-flex items-center gap-2">
                        <meta.icon className={cn("h-3.5 w-3.5", meta.accent)} />
                        {MONTHLY_CONTRACT_CATEGORY_LABELS[category]}
                      </span>
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 font-mono text-sm font-semibold",
                        meta.accent,
                      )}
                    >
                      {count}
                    </td>
                    <td className="px-3 py-2.5">
                      <WorkStatusShareBar
                        percent={calcWorkStatusSharePercent(count, eventTotal)}
                        barClassName={meta.barClass}
                        compact
                      />
                    </td>
                    <td className="hidden px-3 py-2.5 text-xs text-zinc-600 sm:table-cell">
                      {meta.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-800 bg-zinc-950/40">
                <td className="px-3 py-2 text-xs font-medium text-zinc-400">
                  당월 이벤트 합계
                </td>
                <td className="px-3 py-2 text-sm font-semibold text-zinc-200">
                  {eventTotal}건
                </td>
                <td className="px-3 py-2">
                  <WorkStatusShareBar
                    percent={eventTotal > 0 ? 100 : 0}
                    barClassName="bg-cyan-500"
                    compact
                  />
                </td>
                <td className="hidden px-3 py-2 text-xs text-zinc-600 sm:table-cell">
                  신규·연장·종료 건수 합산 (운영 업체 수와 별도)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <ContractBriefListModal
        open={listModal !== null}
        onClose={() => setListModal(null)}
        title={
          listModal
            ? `${monthLabel} ${MONTHLY_CONTRACT_CATEGORY_LABELS[listModal]} (${modalContracts.length}곳)`
            : ""
        }
        description={listModal ? ROW_META[listModal].description : undefined}
        contracts={modalContracts}
        data={data}
      />
    </>
  );
}
