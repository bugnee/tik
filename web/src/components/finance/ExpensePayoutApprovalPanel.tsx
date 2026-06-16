"use client";

import { useMemo, useState } from "react";
import { Check, Coins, X } from "lucide-react";
import { ContractExecutionSummaryModal } from "@/components/contracts/ContractExecutionSummaryModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import {
  canApproveExpensePayout,
  getPendingExpensePayoutApprovals,
} from "@/lib/expense-payout-utils";
import { formatKRW } from "@/lib/finance";
import { enrichExpense } from "@/lib/selectors";
import { PAYOUT_LABELS } from "@/lib/types";
import { getUserName } from "@/lib/selectors";

export function ExpensePayoutApprovalPanel() {
  const data = useData();
  const { currentUser, activeRole } = useRole();
  const { approveExpensePayout, rejectExpensePayout } = data;
  const [summaryContractId, setSummaryContractId] = useState<string | null>(
    null,
  );

  const pending = useMemo(
    () => getPendingExpensePayoutApprovals(data.expenses),
    [data.expenses],
  );

  const enriched = useMemo(
    () => pending.map((e) => enrichExpense(data, e)),
    [pending, data],
  );

  if (!canApproveExpensePayout(activeRole)) return null;

  return (
    <>
      <Card glow={pending.length > 0}>
      <CardHeader
        title="원가 입금 결재"
        subtitle="담당자 입금요청 → 승인 시 재무 입금 업무 큐에 추가"
        action={
          pending.length > 0 ? (
            <Badge variant="warning">{pending.length}건 대기</Badge>
          ) : undefined
        }
      />

      {enriched.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-zinc-500">
          입금 요청 대기 중인 원가가 없습니다.
        </p>
      ) : (
        <div className="space-y-3 px-5 pb-5">
          {enriched.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <button
                    type="button"
                    onClick={() => setSummaryContractId(item.contractId)}
                    className="group text-left"
                  >
                    <p className="font-medium text-zinc-100 transition-colors group-hover:text-emerald-400">
                      {item.clientName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-600 group-hover:text-emerald-400/70">
                      클릭 · 실행 내역 집계
                    </p>
                  </button>
                  <p className="mt-1 text-sm text-zinc-400">
                    {item.categoryLabel} · {item.description}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    요청{" "}
                    {item.payoutRequestedAt ?? "-"} ·{" "}
                    {item.payoutRequestedBy
                      ? getUserName(data, item.payoutRequestedBy)
                      : "-"}
                    · 마감 {item.paymentDueDate}
                  </p>
                  <p className="mt-2 font-mono text-emerald-400">
                    {formatKRW(item.amount)}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {item.accountHolder} · {item.bankAccount}
                  </p>
                </div>
                <Badge variant="info">{PAYOUT_LABELS.pending_approval}</Badge>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() =>
                    approveExpensePayout(item.id, currentUser.id)
                  }
                >
                  <Check className="h-4 w-4" />
                  승인 · 재무 큐 추가
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  className="flex-1"
                  onClick={() => rejectExpensePayout(item.id, currentUser.id)}
                >
                  <X className="h-4 w-4" />
                  반려
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      </Card>

      <ContractExecutionSummaryModal
        contractId={summaryContractId}
        open={summaryContractId !== null}
        onClose={() => setSummaryContractId(null)}
      />
    </>
  );
}

/** 대시보드 헤더용 입금 결재 대기 건수 */
export function ExpensePayoutTaskLine() {
  const { expenses } = useData();
  const count = getPendingExpensePayoutApprovals(expenses).length;
  if (count === 0) return null;

  return (
    <Badge variant="warning">
      <Coins className="mr-1 inline h-3 w-3" />
      원가 입금 결재 {count}건
    </Badge>
  );
}
