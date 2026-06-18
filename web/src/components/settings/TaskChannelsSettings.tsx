"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  DataTable,
  PageHeader,
  Td,
  Th,
  Tr,
} from "@/components/ui/DataTable";
import { Checkbox, Input, Select } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { PartnerFilterBadge } from "@/components/ui/PartnerFilterBadge";
import {
  getPartnerFilterSelectOptions,
} from "@/lib/partner-filter-utils";
import {
  createTaskChannelInput,
  getSortedTaskChannels,
  TASK_CHANNEL_ACCENT_LABELS,
  TASK_CHANNEL_ACCENT_OPTIONS,
} from "@/lib/task-channel-utils";
import type {
  ExecutionType,
  ExpenseCategory,
  PartnerCategory,
  TaskChannelAccent,
  TaskChannelDefinition,
  TaskChannelInput,
  TaskChannelKind,
} from "@/lib/types";
import {
  getActiveExpenseCategories,
  getSortedExpenseCategories,
} from "@/lib/expense-category-utils";

const KIND_LABELS: Record<TaskChannelKind, string> = {
  contract_target: "계약 목표 · 업무 생성",
  referral_promo: "리셀러 프로모 (시스템)",
  execution_only: "실행 등록 전용",
};

const EXECUTION_TYPES: ExecutionType[] = [
  "optimized",
  "influencer",
  "experience",
  "press",
];

export function TaskChannelsSettings() {
  const data = useData();
  const { canManageContractTerms } = useRole();
  const {
    taskChannels,
    expenseCategories,
    partnerFilterDefinitions,
    workOrders,
    addTaskChannel,
    updateTaskChannel,
    deleteTaskChannel,
  } = data;

  const partnerFilterOptions = useMemo(
    () => getPartnerFilterSelectOptions(partnerFilterDefinitions, false),
    [partnerFilterDefinitions],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TaskChannelDefinition | null>(null);
  const [form, setForm] = useState<TaskChannelInput | null>(null);

  const sorted = useMemo(
    () => getSortedTaskChannels(taskChannels),
    [taskChannels],
  );

  if (!canManageContractTerms) {
    return (
      <Card className="py-16 text-center">
        <p className="text-sm text-zinc-400">
          집행 항목 설정은 대표·임원만 변경할 수 있습니다.
        </p>
      </Card>
    );
  }

  function openCreate() {
    setEditing(null);
    setForm(createTaskChannelInput("새 항목", taskChannels));
    setModalOpen(true);
  }

  function openEdit(channel: TaskChannelDefinition) {
    setEditing(channel);
    setForm({ ...channel });
    setModalOpen(true);
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form?.label.trim()) return;
    if (editing) {
      updateTaskChannel(editing.id, form);
    } else {
      addTaskChannel(form);
    }
    setModalOpen(false);
  }

  function handleDelete(channel: TaskChannelDefinition) {
    if (channel.isSystem) {
      alert("시스템 항목(리셀러)은 삭제할 수 없습니다.");
      return;
    }
    const inUse = workOrders.some((w) => w.taskType === channel.id);
    if (inUse) {
      alert("연결된 업무가 있어 삭제할 수 없습니다. 비활성화를 사용해 주세요.");
      return;
    }
    if (confirm(`「${channel.label}」 항목을 삭제하시겠습니까?`)) {
      deleteTaskChannel(channel.id);
    }
  }

  return (
    <>
      <PageHeader
        title="집행 항목 설정"
        description="최적블로그 · 인플루언서 · 인스타카드 등 — 계약·업무·링크 보고서·실행 진행에 공통 반영"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            항목 추가
          </Button>
        }
      />

      <Card className="mb-6 border-emerald-500/20 bg-emerald-500/5">
        <div className="flex gap-3 px-6 py-4 text-sm text-zinc-400">
          <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <p>
            표시 이름·순서·활성 여부를 변경하면 대시보드, 실행 진행, 고객사
            링크 보고서, 계약 목표 입력 등 연동 화면에 즉시 반영됩니다.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={`등록 항목 (${sorted.length})`}
          subtitle="비활성 항목은 신규 업무 생성·계약 입력에서 숨김"
        />
        <DataTable>
          <thead>
            <tr>
              <Th>표시명</Th>
              <Th>색상</Th>
              <Th>유형</Th>
              <Th>파트너</Th>
              <Th>순서</Th>
              <Th>상태</Th>
              <Th className="w-24">관리</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((channel) => (
              <Tr key={channel.id}>
                <Td className="font-medium text-zinc-100">{channel.label}</Td>
                <Td>
                  <TaskChannelBadge
                    data={data}
                    taskType={channel.id}
                    label={channel.label}
                  />
                </Td>
                <Td className="text-xs text-zinc-400">
                  {KIND_LABELS[channel.kind]}
                  {channel.isSystem && (
                    <Badge variant="default" className="ml-2">
                      시스템
                    </Badge>
                  )}
                </Td>
                <Td>
                  {channel.partnerCategory ? (
                    <PartnerFilterBadge
                      filters={partnerFilterDefinitions}
                      taskChannels={taskChannels}
                      categoryId={channel.partnerCategory}
                    />
                  ) : (
                    <span className="text-xs text-zinc-500">-</span>
                  )}
                </Td>
                <Td className="font-mono text-zinc-400">{channel.sortOrder}</Td>
                <Td>
                  {channel.isActive ? (
                    <Badge variant="success">사용</Badge>
                  ) : (
                    <Badge variant="default">비활성</Badge>
                  )}
                </Td>
                <Td>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(channel)}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {!channel.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDelete(channel)}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "집행 항목 수정" : "집행 항목 추가"}
        size="lg"
      >
        {form && (
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="표시 이름 *"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="예: 숏폼, 유튜브 쇼츠"
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="구분 색상"
                value={form.accentColor ?? "emerald"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    accentColor: e.target.value as TaskChannelAccent,
                  })
                }
              >
                {TASK_CHANNEL_ACCENT_OPTIONS.map((accent) => (
                  <option key={accent} value={accent}>
                    {TASK_CHANNEL_ACCENT_LABELS[accent]}
                  </option>
                ))}
              </Select>
              <Select
                label="파트너 분야"
                value={form.partnerCategory ?? "blog"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    partnerCategory: e.target.value as PartnerCategory,
                  })
                }
                disabled={editing?.isSystem}
              >
                {(partnerFilterOptions.length
                  ? partnerFilterOptions
                  : [{ value: "blog", label: "블로그" }]
                ).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <Input
              label="정렬 순서"
              type="number"
              min={1}
              value={form.sortOrder}
              onChange={(e) =>
                setForm({ ...form, sortOrder: Number(e.target.value) || 1 })
              }
            />
            {!editing?.isSystem && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="실행 유형 연동"
                  value={form.executionType ?? "optimized"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      executionType: e.target.value as ExecutionType,
                    })
                  }
                >
                  {EXECUTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
                <Select
                  label="원가 카테고리"
                  value={form.expenseCategory ?? "other"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      expenseCategory: e.target.value as ExpenseCategory,
                    })
                  }
                >
                  {(getActiveExpenseCategories(expenseCategories).length
                    ? getActiveExpenseCategories(expenseCategories)
                    : getSortedExpenseCategories(expenseCategories)
                  ).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className="flex flex-wrap gap-6">
              <Checkbox
                label="활성 (계약·업무에 표시)"
                checked={form.isActive}
                onChange={(v) => setForm({ ...form, isActive: v })}
              />
              {!editing?.isSystem && (
                <Checkbox
                  label="입금 확인 시 실행 진행 반영"
                  checked={form.syncExecution ?? true}
                  onChange={(v) => setForm({ ...form, syncExecution: v })}
                />
              )}
            </div>
            {editing && (
              <p className="text-xs text-zinc-600">
                ID: <span className="font-mono">{form.id}</span>
                {form.contractTargetField &&
                  ` · 계약 필드: ${form.contractTargetField}`}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalOpen(false)}
              >
                취소
              </Button>
              <Button type="submit">{editing ? "저장" : "추가"}</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
