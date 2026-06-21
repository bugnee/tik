"use client";

import { useData } from "@/context/DataContext";
import { useFormDirty } from "@/hooks/useFormDirty";
import { Button } from "@/components/ui/Button";
import { SaveButton } from "@/components/ui/SaveButton";
import { useSaveMeta } from "@/hooks/useSaveMeta";
import { Input, Select, Textarea } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { PostLinksField } from "@/components/executions/PostLinksField";
import { PAYOUT_VARIANT } from "@/components/contracts/detail/constants";
import { getExecutionTypeLabels } from "@/lib/task-channel-utils";
import { getActiveExpenseCategories } from "@/lib/expense-category-utils";
import type {
  Execution,
  ExecutionInput,
  ExecutionStatus,
  ExecutionType,
  Expense,
  ExpenseCategory,
  ExpenseInput,
} from "@/lib/types";
import {
  EXECUTION_STATUS_LABELS,
  PAYOUT_LABELS,
} from "@/lib/types";

export function ContractExecutionModal({
  open,
  onClose,
  editing,
  form,
  setForm,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  editing: Execution | null;
  form: ExecutionInput;
  setForm: (f: ExecutionInput) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const data = useData();
  const typeLabels = getExecutionTypeLabels(data);
  const contract = data.contracts.find((c) => c.id === form.contractId) ?? null;
  const formDirty = useFormDirty(open, editing?.id ?? "create", form);
  const saveMeta = useSaveMeta(
    editing?.enteredAt ? { savedAt: editing.enteredAt } : null,
  );

  function handleSubmit(e: React.FormEvent) {
    onSubmit(e);
    saveMeta.recordSave();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "실행 수정" : "실행 등록"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="유형"
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value as ExecutionType })
            }
          >
            {(Object.keys(typeLabels) as ExecutionType[]).map((t) => (
              <option key={t} value={t}>
                {typeLabels[t]}
              </option>
            ))}
          </Select>
          <Select
            label="상태"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as ExecutionStatus })
            }
          >
            {(Object.keys(EXECUTION_STATUS_LABELS) as ExecutionStatus[]).map(
              (s) => (
                <option key={s} value={s}>
                  {EXECUTION_STATUS_LABELS[s]}
                </option>
              ),
            )}
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="완료 수"
            type="number"
            min={0}
            value={form.completedCount}
            onChange={(e) =>
              setForm({ ...form, completedCount: Number(e.target.value) })
            }
          />
          <Input
            label="목표 수"
            type="number"
            min={0}
            value={form.targetCount}
            onChange={(e) =>
              setForm({ ...form, targetCount: Number(e.target.value) })
            }
          />
          <Input
            label="마감일"
            type="date"
            value={form.dueDate ?? ""}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
        </div>
        <Textarea
          label="메모"
          value={form.memo ?? ""}
          onChange={(e) => setForm({ ...form, memo: e.target.value })}
        />
        <PostLinksField
          links={form.postLinks ?? []}
          defaultDueDate={form.dueDate}
          contract={contract}
          onChange={(postLinks) => setForm({ ...form, postLinks })}
        />
        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <SaveButton
            type="submit"
            dirty={formDirty}
            savedAt={saveMeta.savedAt}
            savedBy={saveMeta.savedBy}
          >
            {editing ? "저장" : "등록"}
          </SaveButton>
        </div>
      </form>
    </Modal>
  );
}

export function ContractExpenseModal({
  open,
  onClose,
  editing,
  form,
  setForm,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  editing: Expense | null;
  form: ExpenseInput;
  setForm: (f: ExpenseInput) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const { expenseCategories } = useData();
  const categories = getActiveExpenseCategories(expenseCategories);
  const formDirty = useFormDirty(open, editing?.id ?? "create", form);
  const saveMeta = useSaveMeta();

  function handleSubmit(e: React.FormEvent) {
    onSubmit(e);
    saveMeta.recordSave();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "원가 수정" : "원가 등록"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="카테고리"
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as ExpenseCategory })
            }
          >
            {(categories.length ? categories : expenseCategories).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
          <div>
            <p className="mb-1.5 text-xs font-medium text-zinc-400">지급 상태</p>
            <Badge variant={PAYOUT_VARIANT[editing?.payoutStatus ?? "unpaid"]}>
              {PAYOUT_LABELS[editing?.payoutStatus ?? "unpaid"]}
            </Badge>
            <p className="mt-1 text-[11px] text-zinc-600">
              담당 입금요청 → 대표·임원 승인 → 재무 지급
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="입금마감일"
            type="date"
            value={form.paymentDueDate}
            onChange={(e) =>
              setForm({ ...form, paymentDueDate: e.target.value })
            }
          />
          <Input
            label="금액"
            type="number"
            min={0}
            value={form.amount || ""}
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
          />
        </div>
        <Input
          label="내용"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="계좌번호"
            value={form.bankAccount}
            onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
          />
          <Input
            label="예금주"
            value={form.accountHolder}
            onChange={(e) =>
              setForm({ ...form, accountHolder: e.target.value })
            }
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <SaveButton
            type="submit"
            dirty={formDirty}
            savedAt={saveMeta.savedAt}
            savedBy={saveMeta.savedBy}
          >
            {editing ? "저장" : "등록"}
          </SaveButton>
        </div>
      </form>
    </Modal>
  );
}
