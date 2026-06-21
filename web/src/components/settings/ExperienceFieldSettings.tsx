"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useExperience } from "@/features/experience/useExperience";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SaveButton } from "@/components/ui/SaveButton";
import { useSaveMeta } from "@/hooks/useSaveMeta";
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
import {
  createExperienceFieldInput,
  formatExperienceFieldAssignees,
  getSortedExperienceFields,
} from "@/lib/experience-field-utils";
import { getUserName } from "@/lib/selectors";
import type {
  ExperienceFieldDefinition,
  ExperienceFieldDefinitionInput,
} from "@/lib/types";
import { useFormDirty } from "@/hooks/useFormDirty";

export function ExperienceFieldSettings() {
  const data = useData();
  const { canManageContractTerms } = useRole();
  const {
    experienceFieldDefinitions,
    addExperienceFieldDefinition,
    updateExperienceFieldDefinition,
    deleteExperienceFieldDefinition,
  } = useExperience();
  const { users, experienceCampaigns } = data;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExperienceFieldDefinition | null>(null);
  const [form, setForm] = useState<ExperienceFieldDefinitionInput | null>(null);

  const sorted = useMemo(
    () => getSortedExperienceFields(experienceFieldDefinitions),
    [experienceFieldDefinitions],
  );

  const executives = useMemo(
    () => users.filter((u) => u.role === "executive"),
    [users],
  );

  const teamLeaders = useMemo(
    () => users.filter((u) => u.role === "team_leader"),
    [users],
  );
  const formDirty = useFormDirty(
    modalOpen && !!form,
    editing?.id ?? "create",
    form ?? {},
  );
  const saveMeta = useSaveMeta();

  if (!canManageContractTerms) {
    return null;
  }

  function openCreate() {
    setEditing(null);
    setForm(createExperienceFieldInput("새 분야", experienceFieldDefinitions));
    setModalOpen(true);
  }

  function openEdit(field: ExperienceFieldDefinition) {
    setEditing(field);
    setForm({ ...field });
    setModalOpen(true);
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form?.label.trim()) return;
    if (editing) {
      updateExperienceFieldDefinition(editing.id, form);
    } else {
      addExperienceFieldDefinition(form);
    }
    saveMeta.recordSave();
    setModalOpen(false);
  }

  function handleDelete(field: ExperienceFieldDefinition) {
    if (field.isSystem) {
      alert("기본 분야는 삭제할 수 없습니다. 비활성화를 사용해 주세요.");
      return;
    }
    const inUse = (experienceCampaigns ?? []).some((campaign) => {
      const cat = campaign.criteria.category;
      return cat === field.id || cat === field.label;
    });
    if (inUse) {
      alert("체험단 모집에서 사용 중인 분야는 삭제할 수 없습니다.");
      return;
    }
    if (confirm(`「${field.label}」 분야를 삭제하시겠습니까?`)) {
      const ok = deleteExperienceFieldDefinition(field.id);
      if (!ok) alert("삭제할 수 없습니다.");
    }
  }

  return (
    <>
      <PageHeader
        title="체험단 분야 설정"
        description="체험단 모집 분야별 담당 임원 · 팀장 배정 (맛집, 뷰티 등)"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            분야 추가
          </Button>
        }
      />

      <Card className="mb-6 border-amber-500/20 bg-amber-500/5">
        <div className="flex gap-3 px-6 py-4 text-sm text-zinc-400">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p>
            실행 진행 · 체험단 모집 화면의 「분야」 선택 목록과 연동됩니다.
            분야별 임원·팀장은 체험단 조율 시 담당 조직을 안내하는 데
            사용됩니다.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={`등록 분야 (${sorted.length})`}
          subtitle="비활성 분야는 체험단 모집 선택 목록에서 숨김"
        />
        <DataTable>
          <thead>
            <tr>
              <Th>분야명</Th>
              <Th>분야 임원</Th>
              <Th>팀장</Th>
              <Th>순서</Th>
              <Th>상태</Th>
              <Th className="w-24">관리</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((field) => (
              <Tr key={field.id}>
                <Td className="font-medium text-zinc-100">
                  {field.label}
                  {field.isSystem && (
                    <Badge variant="info" className="ml-2">
                      기본
                    </Badge>
                  )}
                </Td>
                <Td>
                  {field.executiveUserId
                    ? getUserName(data, field.executiveUserId)
                    : "-"}
                </Td>
                <Td>
                  {field.teamLeaderUserId
                    ? getUserName(data, field.teamLeaderUserId)
                    : "-"}
                </Td>
                <Td className="font-mono text-zinc-400">{field.sortOrder}</Td>
                <Td>
                  {field.isActive ? (
                    <Badge variant="success">활성</Badge>
                  ) : (
                    <Badge variant="default">비활성</Badge>
                  )}
                </Td>
                <Td>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(field)}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {!field.isSystem && (
                      <button
                        type="button"
                        onClick={() => handleDelete(field)}
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
        title={editing ? "체험단 분야 수정" : "체험단 분야 추가"}
      >
        {form && (
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="분야명 *"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="맛집, 뷰티, 여행 등"
              required
            />
            <Select
              label="분야 임원"
              value={form.executiveUserId ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  executiveUserId: e.target.value || undefined,
                })
              }
            >
              <option value="">미지정</option>
              {executives.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
            <Select
              label="팀장"
              value={form.teamLeaderUserId ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  teamLeaderUserId: e.target.value || undefined,
                })
              }
            >
              <option value="">미지정</option>
              {teamLeaders.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
            <Input
              label="표시 순서"
              type="number"
              min={1}
              value={form.sortOrder}
              onChange={(e) =>
                setForm({ ...form, sortOrder: Number(e.target.value) || 1 })
              }
            />
            <Checkbox
              label="활성 (체험단 모집 선택 목록에 표시)"
              checked={form.isActive}
              onChange={(v) => setForm({ ...form, isActive: v })}
            />
            <p className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-500">
              미리보기:{" "}
              {formatExperienceFieldAssignees(data, form as ExperienceFieldDefinition)}
            </p>
            <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalOpen(false)}
              >
                취소
              </Button>
              <SaveButton
                type="submit"
                dirty={formDirty}
                savedAt={saveMeta.savedAt}
                savedBy={saveMeta.savedBy}
              >
                {editing ? "저장" : "추가"}
              </SaveButton>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
