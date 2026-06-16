"use client";

import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { PostLinksField } from "@/components/executions/PostLinksField";
import { useData } from "@/context/DataContext";
import {
  createEmptyPostLink,
  todayISO,
} from "@/lib/execution-utils";
import { getExecutionTypeLabels } from "@/lib/task-channel-utils";
import type {
  Execution,
  ExecutionInput,
  ExecutionStatus,
  ExecutionType,
} from "@/lib/types";
import { EXECUTION_STATUS_LABELS } from "@/lib/types";

export function ExecutionFormModal({
  open,
  onClose,
  editing,
  form,
  setForm,
  onSubmit,
  showContractSelect,
  contracts,
  onContractChange,
}: {
  open: boolean;
  onClose: () => void;
  editing: Execution | null;
  form: ExecutionInput;
  setForm: (f: ExecutionInput) => void;
  onSubmit: (e: React.FormEvent) => void;
  showContractSelect?: boolean;
  contracts?: { id: string; clientName: string }[];
  onContractChange?: (contractId: string) => void;
}) {
  const data = useData();
  const typeLabels = getExecutionTypeLabels(data);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "실행 수정" : "실행 등록"}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {showContractSelect && contracts && (
          <Select
            label="계약 업체 *"
            value={form.contractId}
            onChange={(e) => onContractChange?.(e.target.value)}
          >
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientName}
              </option>
            ))}
          </Select>
        )}

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
            label="마감일 *"
            type="date"
            value={form.dueDate ?? ""}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="완료일"
            type="date"
            value={form.completedDate ?? ""}
            onChange={(e) =>
              setForm({ ...form, completedDate: e.target.value })
            }
          />
          <Input
            label="입력일"
            type="date"
            value={form.enteredAt ?? todayISO()}
            readOnly
            className="opacity-70"
          />
        </div>

        <Textarea
          label="메모"
          value={form.memo ?? ""}
          onChange={(e) => setForm({ ...form, memo: e.target.value })}
        />

        <PostLinksField
          links={
            form.postLinks?.length
              ? form.postLinks
              : [createEmptyPostLink(form.dueDate)]
          }
          defaultDueDate={form.dueDate}
          onChange={(postLinks) => setForm({ ...form, postLinks })}
        />

        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit">{editing ? "저장" : "등록"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function emptyExecutionForm(contractId = ""): ExecutionInput {
  return {
    contractId,
    type: "optimized",
    status: "pending",
    completedCount: 0,
    targetCount: 0,
    dueDate: "",
    completedDate: "",
    enteredAt: todayISO(),
    memo: "",
    postLinks: [createEmptyPostLink()],
  };
}
