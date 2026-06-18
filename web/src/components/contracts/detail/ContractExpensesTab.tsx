"use client";

import { Pencil, Plus, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, EmptyState, Td, Th, Tr } from "@/components/ui/DataTable";
import { ContractDetailIconBtn } from "@/components/contracts/detail/ContractDetailIconBtn";
import { PAYOUT_VARIANT } from "@/components/contracts/detail/constants";
import { formatKRW } from "@/lib/finance";
import { canUserRequestExpense } from "@/lib/expense-payout-utils";
import { getExpenseCategoryLabel } from "@/lib/expense-category-utils";
import type { AppData, Expense, UserRole } from "@/lib/types";
import { PAYOUT_LABELS } from "@/lib/types";

export function ContractExpensesTab({
  expenses,
  data,
  currentUserId,
  activeRole,
  onAdd,
  onEdit,
  onRequestPayout,
  onDelete,
}: {
  expenses: Expense[];
  data: AppData;
  currentUserId: string;
  activeRole: UserRole;
  onAdd: () => void;
  onEdit: (e: Expense) => void;
  onRequestPayout: (e: Expense) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader
        title={`집행 원가 (${expenses.length}건)`}
        action={
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            등록
          </Button>
        }
      />
      {expenses.length === 0 ? (
        <EmptyState message="등록된 원가가 없습니다" />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>카테고리</Th>
              <Th>내용</Th>
              <Th>입금마감일</Th>
              <Th>금액</Th>
              <Th>계좌</Th>
              <Th>상태</Th>
              <Th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => {
              const canRequest = canUserRequestExpense(
                data,
                e,
                currentUserId,
                activeRole,
              );
              return (
                <Tr key={e.id}>
                  <Td>
                    {getExpenseCategoryLabel(data.expenseCategories, e.category)}
                  </Td>
                  <Td>{e.description}</Td>
                  <Td className="whitespace-nowrap text-xs text-zinc-300">
                    {e.paymentDueDate || "-"}
                  </Td>
                  <Td className="font-mono">{formatKRW(e.amount)}</Td>
                  <Td className="text-xs">
                    {e.bankAccount}
                    <br />
                    <span className="text-zinc-600">{e.accountHolder}</span>
                  </Td>
                  <Td>
                    <Badge variant={PAYOUT_VARIANT[e.payoutStatus]}>
                      {PAYOUT_LABELS[e.payoutStatus]}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      {canRequest && (
                        <ContractDetailIconBtn
                          onClick={() => onRequestPayout(e)}
                          icon={Send}
                          title="입금 요청"
                        />
                      )}
                      <ContractDetailIconBtn onClick={() => onEdit(e)} icon={Pencil} />
                      {e.payoutStatus === "unpaid" && (
                        <ContractDetailIconBtn
                          onClick={() => onDelete(e.id)}
                          icon={Trash2}
                          danger
                        />
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </DataTable>
      )}
    </Card>
  );
}
