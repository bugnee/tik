"use client";

import { useMemo, useState } from "react";
import { Filter, Pencil, Plus, Trash2 } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
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
  createPartnerFilterInput,
  getPartnerFilterAccentLabel,
  getSortedPartnerFilters,
} from "@/lib/partner-filter-utils";
import {
  TASK_CHANNEL_ACCENT_LABELS,
  TASK_CHANNEL_ACCENT_OPTIONS,
} from "@/lib/task-channel-utils";
import type {
  PartnerFilterDefinition,
  PartnerFilterDefinitionInput,
  TaskChannelAccent,
} from "@/lib/types";

export function PartnerFilterSettings() {
  const data = useData();
  const { canManageContractTerms } = useRole();
  const {
    partnerFilterDefinitions,
    partners,
    expenseCategories,
    taskChannels,
    addPartnerFilterDefinition,
    updatePartnerFilterDefinition,
    deletePartnerFilterDefinition,
  } = data;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PartnerFilterDefinition | null>(null);
  const [form, setForm] = useState<PartnerFilterDefinitionInput | null>(null);

  const sorted = useMemo(
    () => getSortedPartnerFilters(partnerFilterDefinitions),
    [partnerFilterDefinitions],
  );

  if (!canManageContractTerms) {
    return null;
  }

  function openCreate() {
    setEditing(null);
    setForm(createPartnerFilterInput("새 필터", partnerFilterDefinitions));
    setModalOpen(true);
  }

  function openEdit(filter: PartnerFilterDefinition) {
    setEditing(filter);
    setForm({ ...filter });
    setModalOpen(true);
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form?.label.trim()) return;
    if (editing) {
      updatePartnerFilterDefinition(editing.id, form);
    } else {
      addPartnerFilterDefinition(form);
    }
    setModalOpen(false);
  }

  function handleDelete(filter: PartnerFilterDefinition) {
    if (filter.isSystem) {
      alert("기본 필터(기자단·체험단 등)는 삭제할 수 없습니다. 비활성화를 사용해 주세요.");
      return;
    }
    const inUse =
      partners.some((p) => p.categories.includes(filter.id)) ||
      expenseCategories.some((c) => c.partnerCategory === filter.id) ||
      taskChannels.some((ch) => ch.partnerCategory === filter.id);
    if (inUse) {
      alert(
        "연결된 파트너·집행 분야·집행 항목이 있어 삭제할 수 없습니다. 비활성화를 사용해 주세요.",
      );
      return;
    }
    if (confirm(`「${filter.label}」 필터를 삭제하시겠습니까?`)) {
      const ok = deletePartnerFilterDefinition(filter.id);
      if (!ok) alert("삭제할 수 없습니다.");
    }
  }

  return (
    <>
      <PageHeader
        title="파트너사 필터 설정"
        description="원가·집행 분야별로 연결할 파트너사 유형 (기자단, 체험단, 인플루언서 등)"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            필터 추가
          </Button>
        }
      />

      <Card className="mb-6 border-violet-500/20 bg-violet-500/5">
        <div className="flex gap-3 px-6 py-4 text-sm text-zinc-400">
          <Filter className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
          <p>
            집행 분야 설정에서 각 분야에 파트너사 필터를 연결하면, 원가 등록 시
            해당 유형 파트너만 선택됩니다. 색상은 집행 항목·파트너 목록 배지와
            동일하게 표시됩니다.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={`등록 필터 (${sorted.length})`}
          subtitle="비활성 필터는 집행 분야 연결 목록에서 숨김"
        />
        <DataTable>
          <thead>
            <tr>
              <Th>표시명</Th>
              <Th>색상</Th>
              <Th>코드</Th>
              <Th>순서</Th>
              <Th>상태</Th>
              <Th className="w-24">관리</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((filter) => (
              <Tr key={filter.id}>
                <Td className="font-medium text-zinc-100">
                  <PartnerFilterBadge
                    filters={partnerFilterDefinitions}
                    taskChannels={taskChannels}
                    categoryId={filter.id}
                    label={filter.label}
                  />
                </Td>
                <Td className="text-xs text-zinc-400">
                  {getPartnerFilterAccentLabel(
                    partnerFilterDefinitions,
                    filter.id,
                    taskChannels,
                  )}
                </Td>
                <Td className="font-mono text-xs text-zinc-500">
                  {filter.id}
                  {filter.isSystem && (
                    <Badge variant="default" className="ml-2">
                      기본
                    </Badge>
                  )}
                </Td>
                <Td className="font-mono text-zinc-400">{filter.sortOrder}</Td>
                <Td>
                  {filter.isActive ? (
                    <Badge variant="success">사용</Badge>
                  ) : (
                    <Badge variant="default">비활성</Badge>
                  )}
                </Td>
                <Td>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(filter)}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {!filter.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDelete(filter)}
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

      {form && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? "파트너사 필터 수정" : "파트너사 필터 추가"}
        >
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="표시명 *"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="예: 기자단, 체험단"
              required
            />
            {!editing && (
              <Input
                label="코드 (자동)"
                value={form.id}
                readOnly
                className="font-mono text-zinc-500"
              />
            )}
            <Select
              label="배지 색상"
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
            <Input
              label="표시 순서"
              type="number"
              min={1}
              value={form.sortOrder}
              onChange={(e) =>
                setForm({ ...form, sortOrder: Number(e.target.value) })
              }
            />
            <Checkbox
              label="활성 (집행 분야 연결 목록에 표시)"
              checked={form.isActive}
              onChange={(v) => setForm({ ...form, isActive: v })}
            />
            <div className="flex gap-2 pt-2">
              <Button type="submit">저장</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalOpen(false)}
              >
                취소
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
