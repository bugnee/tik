"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Download,
  PiggyBank,
  Receipt,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardHeader } from "@/components/dashboard/StaffDashboard";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { BonusPayScheduleNotice } from "@/components/bonus/BonusPayScheduleNotice";
import {
  ClientDepositConfirmPanel,
  ClientDepositTaskLine,
} from "@/components/finance/ClientDepositConfirmPanel";
import {
  enrichBonusPayment,
  getPendingBonusForRole,
} from "@/lib/bonus-utils";
import { formatKRW } from "@/lib/finance";
import { enrichExpense } from "@/lib/selectors";
import {
  getFinancePayoutQueue,
  getPendingExpensePayoutApprovals,
} from "@/lib/expense-payout-utils";
import {
  BONUS_STAGE_LABELS,
  PAYOUT_LABELS,
} from "@/lib/types";

export function FinanceManagerDashboard({ embedded }: { embedded?: boolean } = {}) {
  const data = useData();
  const { currentUser } = useRole();
  const {
    expenses,
    fundBudget,
    bonusPayments,
    markExpensesPaid,
    payBonus,
    updateFundBudget,
  } = data;

  const financeQueue = useMemo(
    () => getFinancePayoutQueue(expenses),
    [expenses],
  );
  const enrichedExpenses = useMemo(
    () => financeQueue.map((e) => enrichExpense(data, e)),
    [financeQueue, data],
  );

  const pendingApprovalCount = useMemo(
    () => getPendingExpensePayoutApprovals(expenses).length,
    [expenses],
  );

  const pendingBonuses = useMemo(
    () =>
      getPendingBonusForRole(bonusPayments, "finance_manager").map((p) =>
        enrichBonusPayment(data, p),
      ),
    [bonusPayments, data],
  );

  const unpaidTotal = financeQueue.reduce((s, e) => s + e.amount, 0);
  const bonusPendingTotal = pendingBonuses.reduce(
    (s, p) => s + p.totalAmount,
    0,
  );
  const usedBudget = fundBudget.expenseAllocated + fundBudget.bonusAllocated;

  return (
    <div className="space-y-6">
      {!embedded && (
        <DashboardHeader
          title="재무담당 대시보드"
          description="원가·성과급 자금 운영 · 대표 승인 완료 건 지급 처리"
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="월 운영 예산"
          value={formatKRW(fundBudget.monthlyBudget)}
          icon={PiggyBank}
          accent="emerald"
        />
        <StatCard
          label="원가 배정 잔액"
          value={formatKRW(fundBudget.expenseAllocated)}
          subValue={`승인 완료 ${financeQueue.length}건 · 결재 대기 ${pendingApprovalCount}건`}
          icon={Receipt}
          accent="amber"
        />
        <StatCard
          label="성과급 배정 잔액"
          value={formatKRW(fundBudget.bonusAllocated)}
          subValue={`지급 대기 ${formatKRW(bonusPendingTotal)}`}
          icon={Banknote}
          accent="cyan"
        />
        <StatCard
          label="운영 여유 자금"
          value={formatKRW(fundBudget.operatingReserve)}
          subValue={`배정률 ${fundBudget.monthlyBudget > 0 ? Math.round((usedBudget / fundBudget.monthlyBudget) * 100) : 0}%`}
          icon={Wallet}
          accent="emerald"
        />
      </div>

      <FundAllocationCard
        fundBudget={fundBudget}
        onUpdate={updateFundBudget}
      />

      <ClientDepositConfirmPanel />

      <ExpensePayoutQueue
        expenses={enrichedExpenses}
        onMarkPaid={markExpensesPaid}
        onDeductBudget={(amount) =>
          updateFundBudget({
            expenseAllocated: Math.max(0, fundBudget.expenseAllocated - amount),
            operatingReserve: fundBudget.operatingReserve - amount,
          })
        }
      />

      <BonusPayScheduleNotice />

      <BonusPayoutQueue
        bonuses={pendingBonuses}
        onPay={(id) => {
          const ok = payBonus(id, currentUser.id);
          if (!ok) {
            alert("지급 예정일이 도래하지 않았거나 처리할 수 없습니다.");
          }
        }}
      />
    </div>
  );
}

function FundAllocationCard({
  fundBudget,
  onUpdate,
}: {
  fundBudget: {
    monthlyBudget: number;
    expenseAllocated: number;
    bonusAllocated: number;
    operatingReserve: number;
  };
  onUpdate: (input: Partial<typeof fundBudget>) => void;
}) {
  const total =
    fundBudget.expenseAllocated +
    fundBudget.bonusAllocated +
    fundBudget.operatingReserve;

  return (
    <Card>
      <CardHeader
        title="자금 배분 현황"
        subtitle="월 예산 대비 원가·성과급·여유자금"
      />
      <div className="space-y-3">
        <FundBar
          label="원가 배정"
          amount={fundBudget.expenseAllocated}
          total={fundBudget.monthlyBudget}
          color="bg-amber-500"
        />
        <FundBar
          label="성과급 배정"
          amount={fundBudget.bonusAllocated}
          total={fundBudget.monthlyBudget}
          color="bg-cyan-500"
        />
        <FundBar
          label="운영 여유"
          amount={fundBudget.operatingReserve}
          total={fundBudget.monthlyBudget}
          color="bg-emerald-500"
        />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4 text-sm">
        <span className="text-zinc-500">합계 검증</span>
        <span
          className={`font-mono ${
            total === fundBudget.monthlyBudget
              ? "text-emerald-400"
              : "text-amber-400"
          }`}
        >
          {formatKRW(total)} / {formatKRW(fundBudget.monthlyBudget)}
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            onUpdate({
              expenseAllocated: fundBudget.expenseAllocated + 5_000_000,
              operatingReserve: fundBudget.operatingReserve - 5_000_000,
            })
          }
        >
          원가 +500만 이동
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            onUpdate({
              bonusAllocated: fundBudget.bonusAllocated + 2_000_000,
              operatingReserve: fundBudget.operatingReserve - 2_000_000,
            })
          }
        >
          성과급 +200만 이동
        </Button>
      </div>
    </Card>
  );
}

function FundBar({
  label,
  amount,
  total,
  color,
}: {
  label: string;
  amount: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-mono text-zinc-300">{formatKRW(amount)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

type EnrichedExpense = ReturnType<typeof enrichExpense>;

function ExpensePayoutQueue({
  expenses,
  onMarkPaid,
  onDeductBudget,
}: {
  expenses: EnrichedExpense[];
  onMarkPaid: (ids: string[]) => void;
  onDeductBudget: (amount: number) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function processPayout() {
    const items = expenses.filter((e) => selected.has(e.id));
    const total = items.reduce((s, e) => s + e.amount, 0);
    onMarkPaid(Array.from(selected));
    onDeductBudget(total);
    setSelected(new Set());
  }

  function downloadCSV() {
    const items = expenses.filter((e) => selected.has(e.id));
    const header = "수취인,계좌번호,금액,적요\n";
    const rows = items
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
    a.download = `tripit_expense_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card glow>
      <CardHeader
        title="원가 지급 큐"
        subtitle={`승인 완료 ${expenses.length}건 · 입금대기 건만 표시 · 지급 확인 후 입금완료`}
        action={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={selected.size === 0}
              onClick={downloadCSV}
            >
              <Download className="h-4 w-4" />
              CSV ({selected.size})
            </Button>
            <Button
              size="sm"
              disabled={selected.size === 0}
              onClick={processPayout}
            >
              <CheckCircle2 className="h-4 w-4" />
              지급 확인
            </Button>
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th className="pb-3 pr-3" />
              <th className="pb-3 pr-4 font-medium">업체</th>
              <th className="pb-3 pr-4 font-medium">카테고리</th>
              <th className="pb-3 pr-4 font-medium">금액</th>
              <th className="pb-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr
                key={e.id}
                className="border-b border-zinc-800/40 text-zinc-400"
              >
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
                <td className="py-3">
                  <Badge variant="warning">
                    {PAYOUT_LABELS[e.payoutStatus]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {expenses.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-500">
            지급 대기 원가가 없습니다
          </p>
        )}
      </div>
    </Card>
  );
}

function BonusPayoutQueue({
  bonuses,
  onPay,
}: {
  bonuses: ReturnType<typeof enrichBonusPayment>[];
  onPay: (id: string) => void;
}) {
  const dueCount = bonuses.filter((b) => b.isPayDue).length;

  return (
    <Card glow={bonuses.length > 0}>
      <CardHeader
        title="성과급 지급 큐"
        subtitle="대표 승인 완료 · 업체 입금 + 60일 경과 후 지급 가능"
        action={
          bonuses.length > 0 ? (
            <Badge variant={dueCount > 0 ? "success" : "warning"}>
              {dueCount > 0
                ? `${dueCount}건 지급 가능`
                : `${bonuses.length}건 예정일 대기`}
            </Badge>
          ) : undefined
        }
      />
      <div className="space-y-3">
        {bonuses.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
          >
            <div>
              <p className="font-medium text-zinc-200">{item.clientName}</p>
              <p className="text-xs text-zinc-500">
                {item.teamName} · {item.staffName} · {item.period}
              </p>
              <ClientDepositTaskLine
                contractId={item.contractId}
                scheduledPayDate={item.scheduledPayDate}
                paidAt={item.paidAt}
              />
              <p className="mt-1 text-xs text-zinc-600">
                담당 {item.staffPercentApplied}% {formatKRW(item.staffBonusAmount)}{" "}
                · 팀장 {item.teamLeaderPercentApplied}%{" "}
                {formatKRW(item.teamLeaderBonusAmount)} · 임원{" "}
                {item.executivePercentApplied}%{" "}
                {formatKRW(item.executiveBonusAmount)}
              </p>
              <p className="mt-1 text-xs text-cyan-400/80">{item.payStatusMessage}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-zinc-500">총 지급 성과금</p>
                <p className="font-mono text-lg font-bold text-emerald-400">
                  {formatKRW(item.totalAmount)}
                </p>
                <Badge
                  variant={item.isPayDue ? "success" : "warning"}
                  className="mt-1"
                >
                  {item.isPayDue
                    ? BONUS_STAGE_LABELS[item.stage]
                    : `예정 ${item.scheduledPayDate}`}
                </Badge>
              </div>
              <Button
                size="sm"
                disabled={!item.isPayDue}
                onClick={() => onPay(item.id)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {item.isPayDue ? "지급 완료" : "예정일 대기"}
              </Button>
            </div>
          </div>
        ))}
        {bonuses.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-500">
            대표 승인 완료 후 지급 대기 중인 성과급이 없습니다
          </p>
        )}
      </div>
    </Card>
  );
}
