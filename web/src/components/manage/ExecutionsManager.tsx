"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useData } from "@/context/DataContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SaveButton } from "@/components/ui/SaveButton";
import { useSaveMeta } from "@/hooks/useSaveMeta";
import { Card } from "@/components/ui/Card";
import {
  DataTable,
  EmptyState,
  PageHeader,
  Td,
  Th,
  Tr,
} from "@/components/ui/DataTable";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { LIST_SEARCH_PLACEHOLDERS } from "@/lib/list-ui-consistency";
import { Input, Select, Textarea } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { PostLinksCell, PostLinksField } from "@/components/executions/PostLinksField";
import { migratePostLinks, prepareExecutionInput } from "@/lib/execution-utils";
import { enrichExecution } from "@/lib/selectors";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import { getExecutionTypeLabel, getExecutionTypeLabels } from "@/lib/task-channel-utils";
import type { Execution, ExecutionInput, ExecutionStatus, ExecutionType, PostLinkEntry } from "@/lib/types";
import { EXECUTION_STATUS_LABELS } from "@/lib/types";
import { useFormDirty } from "@/hooks/useFormDirty";

const STATUS_VARIANT: Record<ExecutionStatus, "default" | "warning" | "success" | "danger"> = {
  pending: "default",
  in_progress: "warning",
  completed: "success",
  delayed: "danger",
};

const emptyForm = (): ExecutionInput => ({
  contractId: "",
  type: "optimized",
  status: "pending",
  completedCount: 0,
  targetCount: 0,
  dueDate: "",
  memo: "",
  postLinks: [],
});

export function ExecutionsManager() {
  const data = useData();
  const { executions, contracts, addExecution, updateExecution, deleteExecution } = data;
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Execution | null>(null);
  const [form, setForm] = useState<ExecutionInput>(emptyForm());
  const formDirty = useFormDirty(
    modalOpen,
    editing?.id ?? "create",
    form,
  );
  const saveMeta = useSaveMeta(
    editing?.enteredAt ? { savedAt: editing.enteredAt } : null,
  );

  const enriched = useMemo(
    () => executions.map((e) => enrichExecution(data, e)),
    [executions, data],
  );

  const typeLabels = useMemo(() => getExecutionTypeLabels(data), [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enriched.filter((e) => {
      const matchSearch =
        e.clientName.toLowerCase().includes(q) ||
        getExecutionTypeLabel(data, e.type).includes(q);
      const matchStatus = filterStatus === "all" || e.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [enriched, search, filterStatus, data]);

  function openCreate() {
    setEditing(null);
    const first = contracts[0];
    setForm({
      ...emptyForm(),
      contractId: first?.id ?? "",
      targetCount: first?.targetOptimized ?? 8,
    });
    setModalOpen(true);
  }

  function openEdit(e: Execution) {
    setEditing(e);
    setForm({
      ...e,
      postLinks: migratePostLinks(
        e.postLinks as string[] | PostLinkEntry[] | undefined,
        e.dueDate,
      ),
    });
    setModalOpen(true);
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.contractId) return;
    const payload = prepareExecutionInput(form);
    if (editing) {
      updateExecution(editing.id, payload);
    } else {
      addExecution(payload);
    }
    saveMeta.recordSave();
    setModalOpen(false);
  }

  function onContractChange(contractId: string) {
    const c = contracts.find((x) => x.id === contractId);
    const target =
      form.type === "optimized"
        ? c?.targetOptimized ?? 0
        : form.type === "influencer"
          ? c?.targetInfluencer ?? 0
          : form.targetCount;
    setForm({ ...form, contractId, targetCount: target });
  }

  return (
    <>
      <PageHeader
        title="실행 현황"
        description={`포스팅 ${executions.length}건 · 계약별 실행 타입·상태 관리`}
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            실행 등록
          </Button>
        }
      />

      <Card className="mb-4">
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={LIST_SEARCH_PLACEHOLDERS.executions}
          filters={
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-36"
            >
              <option value="all">전체 상태</option>
              {(Object.keys(EXECUTION_STATUS_LABELS) as ExecutionStatus[]).map(
                (s) => (
                  <option key={s} value={s}>
                    {EXECUTION_STATUS_LABELS[s]}
                  </option>
                ),
              )}
            </Select>
          }
        />
      </Card>

      <DataTable>
        <thead>
          <tr>
            <Th>업체</Th>
            <Th>유형</Th>
            <Th>진행</Th>
            <Th>포스팅 링크</Th>
            <Th>상태</Th>
            <Th>마감일</Th>
            <Th className="w-24">관리</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((e) => (
            <Tr key={e.id}>
              <Td className="font-medium text-zinc-100">{e.clientName}</Td>
              <Td>
                <TaskChannelBadge
                  data={data}
                  taskType={e.taskChannelId}
                  executionType={e.type}
                />
              </Td>
              <Td className="font-mono">
                {e.completedCount}/{e.targetCount}
              </Td>
              <Td>
                <PostLinksCell links={e.postLinks} fallbackDueDate={e.dueDate} />
              </Td>
              <Td>
                <Badge variant={STATUS_VARIANT[e.status]}>
                  {EXECUTION_STATUS_LABELS[e.status]}
                </Badge>
              </Td>
              <Td>{e.dueDate ?? "-"}</Td>
              <Td>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(e)}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("삭제하시겠습니까?")) deleteExecution(e.id);
                    }}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Td>
            </Tr>
          ))}
        </tbody>
      </DataTable>

      {filtered.length === 0 && <EmptyState message="실행 데이터가 없습니다" />}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "실행 수정" : "실행 등록"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="계약 업체 *"
            value={form.contractId}
            onChange={(e) => onContractChange(e.target.value)}
          >
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.clientName}
              </option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="실행 유형 *"
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as ExecutionType,
                })
              }
            >
              {(Object.keys(typeLabels) as ExecutionType[]).map((t) => (
                <option key={t} value={t}>
                  {typeLabels[t]}
                </option>
              ))}
            </Select>
            <Select
              label="상태 *"
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as ExecutionStatus,
                })
              }
            >
              {(Object.keys(EXECUTION_STATUS_LABELS) as ExecutionStatus[]).map((s) => (
                <option key={s} value={s}>
                  {EXECUTION_STATUS_LABELS[s]}
                </option>
              ))}
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
            contract={contracts.find((c) => c.id === form.contractId) ?? null}
            onChange={(postLinks) => setForm({ ...form, postLinks })}
          />
          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
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
    </>
  );
}
