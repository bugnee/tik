"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { useData } from "@/context/DataContext";
import { useFinance } from "@/features/finance/useFinance";
import { useRole } from "@/context/RoleContext";
import {
  calculatePL,
  formatKRW,
  type PLBreakdown,
} from "@/lib/finance";
import { enrichExpense } from "@/lib/selectors";
import { getFinancePayoutQueue } from "@/lib/expense-payout-utils";
import { PAYOUT_LABELS } from "@/lib/types";
import Link from "next/link";
import { FinanceManagerDashboard } from "@/components/dashboard/FinanceManagerDashboard";
import { BonusPayrollSummaryPanel } from "@/components/bonus/BonusPayrollSummaryPanel";
import { SampleDataResetPanel } from "@/components/settings/SampleDataResetPanel";
import { TabBar } from "@/components/ui/TabBar";

export function FinancePage() {
  const { canViewFinancials, activeRole } = useRole();
  const data = useData();
  const { expenses, markExpensesPaid } = useFinance();
  const { contracts } = data;

  const pl = calculatePL(contracts, expenses, data.bonusPolicy, data);
  const enrichedExpenses = useMemo(
    () => expenses.map((e) => enrichExpense(data, e)),
    [expenses, data],
  );

  if (!canViewFinancials) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
          <Lock className="mx-auto h-12 w-12 text-zinc-600" />
          <h2 className="mt-4 text-lg font-semibold text-zinc-200">
            접근 권한 없음
          </h2>
          <p className="mt-2 max-w-sm text-sm text-zinc-500">
            재무 탭은 CEO 또는 is_financial_viewer 권한이 있는 사용자만
            열람할 수 있습니다.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block text-sm text-emerald-400 hover:underline"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const unpaidTotal = getFinancePayoutQueue(expenses).reduce(
    (s, e) => s + e.amount,
    0,
  );

  const [tab, setTab] = useState<"pl" | "ops">(
    activeRole === "finance_manager" ? "ops" : "pl",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-50 sm:text-2xl">
          재무 · 정산
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          P&L 수익분석 · 원가·성과급 자금 운영
        </p>
      </div>

      {activeRole === "finance_manager" && (
        <TabBar
          active={tab}
          onChange={setTab}
          items={[
            { id: "ops", label: "자금 운영", shortLabel: "운영", accent: "cyan" },
            { id: "pl", label: "P&L 분석", shortLabel: "P&L", accent: "emerald" },
          ]}
        />
      )}

      {tab === "ops" && activeRole === "finance_manager" ? (
        <>
          <FinanceManagerDashboard embedded />
          <SampleDataResetPanel compact />
        </>
      ) : (
        <>
          <BonusPayrollSummaryPanel />
          <PLSection breakdown={pl} unpaidTotal={unpaidTotal} />
          <SettlementChecklist
            expenses={enrichedExpenses}
            onMarkPaid={markExpensesPaid}
          />
        </>
      )}
    </div>
  );
}

function PLSection({
  breakdown,
  unpaidTotal,
}: {
  breakdown: PLBreakdown;
  unpaidTotal: number;
}) {
  const rows = [
    { label: "총 매출 (월 광고비)", value: breakdown.totalRevenue, sign: "+" },
    { label: "파트너 지급비용", value: breakdown.partnerPaymentCost, sign: "-" },
    ...(breakdown.otherCost > 0
      ? [
          {
            label: "기타 집행·운영 비용",
            value: breakdown.otherCost,
            sign: "-" as const,
          },
        ]
      : []),
    { label: "모든 비용 합계", value: breakdown.totalCost, sign: "-" },
    { label: "담당자 연장 성과급(세전)", value: breakdown.staffBonus, sign: "-" },
    { label: "팀장 연장 성과급(세전)", value: breakdown.teamLeaderBonus, sign: "-" },
    { label: "임직원 연장 성과금(세전)", value: breakdown.executiveBonus, sign: "-" },
    { label: "리셀러 수수료 (10%)", value: breakdown.referralFee, sign: "-" },
  ];

  const marginRate =
    breakdown.totalRevenue > 0
      ? ((breakdown.netProfit / breakdown.totalRevenue) * 100).toFixed(1)
      : "0";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2" glow>
        <CardHeader
          title="전사 P&L · 순이익"
          subtitle="총매출 − 파트너비 · 전체 비용 − 성과급(세전) − 리셀러 수수료 · 15일 마감 · 25일 급여 합산"
        />
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-950/30 px-4 py-3"
            >
              <span className="text-sm text-zinc-400">{row.label}</span>
              <span
                className={`font-mono text-sm font-medium ${
                  row.sign === "+" ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {row.sign}
                {formatKRW(row.value)}
              </span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4">
            <span className="font-semibold text-emerald-300">순이익</span>
            <span className="text-xl font-bold text-emerald-400">
              {formatKRW(breakdown.netProfit)}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid gap-4">
        <StatCard
          label="마진율"
          value={`${marginRate}%`}
          icon={FileSpreadsheet}
          accent="emerald"
        />
        <StatCard
          label="미지급 원가"
          value={formatKRW(unpaidTotal)}
          subValue="정산 체크리스트 참조"
          icon={Download}
          accent="amber"
        />
      </div>
    </div>
  );
}

type EnrichedExpense = ReturnType<typeof enrichExpense>;

function SettlementChecklist({
  expenses,
  onMarkPaid,
}: {
  expenses: EnrichedExpense[];
  onMarkPaid: (ids: string[]) => void;
}) {
  const unpaid = useMemo(
    () => expenses.filter((e) => e.payoutStatus === "pending_transfer"),
    [expenses],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === unpaid.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unpaid.map((e) => e.id)));
    }
  }

  function downloadCSV() {
    const selectedItems = unpaid.filter((e) => selected.has(e.id));
    const header = "수취인,계좌번호,금액,적요\n";
    const rows = selectedItems
      .map(
        (e) =>
          `${e.accountHolder},${e.bankAccount},${e.amount},${e.clientName}_${e.description}`,
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tripit_settlement_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function markPaid() {
    onMarkPaid(Array.from(selected));
    setSelected(new Set());
  }

  return (
    <Card>
      <CardHeader
        title="정산 체크리스트"
        subtitle={`입금대기 ${unpaid.length}건 · 대표·임원 승인 완료 건`}
        action={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={selected.size === 0}
              onClick={downloadCSV}
            >
              <Download className="h-4 w-4" />
              CSV 다운로드 ({selected.size})
            </Button>
            <Button size="sm" disabled={selected.size === 0} onClick={markPaid}>
              <CheckCircle2 className="h-4 w-4" />
              입금 완료 처리
            </Button>
          </div>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th className="w-10 pb-3 pr-2 text-center font-medium">#</th>
              <th className="pb-3 pr-3">
                <input
                  type="checkbox"
                  checked={
                    unpaid.length > 0 && selected.size === unpaid.length
                  }
                  onChange={toggleAll}
                  className="rounded border-zinc-600 bg-zinc-800 text-emerald-500"
                />
              </th>
              <th className="pb-3 pr-4 font-medium">업체</th>
              <th className="pb-3 pr-4 font-medium">카테고리</th>
              <th className="pb-3 pr-4 font-medium">금액</th>
              <th className="pb-3 pr-4 font-medium">계좌</th>
              <th className="pb-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {unpaid.map((e, index) => (
              <tr
                key={e.id}
                className="border-b border-zinc-800/40 text-zinc-400"
              >
                <td className="py-3 pr-2 text-center font-mono text-xs tabular-nums text-zinc-500">
                  {index + 1}
                </td>
                <td className="py-3 pr-3">
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggle(e.id)}
                    className="rounded border-zinc-600 bg-zinc-800 text-emerald-500"
                  />
                </td>
                <td className="py-3 pr-4">
                  <p className="font-medium text-zinc-200">{e.clientName}</p>
                  <p className="text-xs text-zinc-600">{e.description}</p>
                </td>
                <td className="py-3 pr-4">
                  {e.categoryLabel}
                </td>
                <td className="py-3 pr-4 font-mono text-zinc-200">
                  {formatKRW(e.amount)}
                </td>
                <td className="py-3 pr-4 font-mono text-xs">
                  {e.bankAccount}
                  <br />
                  <span className="text-zinc-600">{e.accountHolder}</span>
                </td>
                <td className="py-3">
                  <Badge variant="warning">
                    {PAYOUT_LABELS[e.payoutStatus]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
