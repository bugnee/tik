"use client";

import { useState } from "react";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { useExperience } from "@/features/experience/useExperience";
import { useRole } from "@/context/RoleContext";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/FormFields";
import {
  emptyParticipantInput,
  formatParticipantLabel,
} from "@/lib/experience-campaign-utils";
import type {
  ExperienceCampaign,
  ExperienceParticipant,
  ExperienceParticipantInput,
  ExperienceParticipantUpdate,
} from "@/lib/types";

function patchParticipant(
  participant: ExperienceParticipant,
  patch: ExperienceParticipantUpdate,
): ExperienceParticipantUpdate {
  return {
    blogName: patch.blogName ?? participant.blogName ?? "",
    name: patch.name ?? participant.name,
    contact: patch.contact ?? participant.contact ?? "",
    experienceDate: patch.experienceDate ?? participant.experienceDate ?? "",
    headcount: patch.headcount ?? participant.headcount ?? 1,
    memo: patch.memo ?? participant.memo ?? "",
    postUrl: patch.postUrl ?? participant.postUrl ?? "",
    postRegisteredAt:
      patch.postRegisteredAt ?? participant.postRegisteredAt ?? "",
  };
}

function ParticipantRow({
  campaignId,
  participant,
  readOnly,
  onRemove,
  onUpdate,
}: {
  campaignId: string;
  participant: ExperienceParticipant;
  readOnly?: boolean;
  onRemove: (campaignId: string, participantId: string) => void;
  onUpdate: (
    campaignId: string,
    participantId: string,
    patch: ExperienceParticipantUpdate,
  ) => void;
}) {
  function save(patch: ExperienceParticipantUpdate) {
    onUpdate(campaignId, participant.id, patchParticipant(participant, patch));
  }

  if (readOnly) {
    return (
      <tr className="border-t border-zinc-800/80">
        <td className="px-2 py-2 text-sm text-zinc-200">
          {participant.blogName || participant.snsHandle || "-"}
        </td>
        <td className="px-2 py-2 text-sm text-zinc-200">{participant.name}</td>
        <td className="px-2 py-2 text-sm text-zinc-400">
          {participant.contact || "-"}
        </td>
        <td className="px-2 py-2 text-sm text-zinc-400">
          {participant.experienceDate || "-"}
        </td>
        <td className="px-2 py-2 text-sm text-zinc-400">
          {participant.headcount ?? 1}명
        </td>
        <td className="px-2 py-2 text-sm text-zinc-500">
          {participant.memo || "-"}
        </td>
        <td className="px-2 py-2 text-sm">
          {participant.postUrl ? (
            <a
              href={participant.postUrl}
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline"
            >
              포스팅
            </a>
          ) : (
            <span className="text-zinc-600">-</span>
          )}
        </td>
        <td className="px-2 py-2 text-sm text-zinc-400">
          {participant.postRegisteredAt || "-"}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-zinc-800/80 align-top">
      <td className="px-1 py-1.5">
        <Input
          aria-label="블로그명"
          value={participant.blogName ?? participant.snsHandle ?? ""}
          onChange={(e) => save({ blogName: e.target.value })}
          placeholder="블로그명"
          className="min-w-[7rem]"
        />
      </td>
      <td className="px-1 py-1.5">
        <Input
          aria-label="이름"
          value={participant.name}
          onChange={(e) => save({ name: e.target.value })}
          placeholder="이름"
          className="min-w-[5rem]"
        />
      </td>
      <td className="px-1 py-1.5">
        <Input
          aria-label="연락처"
          value={participant.contact ?? ""}
          onChange={(e) => save({ contact: e.target.value })}
          placeholder="010-0000-0000"
          className="min-w-[7rem]"
        />
      </td>
      <td className="px-1 py-1.5">
        <Input
          aria-label="체험일자"
          type="date"
          value={participant.experienceDate ?? ""}
          onChange={(e) => save({ experienceDate: e.target.value })}
          className="min-w-[8rem]"
        />
      </td>
      <td className="px-1 py-1.5">
        <Input
          aria-label="인원"
          type="number"
          min={1}
          value={participant.headcount ?? 1}
          onChange={(e) =>
            save({ headcount: Number(e.target.value) || 1 })
          }
          className="min-w-[3.5rem]"
        />
      </td>
      <td className="px-1 py-1.5">
        <Textarea
          aria-label="메모"
          value={participant.memo ?? ""}
          onChange={(e) => save({ memo: e.target.value })}
          rows={2}
          placeholder="메모"
          className="min-w-[8rem]"
        />
      </td>
      <td className="px-1 py-1.5">
        <Input
          aria-label="포스팅 주소"
          type="url"
          value={participant.postUrl ?? ""}
          onChange={(e) => save({ postUrl: e.target.value })}
          placeholder="https://"
          className="min-w-[9rem]"
        />
      </td>
      <td className="px-1 py-1.5">
        <div className="flex items-start gap-1">
          <Input
            aria-label="포스팅 등록날짜"
            type="date"
            value={participant.postRegisteredAt ?? ""}
            onChange={(e) => save({ postRegisteredAt: e.target.value })}
            className="min-w-[8rem]"
          />
          <button
            type="button"
            onClick={() => onRemove(campaignId, participant.id)}
            className="mt-2 rounded p-1 text-rose-400 hover:bg-rose-500/10"
            title="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function ExperienceParticipantListEditor({
  campaign,
  readOnly = false,
}: {
  campaign: ExperienceCampaign;
  readOnly?: boolean;
}) {
  const {
    addExperienceParticipant,
    updateExperienceParticipant,
    removeExperienceParticipant,
  } = useExperience();
  const { currentUser } = useRole();
  const [draft, setDraft] = useState<ExperienceParticipantInput>(() =>
    emptyParticipantInput(campaign),
  );

  function updateDraft(patch: Partial<ExperienceParticipantInput>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function handleAdd() {
    const name = draft.name.trim();
    const blogName = draft.blogName?.trim();
    if (!name && !blogName) return;

    addExperienceParticipant(campaign.id, currentUser.id, {
      ...draft,
      name: name || blogName || "미입력",
      blogName: blogName || undefined,
      contact: draft.contact?.trim() || undefined,
      experienceDate: draft.experienceDate || campaign.confirmedVisitDate || undefined,
      headcount: draft.headcount && draft.headcount > 0 ? draft.headcount : 1,
      memo: draft.memo?.trim() || undefined,
      postUrl: draft.postUrl?.trim() || undefined,
      postRegisteredAt: draft.postRegisteredAt || undefined,
    });
    setDraft(emptyParticipantInput(campaign));
  }

  const canAdd = !!(draft.name.trim() || draft.blogName?.trim());

  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-400">
        <UserPlus className="h-3.5 w-3.5" />
        모집 참가자 ({campaign.participants.length}/
        {campaign.criteria.targetHeadcount}명)
      </p>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[920px] text-left">
          <thead>
            <tr className="bg-zinc-900/60 text-[11px] text-zinc-500">
              <th className="px-2 py-2 font-medium">블로그명</th>
              <th className="px-2 py-2 font-medium">이름</th>
              <th className="px-2 py-2 font-medium">연락처</th>
              <th className="px-2 py-2 font-medium">체험일자</th>
              <th className="px-2 py-2 font-medium">인원</th>
              <th className="px-2 py-2 font-medium">메모</th>
              <th className="px-2 py-2 font-medium">포스팅 주소</th>
              <th className="px-2 py-2 font-medium">등록날짜</th>
            </tr>
          </thead>
          <tbody>
            {campaign.participants.map((participant) => (
              <ParticipantRow
                key={participant.id}
                campaignId={campaign.id}
                participant={participant}
                readOnly={readOnly}
                onRemove={removeExperienceParticipant}
                onUpdate={updateExperienceParticipant}
              />
            ))}

            {!readOnly && (
              <tr className="border-t border-zinc-800/80 align-top bg-zinc-950/30">
                <td className="px-1 py-1.5">
                  <Input
                    aria-label="블로그명"
                    value={draft.blogName ?? ""}
                    onChange={(e) => updateDraft({ blogName: e.target.value })}
                    placeholder="블로그명"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <Input
                    aria-label="이름"
                    value={draft.name}
                    onChange={(e) => updateDraft({ name: e.target.value })}
                    placeholder="이름"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <Input
                    aria-label="연락처"
                    value={draft.contact ?? ""}
                    onChange={(e) => updateDraft({ contact: e.target.value })}
                    placeholder="010-0000-0000"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <Input
                    aria-label="체험일자"
                    type="date"
                    value={draft.experienceDate ?? ""}
                    onChange={(e) =>
                      updateDraft({ experienceDate: e.target.value })
                    }
                  />
                </td>
                <td className="px-1 py-1.5">
                  <Input
                    aria-label="인원"
                    type="number"
                    min={1}
                    value={draft.headcount ?? 1}
                    onChange={(e) =>
                      updateDraft({
                        headcount: Number(e.target.value) || 1,
                      })
                    }
                  />
                </td>
                <td className="px-1 py-1.5">
                  <Textarea
                    aria-label="메모"
                    value={draft.memo ?? ""}
                    onChange={(e) => updateDraft({ memo: e.target.value })}
                    rows={2}
                    placeholder="메모"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <Input
                    aria-label="포스팅 주소"
                    type="url"
                    value={draft.postUrl ?? ""}
                    onChange={(e) => updateDraft({ postUrl: e.target.value })}
                    placeholder="https://"
                  />
                </td>
                <td className="px-1 py-1.5">
                  <Input
                    aria-label="포스팅 등록날짜"
                    type="date"
                    value={draft.postRegisteredAt ?? ""}
                    onChange={(e) =>
                      updateDraft({ postRegisteredAt: e.target.value })
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-zinc-600">
            입력한 참가자는 진행 타임라인에 자동 반영됩니다.
            {campaign.participants.length > 0 && (
              <span className="ml-1 text-zinc-500">
                최근: {formatParticipantLabel(campaign.participants.at(-1)!)}
              </span>
            )}
          </p>
          <Button size="sm" onClick={handleAdd} disabled={!canAdd}>
            <Plus className="h-3.5 w-3.5" />
            참가자 추가
          </Button>
        </div>
      )}

      {campaign.participants.length === 0 && readOnly && (
        <p className="py-4 text-center text-sm text-zinc-500">
          등록된 참가자가 없습니다.
        </p>
      )}
    </div>
  );
}
