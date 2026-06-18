"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, ExternalLink, Users } from "lucide-react";
import { useData } from "@/context/DataContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SearchBar, SortableTh } from "@/components/ui/DataTable";
import { PeriodFilterBar } from "@/components/ui/PeriodFilterBar";
import {
  EXPERIENCE_SCHEDULING_STATUS_LABELS,
  EXPERIENCE_STATUS_BADGE_VARIANT,
} from "@/lib/experience-campaign-utils";
import {
  buildExperienceRegistryRows,
  experienceRegistryPeriodSummary,
  filterExperienceRegistryRows,
  sortExperienceRegistryRows,
  type ExperienceRegistrySortDirection,
  type ExperienceRegistrySortKey,
} from "@/lib/experience-registry-utils";
import {
  createDefaultPeriodFilter,
  type PeriodFilterValue,
} from "@/lib/date-filter-utils";
import type { ExperienceParticipant } from "@/lib/types";
import { cn } from "@/lib/cn";

type ExperienceRegistryPanelProps = {
  contractIds: Set<string>;
};

export function ExperienceRegistryPanel({
  contractIds,
}: ExperienceRegistryPanelProps) {
  const data = useData();
  const [periodFilter, setPeriodFilter] =
    useState<PeriodFilterValue>(createDefaultPeriodFilter);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<ExperienceRegistrySortKey>("visitDate");
  const [sortDirection, setSortDirection] =
    useState<ExperienceRegistrySortDirection>("desc");

  const allRows = useMemo(
    () => buildExperienceRegistryRows(data, contractIds),
    [data, contractIds],
  );

  const filteredRows = useMemo(
    () =>
      sortExperienceRegistryRows(
        filterExperienceRegistryRows(allRows, { periodFilter, search }),
        sortKey,
        sortDirection,
      ),
    [allRows, periodFilter, search, sortKey, sortDirection],
  );

  const periodSummary = useMemo(
    () => experienceRegistryPeriodSummary(filteredRows, periodFilter),
    [filteredRows, periodFilter],
  );

  function toggleSort(key: ExperienceRegistrySortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "visitDate" ? "desc" : "asc");
  }

  function toggleExpand(campaignId: string) {
    setExpandedId((prev) => (prev === campaignId ? null : campaignId));
  }

  return (
    <Card glow>
      <CardHeader
        title="체험단 대장"
        subtitle={`전체 ${allRows.length}건 · 조회 ${filteredRows.length}건`}
      />

      <div className="mb-4 space-y-3">
        <PeriodFilterBar
          value={periodFilter}
          onChange={setPeriodFilter}
          summary={periodSummary}
        />
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="고객사 · 파트너 · 체험단명 · 전화번호 검색"
        />
      </div>

      {filteredRows.length === 0 ? (
        <p className="pb-6 text-center text-sm text-zinc-500">
          조건에 맞는 체험단이 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th className="w-10 pb-3 pr-2 text-center font-medium">#</th>
                <SortableTh
                  active={sortKey === "client"}
                  direction={sortDirection}
                  onClick={() => toggleSort("client")}
                  className="pb-3 pr-4"
                >
                  고객사
                </SortableTh>
                <th className="pb-3 pr-4 font-medium">파트너사</th>
                <SortableTh
                  active={sortKey === "title"}
                  direction={sortDirection}
                  onClick={() => toggleSort("title")}
                  className="pb-3 pr-4"
                >
                  체험단명
                </SortableTh>
                <th className="pb-3 pr-4 font-medium">고객 전화</th>
                <th className="pb-3 pr-4 font-medium">파트너 전화</th>
                <SortableTh
                  active={sortKey === "visitDate"}
                  direction={sortDirection}
                  onClick={() => toggleSort("visitDate")}
                  className="pb-3 pr-4"
                >
                  체험일
                </SortableTh>
                <th className="pb-3 pr-4 font-medium">상태</th>
                <th className="pb-3 pr-4 font-medium">참가자</th>
                <th className="pb-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => {
                const isExpanded = expandedId === row.campaignId;
                return (
                  <RegistryRowGroup
                    key={row.campaignId}
                    row={row}
                    index={index}
                    isExpanded={isExpanded}
                    onToggleExpand={() => toggleExpand(row.campaignId)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function RegistryRowGroup({
  row,
  index,
  isExpanded,
  onToggleExpand,
}: {
  row: ReturnType<typeof buildExperienceRegistryRows>[number];
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  return (
    <>
      <tr
        className={cn(
          "border-b border-zinc-800/40 text-zinc-400 transition-colors",
          isExpanded && "bg-cyan-500/5",
        )}
      >
        <td className="py-3 pr-2 text-center font-mono text-xs tabular-nums text-zinc-500">
          {index + 1}
        </td>
        <td className="py-3 pr-4">
          <Link
            href={`/contracts/${row.contractId}`}
            className="font-medium text-zinc-200 hover:text-cyan-300"
          >
            {row.clientName}
          </Link>
          {row.clientTradeName && (
            <p className="text-xs text-zinc-600">{row.clientTradeName}</p>
          )}
        </td>
        <td className="py-3 pr-4 text-zinc-300">{row.partnerNames}</td>
        <td className="py-3 pr-4">
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-left font-medium text-zinc-200 hover:text-cyan-300"
          >
            {row.campaignTitle}
          </button>
          <p className="text-xs text-zinc-600">{row.sequence}회차</p>
        </td>
        <td className="py-3 pr-4 text-xs text-zinc-400">{row.clientPhone}</td>
        <td className="py-3 pr-4 text-xs text-zinc-400">{row.partnerPhone}</td>
        <td className="py-3 pr-4 text-xs text-zinc-300">
          <span className="font-mono tabular-nums">{row.visitDate}</span>
          {row.visitScheduleLabel !== "미확정" && (
            <p className="mt-0.5 text-zinc-600">{row.visitScheduleLabel}</p>
          )}
        </td>
        <td className="py-3 pr-4">
          <Badge variant={EXPERIENCE_STATUS_BADGE_VARIANT[row.status]}>
            {EXPERIENCE_SCHEDULING_STATUS_LABELS[row.status]}
          </Badge>
        </td>
        <td className="py-3 pr-4 font-mono text-zinc-300">
          {row.participantCount}명
        </td>
        <td className="py-3">
          <Button
            type="button"
            size="sm"
            variant={isExpanded ? "primary" : "secondary"}
            onClick={onToggleExpand}
          >
            상세
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                isExpanded && "rotate-90",
              )}
            />
          </Button>
        </td>
      </tr>

      {isExpanded && (
        <tr className="border-b border-zinc-800/40 bg-zinc-950/40">
          <td colSpan={10} className="px-3 py-4 sm:px-4">
            <ExpandedParticipantDetail
              participants={row.participants}
              contractId={row.contractId}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function ExpandedParticipantDetail({
  participants,
  contractId,
}: {
  participants: ExperienceParticipant[];
  contractId: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Users className="h-4 w-4 text-cyan-400/80" />
          참가자 {participants.length}명
        </div>
        <Link
          href={`/contracts/${contractId}`}
          className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
        >
          계약 상세
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {participants.length === 0 ? (
        <p className="text-sm text-zinc-500">등록된 참가자가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-zinc-950/60 text-left text-xs text-zinc-500">
                <th className="px-2 py-2 font-medium">블로그</th>
                <th className="px-2 py-2 font-medium">이름</th>
                <th className="px-2 py-2 font-medium">연락처</th>
                <th className="px-2 py-2 font-medium">체험일</th>
                <th className="px-2 py-2 font-medium">인원</th>
                <th className="px-2 py-2 font-medium">포스팅</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <tr
                  key={participant.id}
                  className="border-t border-zinc-800/80"
                >
                  <td className="px-2 py-2 text-zinc-300">
                    {participant.blogName || participant.snsHandle || "-"}
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
    </div>
  );
}
