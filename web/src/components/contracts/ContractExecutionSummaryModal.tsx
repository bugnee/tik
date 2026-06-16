"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";
import { ContractProgressPanel } from "@/components/work-orders/ContractProgressPanel";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import { useData } from "@/context/DataContext";
import { sortExecutionsByChannel } from "@/lib/execution-generation-utils";
import { formatKRW } from "@/lib/finance";
import {
  getCompletionRate,
  getContractExecutions,
  getContractExpenses,
  getMonthlyProgressRate,
  getTeamName,
  getUserName,
} from "@/lib/selectors";
import {
  getExpenseCategoryLabel,
} from "@/lib/expense-category-utils";
import {
  EXECUTION_STATUS_LABELS,
  PAYOUT_LABELS,
  type ExpenseCategory,
} from "@/lib/types";
import {
  calcContractWorkProgress,
  filterWorkOrdersByContract,
} from "@/lib/work-order-utils";

type ContractExecutionSummaryModalProps = {
  contractId: string | null;
  open: boolean;
  onClose: () => void;
};

export function ContractExecutionSummaryModal({
  contractId,
  open,
  onClose,
}: ContractExecutionSummaryModalProps) {
  const data = useData();

  const contract = contractId
    ? data.contracts.find((c) => c.id === contractId)
    : undefined;

  const executions = useMemo(() => {
    if (!contractId) return [];
    return sortExecutionsByChannel(
      getContractExecutions(data, contractId),
      data.taskChannels,
    );
  }, [data, contractId]);

  const expenses = useMemo(() => {
    if (!contractId) return [];
    return getContractExpenses(data, contractId);
  }, [data, contractId]);

  const expenseTotals = useMemo(() => {
    const totals = new Map<ExpenseCategory, number>();
    for (const expense of expenses) {
      totals.set(
        expense.category,
        (totals.get(expense.category) ?? 0) + expense.amount,
      );
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const workProgress = useMemo(() => {
    if (!contractId) return null;
    const orders = filterWorkOrdersByContract(data.workOrders, contractId);
    if (orders.length === 0) return null;
    return calcContractWorkProgress(orders, data.taskChannels);
  }, [data, contractId]);

  if (!contract) {
    return (
      <Modal open={open} onClose={onClose} title="실행 내역 집계" size="xl">
        <p className="text-sm text-zinc-500">업체 정보를 찾을 수 없습니다.</p>
      </Modal>
    );
  }

  const completionRate = getCompletionRate(data, contract);
  const monthlyProgress = getMonthlyProgressRate(data, contract);
  const expenseGrandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${contract.clientName} · 실행 내역 집계`}
      size="xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-zinc-600">담당</dt>
              <dd className="text-zinc-200">
                {getUserName(data, contract.assignedStaffId)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-600">팀</dt>
              <dd className="text-zinc-200">{getTeamName(data, contract.teamId)}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-600">월 광고비</dt>
              <dd className="font-mono text-emerald-400">
                {formatKRW(contract.monthlyFee)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-600">계약 기간</dt>
              <dd className="text-zinc-200">
                {contract.contractStartDate} ~ {contract.contractEndDate}
              </dd>
            </div>
          </dl>
          <Link
            href={`/contracts/${contract.id}`}
            onClick={onClose}
            className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
          >
            계약 상세
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <ProgressBar
              label="종합 달성률"
              value={completionRate}
              color="emerald"
            />
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <ProgressBar
              label="해당월 실행 진행"
              value={monthlyProgress}
              color="cyan"
            />
          </div>
        </div>

        {workProgress && (
          <ContractProgressPanel
            clientName={contract.clientName}
            progress={workProgress}
          />
        )}

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            집행 실행 현황 ({executions.length}건)
          </h3>
          {executions.length === 0 ? (
            <p className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-4 py-6 text-center text-sm text-zinc-500">
              등록된 실행 데이터가 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {executions.map((exec) => {
                const pct =
                  exec.targetCount > 0
                    ? (exec.completedCount / exec.targetCount) * 100
                    : 0;
                return (
                  <div
                    key={exec.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <TaskChannelBadge
                        data={data}
                        executionType={exec.type}
                      />
                      <Badge
                        variant={
                          exec.status === "completed"
                            ? "success"
                            : exec.status === "delayed"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {EXECUTION_STATUS_LABELS[exec.status]}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                      <span>
                        {exec.completedCount}/{exec.targetCount}건
                        {exec.dueDate && ` · 마감 ${exec.dueDate}`}
                      </span>
                      <span className="font-mono text-zinc-400">
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={pct} size="sm" showValue={false} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              원가 집계
            </h3>
            <span className="font-mono text-sm text-emerald-400">
              합계 {formatKRW(expenseGrandTotal)}
            </span>
          </div>

          {expenseTotals.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {expenseTotals.map(([category, amount]) => (
                <span
                  key={category}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-xs text-zinc-400"
                >
                  {getExpenseCategoryLabel(data.expenseCategories, category)}{" "}
                  <span className="font-mono text-zinc-200">
                    {formatKRW(amount)}
                  </span>
                </span>
              ))}
            </div>
          )}

          {expenses.length === 0 ? (
            <p className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-4 py-6 text-center text-sm text-zinc-500">
              등록된 원가가 없습니다.
            </p>
          ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/30 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="text-zinc-300">
                      {getExpenseCategoryLabel(data.expenseCategories, expense.category)} ·{" "}
                      {expense.description}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-600">
                      {PAYOUT_LABELS[expense.payoutStatus]}
                      {expense.paymentDueDate &&
                        ` · 마감 ${expense.paymentDueDate}`}
                    </p>
                  </div>
                  <span className="font-mono text-emerald-400">
                    {formatKRW(expense.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex justify-end border-t border-zinc-800 pt-4">
          <Link
            href={`/contracts/${contract.id}`}
            onClick={onClose}
            className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline"
          >
            계약 상세에서 실행·원가 보기
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </Modal>
  );
}
