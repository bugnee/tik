"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Receipt, Trash2 } from "lucide-react";
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
  createExpenseCategoryInput,
  getSortedExpenseCategories,
} from "@/lib/expense-category-utils";
import {
  getPartnerFilterSelectOptions,
} from "@/lib/partner-filter-utils";
import type {
  ExpenseCategoryDefinition,
  ExpenseCategoryInput,
  PartnerCategory,
} from "@/lib/types";

export function ExpenseCategoriesSettings() {
  const data = useData();
  const { canManageContractTerms } = useRole();
  const {
    expenseCategories,
    partnerFilterDefinitions,
    expenses,
    taskChannels,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
  } = data;

  const partnerFilterOptions = useMemo(
    () => getPartnerFilterSelectOptions(partnerFilterDefinitions),
    [partnerFilterDefinitions],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseCategoryDefinition | null>(null);
  const [form, setForm] = useState<ExpenseCategoryInput | null>(null);

  const sorted = useMemo(
    () => getSortedExpenseCategories(expenseCategories),
    [expenseCategories],
  );

  if (!canManageContractTerms) {
    return null;
  }

  function openCreate() {
    setEditing(null);
    setForm(createExpenseCategoryInput("새 분야", expenseCategories));
    setModalOpen(true);
  }

  function openEdit(category: ExpenseCategoryDefinition) {
    setEditing(category);
    setForm({ ...category });
    setModalOpen(true);
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form?.label.trim()) return;
    if (editing) {
      updateExpenseCategory(editing.id, form);
    } else {
      addExpenseCategory(form);
    }
    setModalOpen(false);
  }

  function handleDelete(category: ExpenseCategoryDefinition) {
    if (category.isSystem) {
      alert("기본 분야(기자단·체험단 등)는 삭제할 수 없습니다. 비활성화를 사용해 주세요.");
      return;
    }
    const inUse =
      expenses.some((e) => e.category === category.id) ||
      taskChannels.some((ch) => ch.expenseCategory === category.id);
    if (inUse) {
      alert("연결된 원가·집행 항목이 있어 삭제할 수 없습니다. 비활성화를 사용해 주세요.");
      return;
    }
    if (confirm(`「${category.label}」 분야를 삭제하시겠습니까?`)) {
      const ok = deleteExpenseCategory(category.id);
      if (!ok) alert("삭제할 수 없습니다.");
    }
  }

  return (
    <>
      <PageHeader
        title="집행 분야 설정"
        description="원가 등록 · 집행 원가 화면의 분야 목록 (기자단, 체험단, 경비 등)"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            분야 추가
          </Button>
        }
      />

      <Card className="mb-6 border-cyan-500/20 bg-cyan-500/5">
        <div className="flex gap-3 px-6 py-4 text-sm text-zinc-400">
          <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <p>
            표시 이름·순서·활성 여부를 변경하면 원가 등록, 재무·계약 상세 등에
            즉시 반영됩니다. 경비는 파트너사 필터 없이 일반 경비 입력에
            사용합니다.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={`등록 분야 (${sorted.length})`}
          subtitle="비활성 분야는 신규 원가 등록에서 숨김"
        />
        <DataTable>
          <thead>
            <tr>
              <Th>표시명</Th>
              <Th>코드</Th>
              <Th>파트너 필터</Th>
              <Th>순서</Th>
              <Th>상태</Th>
              <Th className="w-24">관리</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((category) => (
              <Tr key={category.id}>
                <Td className="font-medium text-zinc-100">{category.label}</Td>
                <Td className="font-mono text-xs text-zinc-500">
                  {category.id}
                  {category.isSystem && (
                    <Badge variant="default" className="ml-2">
                      기본
                    </Badge>
                  )}
                </Td>
                <Td>
                  {category.partnerCategory ? (
                    <PartnerFilterBadge
                      filters={partnerFilterDefinitions}
                      taskChannels={taskChannels}
                      categoryId={category.partnerCategory}
                    />
                  ) : (
                    <span className="text-xs text-zinc-500">없음</span>
                  )}
                </Td>
                <Td className="font-mono text-zinc-400">{category.sortOrder}</Td>
                <Td>
                  {category.isActive ? (
                    <Badge variant="success">사용</Badge>
                  ) : (
                    <Badge variant="default">비활성</Badge>
                  )}
                </Td>
                <Td>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(category)}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {!category.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
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
          title={editing ? "집행 분야 수정" : "집행 분야 추가"}
        >
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="표시명 *"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="예: 경비, 촬영비"
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
              label="파트너사 필터"
              value={form.partnerCategory ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  partnerCategory: e.target.value
                    ? (e.target.value as PartnerCategory)
                    : null,
                })
              }
            >
              {partnerFilterOptions.map((opt) => (
                <option key={opt.value || "none"} value={opt.value}>
                  {opt.label}
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
              label="활성 (원가 등록에 표시)"
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
