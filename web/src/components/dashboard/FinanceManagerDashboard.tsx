"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { SortableTh, DataTable, Td, Th, Tr, EmptyState } from "@/components/ui/DataTable";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { useSortedItems, useTableSort } from "@/hooks/useTableSort";
import {
  compareNumbers,
  compareStrings,
  LIST_SEARCH_PLACEHOLDERS,
  matchesListSearch,
  PAYOUT_BADGE_VARIANT,
} from "@/lib/list-ui-consistency";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardHeader } from "@/components/dashboard/StaffDashboard";
import { RoleOnboardingPanel } from "@/components/dashboard/RoleOnboardingPanel";
import { DashboardBonusSection } from "@/components/dashboard/DashboardBonusSection";
import { useData } from "@/context/DataContext";
import {
  useDashboardPeriod,
  useDashboardPeriodScope,
} from "@/context/DashboardPeriodContext";
import { useRole } from "@/context/RoleContext";
import { matchesPeriodDate } from "@/lib/date-filter-utils";
import { BonusPayScheduleNotice } from "@/components/bonus/BonusPayScheduleNotice";
import { BonusPayrollSummaryPanel } from "@/components/bonus/BonusPayrollSummaryPanel";
import { BonusAmountBreakdownInline } from "@/components/bonus/BonusAmountBreakdown";
import {
  ClientDepositConfirmPanel,
  ClientDepositTaskLine,
} from "@/components/finance/ClientDepositConfirmPanel";
import {
  enrichBonusPayment,
  formatBonusKRW,
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
import { FINANCE_SECTION_CLIENT_DEPOSIT } from "@/lib/role-action-utils";

export function FinanceManagerDashboard({ embedded }: { embedded?: boolean } = {}) {
  const data = useData();
  const { currentUser } = useRole();
  const searchParams = useSearchParams();
  const sectionTarget = searchParams.get("section");
  const focusClientDeposit = sectionTarget === FINANCE_SECTION_CLIENT_DEPOSIT;
  const { periodLabel } = useDashboardPeriod();
  const periodScope = useDashboardPeriodScope();
  const {
    fundBudget,
    bonusPayments,
    markExpensesPaid,
    payBonus,
    updateFundBudget,
  } = data;
  const expenses = periodScope.expenses;

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
      getPendingBonusForRole(bonusPayments, "finance_manager")
        .filter((payment) =>
          matchesPeriodDate(
            payment.scheduledPayDate ?? payment.clientDepositDate,
            periodScope.periodFilter,
          ),
        )
        .map((p) => enrichBonusPayment(data, p)),
    [bonusPayments, data, periodScope.periodFilter],
  );

  const unpaidTotal = financeQueue.reduce((s, e) => s + e.amount, 0);
  const bonusPendingTotal = pendingBonuses.reduce(
    (s, p) => s + p.totalAmount,
    0,
  );
  const usedBudget = fundBudget.expenseAllocated + fundBudget.bonusAllocated;

  useEffect(() => {
    if (!focusClientDeposit) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById(FINANCE_SECTION_CLIENT_DEPOSIT)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [focusClientDeposit]);

  return (
    <div className="space-y-6">
      {!embedded && (
        <DashboardHeader
          title="재무담당 대시보드"
          description={`${periodLabel} · 원가·성과급(세전) 자금 운영 · 15일 마감 · 25일 급여 합산`}
        />
      )}

      {!embedded && <RoleOnboardingPanel />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
        hideBonus
      />

      <section
        id={FINANCE_SECTION_CLIENT_DEPOSIT}
        className="scroll-mt-24"
      >
        <ClientDepositConfirmPanel autoOpenPending={focusClientDeposit} />
      </section>

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

      <DashboardBonusSection
        hint={
          pendingBonuses.length > 0 ? (
            <span className="text-xs text-[var(--muted)]">
              지급 대기 {pendingBonuses.length}건
            </span>
          ) : undefined
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="성과급 배정 잔액"
            value={formatKRW(fundBudget.bonusAllocated)}
            subValue={`급여 합산 대기 ${formatBonusKRW(bonusPendingTotal)}`}
            icon={Banknote}
            accent="cyan"
          />
        </div>

        <FundAllocationCard
          fundBudget={fundBudget}
          onUpdate={updateFundBudget}
          bonusOnly
        />

        <BonusPayScheduleNotice />

        <BonusPayrollSummaryPanel />

        <BonusPayoutQueue
          bonuses={pendingBonuses}
          onPay={(id) => {
            const ok = payBonus(id, currentUser.id);
            if (!ok) {
              alert("급여 합산 지급일이 도래하지 않았거나 처리할 수 없습니다.");
            }
          }}
        />
      </DashboardBonusSection>
    </div>
  );
}

function FundAllocationCard({
  fundBudget,
  onUpdate,
  hideBonus,
  bonusOnly,
}: {
  fundBudget: {
    monthlyBudget: number;
    expenseAllocated: number;
    bonusAllocated: number;
    operatingReserve: number;
  };
  onUpdate: (input: Partial<typeof fundBudget>) => void;
  hideBonus?: boolean;
  bonusOnly?: boolean;
}) {
  const total =
    fundBudget.expenseAllocated +
    fundBudget.bonusAllocated +
    fundBudget.operatingReserve;

  if (bonusOnly) {
    return (
      <Card>
        <CardHeader
          title="성과급 자금 배분"
          subtitle="월 예산 중 성과급 배정 · 여유자금 이동"
        />
        <FundBar
          label="성과급 배정"
          amount={fundBudget.bonusAllocated}
          total={fundBudget.monthlyBudget}
          color="bg-cyan-500"
        />
        <div className="mt-3">
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

  return (
    <Card>
      <CardHeader
        title="자금 배분 현황"
        subtitle={
          hideBonus
            ? "월 예산 대비 원가·여유자금"
            : "월 예산 대비 원가·성과급·여유자금"
        }
      />
      <div className="space-y-3">
        {!hideBonus && (
          <>
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
          </>
        )}
        {hideBonus && (
          <>
            <FundBar
              label="원가 배정"
              amount={fundBudget.expenseAllocated}
              total={fundBudget.monthlyBudget}
              color="bg-amber-500"
            />
            <FundBar
              label="운영 여유"
              amount={fundBudget.operatingReserve}
              total={fundBudget.monthlyBudget}
              color="bg-emerald-500"
            />
          </>
        )}
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
        {!hideBonus && (
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
        )}
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

type PayoutQueueSortKey =
  | "clientName"
  | "categoryLabel"
  | "payoutRequestedAt"
  | "amount"
  | "payoutStatus";

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
  const [search, setSearch] = useState("");
  const { sortKey, sortDir, sortProps } = useTableSort<PayoutQueueSortKey>(
    "payoutRequestedAt",
    "desc",
  );

  const filtered = useMemo(
    () =>
      expenses.filter((e) =>
        matchesListSearch(
          search,
          e.clientName,
          e.description,
          e.categoryLabel,
          e.accountHolder,
          e.bankAccount,
          e.bankName,
        ),
      ),
    [expenses, search],
  );

  const sorted = useSortedItems(
    filtered,
    sortKey,
    sortDir,
    (a, b, key) => {
      switch (key) {
        case "clientName":
          return compareStrings(a.clientName, b.clientName);
        case "categoryLabel":
          return compareStrings(a.categoryLabel, b.categoryLabel);
        case "payoutRequestedAt":
          return compareStrings(
            a.payoutRequestedAt ?? "",
            b.payoutRequestedAt ?? "",
          );
        case "amount":
          return compareNumbers(a.amount, b.amount);
        case "payoutStatus":
          return compareStrings(a.payoutStatus, b.payoutStatus);
        default:
          return 0;
      }
    },
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (sorted.length > 0 && selected.size === sorted.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map((e) => e.id)));
    }
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
    const header = "은행,수취인,계좌번호,금액,입금요청일,적요\n";
    const rows = items
      .map(
        (e) =>
          `${e.bankName ?? ""},${e.accountHolder},${e.bankAccount},${e.amount},${e.payoutRequestedAt ?? ""},${e.clientName}_${e.description}`,
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tripitkorea_expense_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allSelected = sorted.length > 0 && selected.size === sorted.length;

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

      <ListToolbar
        className="mb-4 px-1"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={LIST_SEARCH_PLACEHOLDERS.payoutQueue}
        showSortHint
      />

      <DataTable>
        <thead>
          <tr>
            <Th className="w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="전체 선택"
                className="rounded border-zinc-600 bg-zinc-800 text-emerald-500"
              />
            </Th>
            <SortableTh className="pr-4" {...sortProps("clientName")}>
              업체
            </SortableTh>
            <SortableTh className="pr-4" {...sortProps("categoryLabel")}>
              카테고리
            </SortableTh>
            <SortableTh className="pr-4" {...sortProps("payoutRequestedAt")}>
              입금요청일
            </SortableTh>
            <Th className="pr-4">은행 · 계좌</Th>
            <SortableTh className="pr-4" {...sortProps("amount")}>
              금액
            </SortableTh>
            <SortableTh {...sortProps("payoutStatus")}>상태</SortableTh>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => (
            <Tr key={e.id}>
              <Td className="pr-3">
                <input
                  type="checkbox"
                  checked={selected.has(e.id)}
                  onChange={() => toggle(e.id)}
                  className="rounded border-zinc-600 bg-zinc-800 text-emerald-500"
                />
              </Td>
              <Td className="pr-4">
                <p className="font-medium text-zinc-200">{e.clientName}</p>
                <p className="text-xs text-zinc-600">{e.description}</p>
              </Td>
              <Td className="pr-4">{e.categoryLabel}</Td>
              <Td className="pr-4 font-mono text-zinc-300">
                {e.payoutRequestedAt ?? "-"}
              </Td>
              <Td className="pr-4 font-mono text-xs">
                <p className="text-zinc-200">
                  {e.bankName ? (
                    <>
                      <span className="text-zinc-400">{e.bankName}</span>{" "}
                      {e.bankAccount}
                    </>
                  ) : (
                    e.bankAccount
                  )}
                </p>
                <p className="mt-0.5 text-zinc-600">{e.accountHolder}</p>
              </Td>
              <Td className="pr-4 font-mono text-zinc-200">
                {formatKRW(e.amount)}
              </Td>
              <Td>
                <Badge variant={PAYOUT_BADGE_VARIANT[e.payoutStatus]}>
                  {PAYOUT_LABELS[e.payoutStatus]}
                </Badge>
              </Td>
            </Tr>
          ))}
        </tbody>
      </DataTable>

      {sorted.length === 0 ? (
        <EmptyState
          message={
            search.trim()
              ? "검색 결과가 없습니다"
              : "지급 대기 원가가 없습니다"
          }
        />
      ) : null}
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
        title="성과급(세전) 지급 큐"
        subtitle="대표 승인 완료 · 매월 15일 마감 · 25일 급여 합산 지급"
        action={
          bonuses.length > 0 ? (
            <Badge variant={dueCount > 0 ? "success" : "warning"}>
              {dueCount > 0
                ? `${dueCount}건 급여 반영 가능`
                : `${bonuses.length}건 급여 합산 대기`}
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
                closingDeadline={item.closingDeadline}
                paidAt={item.paidAt}
              />
              <BonusAmountBreakdownInline
                amounts={item}
                viewerRole="finance_manager"
                className="mt-2"
              />
              <p className="mt-1 text-xs text-cyan-400/80">{item.payStatusMessage}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-zinc-500">총 지급 성과금(세전)</p>
                <p className="font-mono text-lg font-bold text-emerald-400">
                  {formatBonusKRW(item.totalAmount)}
                </p>
                <Badge
                  variant={item.isPayDue ? "success" : "warning"}
                  className="mt-1"
                >
                  {item.isPayDue
                    ? BONUS_STAGE_LABELS[item.stage]
                    : `급여 ${item.scheduledPayDate} 대기`}
                </Badge>
              </div>
              <Button
                size="sm"
                disabled={!item.isPayDue}
                onClick={() => onPay(item.id)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {item.isPayDue ? "급여 반영 완료" : "급여일 대기"}
              </Button>
            </div>
          </div>
        ))}
        {bonuses.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-500">
            대표 승인 완료 후 급여 합산 대기 중인 성과급(세전)이 없습니다
          </p>
        )}
      </div>
    </Card>
  );
}
