"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Users } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useExperience } from "@/features/experience/useExperience";
import { ExperienceCampaignPanel } from "@/components/experience/ExperienceCampaignPanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SortableTh } from "@/components/ui/DataTable";
import {
  formatExperienceFieldAssignees,
  getExperienceFieldLabel,
  resolveExperienceField,
} from "@/lib/experience-field-utils";
import {
  EXPERIENCE_SCHEDULING_STATUS_LABELS,
  EXPERIENCE_STATUS_BADGE_VARIANT,
  formatExperienceVisitSchedule,
  formatProposalSchedule,
  getClientExperienceHistoryCampaigns,
} from "@/lib/experience-campaign-utils";
import { CLIENT_PORTAL_VIEW_CARD_BORDER } from "@/lib/client-portal-utils";
import { getUserName } from "@/lib/selectors";
import type { ExperienceCampaign, ExperienceParticipant } from "@/lib/types";
import { cn } from "@/lib/cn";

type NameSort = "asc" | "desc";

/** 체험단명 기준 정렬 */
function sortCampaignsByTitle(
  campaigns: ExperienceCampaign[],
  direction: NameSort,
): ExperienceCampaign[] {
  return [...campaigns].sort((a, b) => {
    const cmp = a.title.localeCompare(b.title, "ko");
    return direction === "asc" ? cmp : -cmp;
  });
}

/** 참가자 이름 기준 정렬 */
function sortParticipantsByName(
  participants: ExperienceParticipant[],
  direction: NameSort,
): ExperienceParticipant[] {
  return [...participants].sort((a, b) => {
    const cmp = a.name.localeCompare(b.name, "ko");
    return direction === "asc" ? cmp : -cmp;
  });
}

export function ClientExperienceHistoryPanel({
  contractId,
  readOnly = false,
  highlightAnchorIds,
}: {
  contractId: string;
  readOnly?: boolean;
  highlightAnchorIds?: Set<string>;
}) {
  const data = useData();
  const { experienceCampaigns, experienceFieldDefinitions } = useExperience();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [titleSort, setTitleSort] = useState<NameSort>("asc");
  const [participantSort, setParticipantSort] = useState<NameSort>("asc");

  const campaigns = useMemo(
    () => getClientExperienceHistoryCampaigns(experienceCampaigns, contractId),
    [experienceCampaigns, contractId],
  );

  const sortedCampaigns = useMemo(
    () => sortCampaignsByTitle(campaigns, titleSort),
    [campaigns, titleSort],
  );

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedId) ?? null,
    [campaigns, selectedId],
  );

  // 해야 할 일 패널에서 스크롤된 항목 → 상세 자동 펼침
  useEffect(() => {
    if (!highlightAnchorIds?.size) return;
    for (const anchorId of highlightAnchorIds) {
      const match = anchorId.match(/^client-action-experience-(.+)$/);
      if (match) {
        setSelectedId(match[1]);
        break;
      }
    }
  }, [highlightAnchorIds]);

  function toggleTitleSort() {
    setTitleSort((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  function toggleParticipantSort() {
    setParticipantSort((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  function openDetail(campaignId: string) {
    setSelectedId((prev) => (prev === campaignId ? null : campaignId));
    requestAnimationFrame(() => {
      document
        .getElementById(`client-action-experience-${campaignId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const completedCount = campaigns.filter(
    (c) => c.schedulingStatus === "completed",
  ).length;
  const participantTotal = campaigns.reduce(
    (sum, c) => sum + c.participants.length,
    0,
  );

  return (
    <div className="space-y-6">
      <Card glow className={CLIENT_PORTAL_VIEW_CARD_BORDER.experience}>
        <CardHeader
          title="체험단 전체 이력"
          subtitle={`총 ${campaigns.length}건 · 완료 ${completedCount}건 · 참가자 ${participantTotal}명`}
        />

        {campaigns.length === 0 ? (
          <p className="pb-6 text-center text-sm text-zinc-500">
            등록된 체험단 이력이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                  <th className="w-10 pb-3 pr-2 text-center font-medium">#</th>
                  <SortableTh
                    active
                    direction={titleSort}
                    onClick={toggleTitleSort}
                    className="pb-3 pr-4"
                  >
                    체험단명
                  </SortableTh>
                  <th className="pb-3 pr-4 font-medium">상태</th>
                  <th className="pb-3 pr-4 font-medium">일정</th>
                  <th className="pb-3 pr-4 font-medium">참가</th>
                  <th className="pb-3 pr-4 font-medium">등록일</th>
                  <th className="pb-3 font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {sortedCampaigns.map((campaign, index) => {
                  const isSelected = selectedId === campaign.id;
                  const highlighted = highlightAnchorIds?.has(
                    `client-action-experience-${campaign.id}`,
                  );
                  return (
                    <tr
                      key={campaign.id}
                      id={`client-action-experience-${campaign.id}`}
                      className={cn(
                        "border-b border-zinc-800/40 text-zinc-400 transition-colors",
                        isSelected && "bg-cyan-500/5",
                        highlighted &&
                          "ring-2 ring-inset ring-amber-400/50",
                      )}
                    >
                      <td className="py-3 pr-2 text-center font-mono text-xs tabular-nums text-zinc-500">
                        {index + 1}
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => openDetail(campaign.id)}
                          className="text-left font-medium text-zinc-200 hover:text-cyan-300"
                        >
                          {campaign.title}
                        </button>
                        <p className="text-xs text-zinc-600">
                          {campaign.sequence}회차 · 목표{" "}
                          {campaign.criteria.targetHeadcount}명
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={
                            EXPERIENCE_STATUS_BADGE_VARIANT[
                              campaign.schedulingStatus
                            ]
                          }
                        >
                          {
                            EXPERIENCE_SCHEDULING_STATUS_LABELS[
                              campaign.schedulingStatus
                            ]
                          }
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        {formatExperienceVisitSchedule(campaign)}
                      </td>
                      <td className="py-3 pr-4 font-mono text-zinc-300">
                        {campaign.participants.length}명
                      </td>
                      <td className="py-3 pr-4 text-xs text-zinc-500">
                        {campaign.createdAt}
                      </td>
                      <td className="py-3">
                        <Button
                          type="button"
                          size="sm"
                          variant={isSelected ? "primary" : "secondary"}
                          onClick={() => openDetail(campaign.id)}
                        >
                          체험단 진행
                          <ChevronRight
                            className={cn(
                              "h-3.5 w-3.5 transition-transform",
                              isSelected && "rotate-90",
                            )}
                          />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedCampaign && (
        <div className="space-y-4">
          {selectedCampaign.schedulingStatus === "coordinating" && !readOnly ? (
            <ExperienceCampaignPanel
              contractId={contractId}
              mode="client"
              filterCampaignId={selectedCampaign.id}
            />
          ) : (
            <ClientExperienceCampaignDetail
              campaign={selectedCampaign}
              participantSort={participantSort}
              onToggleParticipantSort={toggleParticipantSort}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** 완료·확정 등 — 읽기 전용 상세 */
function ClientExperienceCampaignDetail({
  campaign,
  participantSort,
  onToggleParticipantSort,
}: {
  campaign: ExperienceCampaign;
  participantSort: NameSort;
  onToggleParticipantSort: () => void;
}) {
  const data = useData();
  const { experienceFieldDefinitions } = useExperience();
  const field = resolveExperienceField(
    experienceFieldDefinitions,
    campaign.criteria.category,
  );
  const sortedParticipants = useMemo(
    () => sortParticipantsByName(campaign.participants, participantSort),
    [campaign.participants, participantSort],
  );

  return (
    <Card glow className={CLIENT_PORTAL_VIEW_CARD_BORDER.experience}>
      <CardHeader
        title={campaign.title}
        subtitle={`${campaign.sequence}회차 · ${EXPERIENCE_SCHEDULING_STATUS_LABELS[campaign.schedulingStatus]}`}
        action={
          <Badge
            variant={
              EXPERIENCE_STATUS_BADGE_VARIANT[campaign.schedulingStatus]
            }
          >
            {EXPERIENCE_SCHEDULING_STATUS_LABELS[campaign.schedulingStatus]}
          </Badge>
        }
      />

      <div className="space-y-6">
        <section>
          <p className="mb-2 text-xs font-medium text-zinc-400">모집 조건</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <DetailRow
              label="모집 인원"
              value={`${campaign.criteria.targetHeadcount}명`}
            />
            <DetailRow
              label="분야"
              value={getExperienceFieldLabel(
                experienceFieldDefinitions,
                campaign.criteria.category,
              )}
            />
            <DetailRow
              label="분야 담당"
              value={formatExperienceFieldAssignees(data, field)}
              className="sm:col-span-2"
            />
            <DetailRow
              label="제공 혜택"
              value={campaign.criteria.providedBenefit || "-"}
            />
            <DetailRow
              label="모집 조건"
              value={campaign.criteria.requirements || "-"}
            />
            {campaign.criteria.notes && (
              <DetailRow
                label="비고"
                value={campaign.criteria.notes}
                className="sm:col-span-2"
              />
            )}
          </dl>
        </section>

        <section>
          <p className="mb-2 text-xs font-medium text-zinc-400">일정</p>
          {campaign.confirmedVisitDate ? (
            <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 px-3 py-2 text-sm text-cyan-100/90">
              확정: {formatExperienceVisitSchedule(campaign)}
              {campaign.confirmedByUserId && (
                <span className="ml-2 text-xs text-cyan-200/60">
                  · {getUserName(data, campaign.confirmedByUserId)} 확정
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">확정 일정 없음</p>
          )}
          {campaign.proposals.length > 0 && (
            <ul className="mt-3 space-y-2">
              {campaign.proposals.map((proposal) => (
                <li
                  key={proposal.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400"
                >
                  {formatProposalSchedule(proposal)} ·{" "}
                  {getUserName(data, proposal.proposedByUserId)} ·{" "}
                  {proposal.status === "pending"
                    ? "대기"
                    : proposal.status === "accepted"
                      ? "수락"
                      : "거절"}
                  {proposal.note && (
                    <span className="mt-1 block text-zinc-500">
                      {proposal.note}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-400/80" />
            <p className="text-xs font-medium text-zinc-400">
              참가자 ({campaign.participants.length}명)
            </p>
          </div>
          {campaign.participants.length === 0 ? (
            <p className="text-sm text-zinc-500">등록된 참가자가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-zinc-950/60 text-left text-xs text-zinc-500">
                    <th className="px-2 py-2 font-medium">블로그</th>
                    <SortableTh
                      active
                      direction={participantSort}
                      onClick={onToggleParticipantSort}
                      className="px-2 py-2"
                    >
                      이름
                    </SortableTh>
                    <th className="px-2 py-2 font-medium">연락처</th>
                    <th className="px-2 py-2 font-medium">체험일</th>
                    <th className="px-2 py-2 font-medium">인원</th>
                    <th className="px-2 py-2 font-medium">포스팅</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedParticipants.map((participant) => (
                    <tr
                      key={participant.id}
                      className="border-t border-zinc-800/80"
                    >
                      <td className="px-2 py-2 text-zinc-300">
                        {participant.blogName ||
                          participant.snsHandle ||
                          "-"}
                      </td>
                      <td className="px-2 py-2 font-medium text-zinc-100">
                        {participant.name}
                      </td>
                      <td className="px-2 py-2 text-zinc-400">
                        {participant.contact || "-"}
                      </td>
                      <td className="px-2 py-2 text-zinc-400">
                        {participant.experienceDate || "-"}
                      </td>
                      <td className="px-2 py-2 text-zinc-400">
                        {participant.headcount ?? 1}명
                      </td>
                      <td className="px-2 py-2">
                        {participant.postUrl ? (
                          <a
                            href={participant.postUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:underline"
                          >
                            링크
                          </a>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Card>
  );
}

function DetailRow({
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
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-200">{value}</dd>
    </div>
  );
}
