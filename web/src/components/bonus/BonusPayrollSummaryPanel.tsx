"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { MonthPickerInput } from "@/components/ui/MonthPickerInput";
import { SortableTh } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { formatBonusKRW } from "@/lib/bonus-utils";
import {
  aggregateBonusPayrollByPerson,
  canViewBonusPayrollSummary,
  currentCalendarMonth,
  formatPayMonthLabel,
  listBonusPayrollMonths,
  nextCalendarMonth,
  sumBonusPayrollRows,
  type BonusPayrollPersonRow,
} from "@/lib/bonus-payroll-utils";

type SortKey = "userName" | "roleLabel" | "grandTotal" | "paymentCount";

export function BonusPayrollSummaryPanel() {
  const data = useData();
  const { activeRole } = useRole();
  const { bonusPayments } = data;

  const currentMonth = currentCalendarMonth();
  const nextMonth = nextCalendarMonth();
  const monthOptions = useMemo(
    () => listBonusPayrollMonths(bonusPayments),
    [bonusPayments],
  );

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [sortKey, setSortKey] = useState<SortKey>("grandTotal");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const currentRows = useMemo(
    () => aggregateBonusPayrollByPerson(data, bonusPayments, currentMonth),
    [data, bonusPayments, currentMonth],
  );
  const nextRows = useMemo(
    () => aggregateBonusPayrollByPerson(data, bonusPayments, nextMonth),
    [data, bonusPayments, nextMonth],
  );
  const selectedRows = useMemo(
    () => aggregateBonusPayrollByPerson(data, bonusPayments, selectedMonth),
    [data, bonusPayments, selectedMonth],
  );

  const sortedRows = useMemo(() => {
    return [...selectedRows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "userName":
          cmp = a.userName.localeCompare(b.userName, "ko");
          break;
        case "roleLabel":
          cmp = a.roleLabel.localeCompare(b.roleLabel, "ko");
          break;
        case "paymentCount":
          cmp = a.paymentCount - b.paymentCount;
          break;
        case "grandTotal":
          cmp = a.grandTotal - b.grandTotal;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [selectedRows, sortKey, sortDir]);

  if (!canViewBonusPayrollSummary(activeRole)) {
    return null;
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "userName" ? "asc" : "desc");
    }
  }

  return (
    <Card glow>
      <CardHeader
        title="인원별 성과급(세전) 급여 합산"
        subtitle="급여 합산 예정일(매월 25일) 기준 · 대표 승인 경로 포함 건 집계"
        action={
          <Badge variant="info">
            <Users className="mr-1 inline h-3 w-3" />
            재무 · 대표 · 임원
          </Badge>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <MonthPickerInput
          label="조회 월 (급여 합산월)"
          value={selectedMonth}
          onChange={setSelectedMonth}
          className="w-44"
        />
        <div className="flex flex-wrap gap-2 pb-1">
          {monthOptions.slice(0, 6).map((month) => (
            <button
              key={month}
              type="button"
              onClick={() => setSelectedMonth(month)}
              className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                selectedMonth === month
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              }`}
            >
              {month}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <StatCard
          label={`당월 합계 · ${formatPayMonthLabel(currentMonth)}`}
          value={formatBonusKRW(sumBonusPayrollRows(currentRows))}
          subValue={`${currentRows.length}명 · ${currentRows.reduce((s, r) => s + r.paymentCount, 0)}건`}
          icon={Users}
          accent="emerald"
        />
        <StatCard
          label={`익월 합계 · ${formatPayMonthLabel(nextMonth)}`}
          value={formatBonusKRW(sumBonusPayrollRows(nextRows))}
          subValue={`${nextRows.length}명 · ${nextRows.reduce((s, r) => s + r.paymentCount, 0)}건`}
          icon={Users}
          accent="cyan"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs">
              <SortableTh
                className="pb-3 pr-4"
                active={sortKey === "userName"}
                direction={sortDir}
                onClick={() => toggleSort("userName")}
              >
                이름
              </SortableTh>
              <SortableTh
                className="pb-3 pr-4"
                active={sortKey === "roleLabel"}
                direction={sortDir}
                onClick={() => toggleSort("roleLabel")}
              >
                역할
              </SortableTh>
              <th className="pb-3 pr-4 font-medium text-zinc-500">담당분</th>
              <th className="pb-3 pr-4 font-medium text-zinc-500">팀장분</th>
              <th className="pb-3 pr-4 font-medium text-zinc-500">임원분</th>
              <SortableTh
                className="pb-3 pr-4"
                active={sortKey === "grandTotal"}
                direction={sortDir}
                onClick={() => toggleSort("grandTotal")}
              >
                합계(세전)
              </SortableTh>
              <SortableTh
                className="pb-3"
                active={sortKey === "paymentCount"}
                direction={sortDir}
                onClick={() => toggleSort("paymentCount")}
              >
                건수
              </SortableTh>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <PayrollRow key={row.userId} row={row} />
            ))}
          </tbody>
        </table>
        {sortedRows.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-500">
            {formatPayMonthLabel(selectedMonth)} 지급 예정 성과급이 없습니다
          </p>
        )}
      </div>

      {sortedRows.length > 0 && (
        <div className="mt-4 flex justify-end border-t border-zinc-800 pt-3">
          <p className="text-sm text-zinc-400">
            {formatPayMonthLabel(selectedMonth)} 인원별 합계{" "}
            <span className="font-mono font-semibold text-emerald-400">
              {formatBonusKRW(sumBonusPayrollRows(sortedRows))}
            </span>
          </p>
        </div>
      )}
    </Card>
  );
}

function PayrollRow({ row }: { row: BonusPayrollPersonRow }) {
  return (
    <tr className="border-b border-zinc-800/40 text-zinc-400">
      <td className="py-3 pr-4 font-medium text-zinc-200">{row.userName}</td>
      <td className="py-3 pr-4">{row.roleLabel}</td>
      <td className="py-3 pr-4 font-mono text-xs">
        {row.staffTotal > 0 ? formatBonusKRW(row.staffTotal) : "-"}
      </td>
      <td className="py-3 pr-4 font-mono text-xs">
        {row.teamLeaderTotal > 0 ? formatBonusKRW(row.teamLeaderTotal) : "-"}
      </td>
      <td className="py-3 pr-4 font-mono text-xs">
        {row.executiveTotal > 0 ? formatBonusKRW(row.executiveTotal) : "-"}
      </td>
      <td className="py-3 pr-4 font-mono font-semibold text-emerald-400">
        {formatBonusKRW(row.grandTotal)}
      </td>
      <td className="py-3 font-mono text-zinc-500">{row.paymentCount}</td>
    </tr>
  );
}
