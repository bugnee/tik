"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Plus, Send } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { useExperience } from "@/features/experience/useExperience";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SaveButton } from "@/components/ui/SaveButton";
import { useSaveMeta } from "@/hooks/useSaveMeta";
import { Card, CardHeader } from "@/components/ui/Card";
import { ExperienceParticipantListEditor } from "@/components/experience/ExperienceParticipantListEditor";
import { ExperiencePartnerSlotStaffPanel } from "@/components/experience/ExperiencePartnerSlotStaffPanel";
import { ExperiencePublicListingEditor } from "@/components/experience/ExperiencePublicListingEditor";
import { Input, Select, Textarea } from "@/components/ui/FormFields";
import {
  formatExperienceFieldAssignees,
  getActiveExperienceFields,
  getExperienceFieldLabel,
  resolveExperienceField,
} from "@/lib/experience-field-utils";
import { valuesEqual } from "@/lib/form-dirty";
import {
  EXPERIENCE_SCHEDULING_STATUS_LABELS,
  EXPERIENCE_STATUS_BADGE_VARIANT,
  formatExperienceVisitSchedule,
  formatProposalSchedule,
  getContractExperienceCampaigns,
  pendingProposal,
} from "@/lib/experience-campaign-utils";
import { getUserName } from "@/lib/selectors";
import type {
  ExperienceCampaign,
  ExperienceRecruitmentCriteria,
} from "@/lib/types";

type PanelMode = "staff" | "client";

export function ExperienceCampaignPanel({
  contractId,
  mode,
  readOnly = false,
  filterCampaignId,
}: {
  contractId: string;
  mode: PanelMode;
  readOnly?: boolean;
  /** 단일 캠페인만 표시 (체험단 이력 상세 등) */
  filterCampaignId?: string;
}) {
  const data = useData();
  const experience = useExperience();
  const { currentUser } = useRole();
  const { contracts } = data;
  const {
    experienceCampaigns,
    addExperienceCampaign,
    updateExperienceCampaign,
    sendExperienceCampaignToClient,
    proposeExperienceSchedule,
    acceptExperienceProposal,
  } = experience;

  const contract = contracts.find((c) => c.id === contractId);
  const campaigns = useMemo(
    () => getContractExperienceCampaigns(experienceCampaigns, contractId),
    [experienceCampaigns, contractId],
  );

  const visibleCampaigns = useMemo(() => {
    let list = mode === "staff" ? campaigns : campaigns.filter((c) => c.schedulingStatus !== "draft");
    if (filterCampaignId) {
      list = list.filter((c) => c.id === filterCampaignId);
    }
    return list;
  }, [campaigns, mode, filterCampaignId]);

  const [expandedId, setExpandedId] = useState<string | null>(
    visibleCampaigns[0]?.id ?? null,
  );
  const [proposalDate, setProposalDate] = useState("");
  const [proposalTime, setProposalTime] = useState("14:00");
  const [proposalEndTime, setProposalEndTime] = useState("17:00");
  const [proposalNote, setProposalNote] = useState("");

  if (!contract) return null;

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function saveCriteria(campaign: ExperienceCampaign, criteria: ExperienceRecruitmentCriteria) {
    updateExperienceCampaign(campaign.id, { criteria });
  }

  function submitProposal(campaignId: string) {
    if (!proposalDate) return;
    proposeExperienceSchedule(campaignId, currentUser.id, {
      visitDate: proposalDate,
      visitTime: proposalTime || undefined,
      visitEndTime: proposalEndTime || undefined,
      note: proposalNote || undefined,
    });
    setProposalNote("");
  }

  return (
    <Card glow>
      <CardHeader
        title="체험단 모집 · 일정 조율"
        subtitle={
          mode === "staff"
            ? "고객사와 조건·일정 조율 → 확정 후 캘린더 · 참가자 접수"
            : "담당·팀장과 조건·일정을 조율하고 확정해 주세요"
        }
        action={
          mode === "staff" && !readOnly ? (
            <Button
              size="sm"
              onClick={() => {
                const created = addExperienceCampaign(contractId, currentUser.id);
                setExpandedId(created.id);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              체험단 추가
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-3">
        {visibleCampaigns.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">
            {mode === "client"
              ? "조율 중인 체험단 일정이 없습니다."
              : "체험단 모집 건을 추가해 주세요."}
          </p>
        )}

        {visibleCampaigns.map((campaign) => {
          const open = expandedId === campaign.id;
          const pending = pendingProposal(campaign);
          const canEditCriteria =
            !readOnly &&
            mode === "staff" &&
            ["draft", "coordinating", "recruiting"].includes(
              campaign.schedulingStatus,
            );
          const canPropose =
            !readOnly &&
            (campaign.schedulingStatus === "draft" ||
              campaign.schedulingStatus === "coordinating" ||
              (mode === "staff" && campaign.schedulingStatus === "recruiting"));
          const canAccept =
            !readOnly &&
            pending &&
            (mode === "client" ||
              (mode === "staff" &&
                pending.proposedByUserId !== currentUser.id));
          const canManageParticipants =
            mode === "staff" &&
            campaign.schedulingStatus !== "cancelled" &&
            campaign.schedulingStatus !== "completed";
          const participantReadOnly = readOnly || mode === "client";

          return (
            <div
              key={campaign.id}
              className="rounded-xl border border-zinc-800 bg-zinc-950/40"
            >
              <button
                type="button"
                onClick={() => toggleExpand(campaign.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div>
                  <p className="font-medium text-zinc-100">{campaign.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {campaign.criteria.targetHeadcount}명 ·{" "}
                    {formatExperienceVisitSchedule(campaign)}
                  </p>
                </div>
                <Badge
                  variant={
                    EXPERIENCE_STATUS_BADGE_VARIANT[campaign.schedulingStatus]
                  }
                >
                  {EXPERIENCE_SCHEDULING_STATUS_LABELS[campaign.schedulingStatus]}
                </Badge>
              </button>

              {open && (
                <div className="space-y-4 border-t border-zinc-800 px-4 py-4">
                  <CriteriaBlock
                    campaign={campaign}
                    editable={canEditCriteria}
                    onSave={(criteria) => saveCriteria(campaign, criteria)}
                  />

                  {mode === "staff" && !readOnly ? (
                    <ExperiencePublicListingEditor
                      campaign={campaign}
                      userId={currentUser.id}
                      onSave={(publicListing) =>
                        updateExperienceCampaign(campaign.id, { publicListing })
                      }
                    />
                  ) : null}

                  {mode === "staff" && campaign.schedulingStatus === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => sendExperienceCampaignToClient(campaign.id)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      고객사에 조율 요청
                    </Button>
                  )}

                  {pending && (
                    <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-3 text-sm">
                      <p className="text-xs text-violet-300/90">일정 제안</p>
                      <p className="mt-1 font-medium text-zinc-200">
                        {formatProposalSchedule(pending)}
                      </p>
                      {pending.note && (
                        <p className="mt-1 text-xs text-zinc-500">{pending.note}</p>
                      )}
                      <p className="mt-1 text-[11px] text-zinc-600">
                        제안: {getUserName(data, pending.proposedByUserId)}
                      </p>
                      {canAccept && (
                        <Button
                          size="sm"
                          className="mt-3"
                          onClick={() =>
                            acceptExperienceProposal(
                              campaign.id,
                              pending.id,
                              currentUser.id,
                            )
                          }
                        >
                          <CalendarCheck className="h-3.5 w-3.5" />
                          일정 확정
                        </Button>
                      )}
                    </div>
                  )}

                  {canPropose && (
                    <div className="rounded-lg border border-zinc-800 p-3">
                      <p className="mb-2 text-xs font-medium text-zinc-400">
                        {mode === "client" ? "일정 제안" : "일정 제안 · 수정"}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <Input
                          label="체험일"
                          type="date"
                          value={proposalDate}
                          onChange={(e) => setProposalDate(e.target.value)}
                        />
                        <Input
                          label="시작"
                          type="time"
                          value={proposalTime}
                          onChange={(e) => setProposalTime(e.target.value)}
                        />
                        <Input
                          label="종료"
                          type="time"
                          value={proposalEndTime}
                          onChange={(e) => setProposalEndTime(e.target.value)}
                        />
                      </div>
                      <Textarea
                        label="메모"
                        value={proposalNote}
                        onChange={(e) => setProposalNote(e.target.value)}
                        rows={2}
                        className="mt-2"
                      />
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={() => submitProposal(campaign.id)}
                        disabled={!proposalDate}
                      >
                        제안 등록
                      </Button>
                    </div>
                  )}

                  {campaign.confirmedVisitDate && (
                    <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-sm text-amber-100/90">
                      확정 일정: {formatExperienceVisitSchedule(campaign)}
                      {campaign.confirmedByUserId && (
                        <span className="ml-2 text-xs text-amber-200/60">
                          · {getUserName(data, campaign.confirmedByUserId)} 확정
                        </span>
                      )}
                    </div>
                  )}

                  {canManageParticipants && (
                    <ExperienceParticipantListEditor
                      campaign={campaign}
                      readOnly={participantReadOnly}
                    />
                  )}

                  {mode === "staff" &&
                    ["confirmed", "recruiting", "coordinating"].includes(
                      campaign.schedulingStatus,
                    ) && (
                      <ExperiencePartnerSlotStaffPanel
                        campaign={campaign}
                        contractId={contractId}
                        readOnly={readOnly}
                      />
                    )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CriteriaBlock({
  campaign,
  editable,
  onSave,
}: {
  campaign: ExperienceCampaign;
  editable: boolean;
  onSave: (criteria: ExperienceRecruitmentCriteria) => void;
}) {
  const data = useData();
  const { experienceFieldDefinitions } = useExperience();
  const [criteria, setCriteria] = useState(campaign.criteria);
  const activeFields = useMemo(
    () => getActiveExperienceFields(experienceFieldDefinitions),
    [experienceFieldDefinitions],
  );
  const selectedField = useMemo(
    () => resolveExperienceField(experienceFieldDefinitions, criteria.category),
    [experienceFieldDefinitions, criteria.category],
  );

  useEffect(() => {
    setCriteria(campaign.criteria);
  }, [campaign.id, campaign.criteria]);

  const criteriaDirty = !valuesEqual(criteria, campaign.criteria);
  const saveMeta = useSaveMeta({
    savedAt: campaign.updatedAt,
    savedByUserId: campaign.createdByUserId,
  });

  function handleSaveCriteria() {
    onSave(criteria);
    saveMeta.recordSave();
  }

  if (!editable) {
    return (
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <CriteriaRow label="모집 인원" value={`${criteria.targetHeadcount}명`} />
        <CriteriaRow
          label="분야"
          value={getExperienceFieldLabel(
            experienceFieldDefinitions,
            criteria.category,
          )}
        />
        <CriteriaRow
          label="분야 담당"
          value={formatExperienceFieldAssignees(data, selectedField)}
          className="sm:col-span-2"
        />
        <CriteriaRow label="제공 혜택" value={criteria.providedBenefit || "-"} />
        <CriteriaRow label="모집 조건" value={criteria.requirements || "-"} />
        {criteria.notes && (
          <CriteriaRow label="비고" value={criteria.notes} className="sm:col-span-2" />
        )}
      </dl>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-zinc-400">모집 조건</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="모집 인원"
          type="number"
          min={1}
          value={criteria.targetHeadcount}
          onChange={(e) =>
            setCriteria({
              ...criteria,
              targetHeadcount: Number(e.target.value) || 1,
            })
          }
        />
        <Select
          label="분야"
          value={criteria.category ?? ""}
          onChange={(e) =>
            setCriteria({ ...criteria, category: e.target.value || undefined })
          }
        >
          <option value="">선택</option>
          {activeFields.map((field) => (
            <option key={field.id} value={field.id}>
              {field.label}
            </option>
          ))}
        </Select>
      </div>
      {selectedField && (
        <p className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-500">
          분야 담당: {formatExperienceFieldAssignees(data, selectedField)}
        </p>
      )}
      <Textarea
        label="제공 혜택"
        value={criteria.providedBenefit ?? ""}
        onChange={(e) =>
          setCriteria({ ...criteria, providedBenefit: e.target.value })
        }
        rows={2}
      />
      <Textarea
        label="모집 조건"
        value={criteria.requirements ?? ""}
        onChange={(e) =>
          setCriteria({ ...criteria, requirements: e.target.value })
        }
        rows={2}
      />
      <Textarea
        label="비고"
        value={criteria.notes ?? ""}
        onChange={(e) => setCriteria({ ...criteria, notes: e.target.value })}
        rows={2}
      />
      <SaveButton
        size="sm"
        dirty={criteriaDirty}
        onClick={handleSaveCriteria}
        savedAt={saveMeta.savedAt}
        savedBy={saveMeta.savedBy}
      >
        조건 저장
      </SaveButton>
    </div>
  );
}

function CriteriaRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] text-zinc-600">{label}</dt>
      <dd className="mt-0.5 text-zinc-300">{value}</dd>
    </div>
  );
}
