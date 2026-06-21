"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, ExternalLink, Users } from "lucide-react";
import { useData } from "@/context/DataContext";
import { ExperienceCampaignPanel } from "@/components/experience/ExperienceCampaignPanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SortableTh } from "@/components/ui/DataTable";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { LIST_SEARCH_PLACEHOLDERS } from "@/lib/list-ui-consistency";
import { PeriodFilterBar } from "@/components/ui/PeriodFilterBar";
import {
  COMPANY_ACTIVITY_KIND_ACCENTS,
  COMPANY_ACTIVITY_KIND_LABELS,
  COMPANY_ACTIVITY_KIND_ORDER,
  buildCompanyActivityRows,
  companyActivityPeriodSummary,
  countCompanyActivityByKind,
  filterCompanyActivityRows,
  sortCompanyActivityRows,
  type CompanyActivityKind,
  type CompanyActivityRow,
  type CompanyActivitySortDirection,
  type CompanyActivitySortKey,
} from "@/lib/company-activity-registry-utils";
import { CLIENT_PORTAL_VIEW_CARD_BORDER } from "@/lib/client-portal-utils";
import {
  createDefaultPeriodFilter,
  type PeriodFilterValue,
} from "@/lib/date-filter-utils";
import { getTabButtonClass } from "@/lib/tab-ui-utils";
import type { ExperienceParticipant, ExperienceSchedulingStatus, TaskChannelAccent } from "@/lib/types";
import { cn } from "@/lib/cn";

type ActivityRegistryPanelProps = {
  contractIds: Set<string>;
  /** 고객사 포털 — 단일 계약, 고객사 열 숨김 */
  mode?: "staff" | "client";
  readOnly?: boolean;
  highlightAnchorIds?: Set<string>;
};

export function ActivityRegistryPanel({
  contractIds,
  mode = "staff",
  readOnly = false,
  highlightAnchorIds,
}: ActivityRegistryPanelProps) {
  const data = useData();
  const [periodFilter, setPeriodFilter] =
    useState<PeriodFilterValue>(createDefaultPeriodFilter);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<CompanyActivityKind | "all">(
    "all",
  );
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<CompanyActivitySortKey>("activityDate");
  const [sortDirection, setSortDirection] =
    useState<CompanyActivitySortDirection>("desc");

  const allRows = useMemo(
    () =>
      buildCompanyActivityRows(data, contractIds, {
        includeExpenses: mode === "staff",
      }),
    [data, contractIds, mode],
  );

  const kindCounts = useMemo(() => countCompanyActivityByKind(allRows), [allRows]);

  const filteredRows = useMemo(
    () =>
      sortCompanyActivityRows(
        filterCompanyActivityRows(allRows, {
          periodFilter,
          search,
          kind: kindFilter,
        }),
        sortKey,
        sortDirection,
      ),
    [allRows, periodFilter, search, kindFilter, sortKey, sortDirection],
  );

  const periodSummary = useMemo(
    () => companyActivityPeriodSummary(filteredRows, periodFilter),
    [filteredRows, periodFilter],
  );

  function toggleSort(key: CompanyActivitySortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "activityDate" ? "desc" : "asc");
  }

  function toggleExpand(rowKey: string) {
    setExpandedKey((prev) => (prev === rowKey ? null : rowKey));
  }

  const cardBorder =
    mode === "client" ? CLIENT_PORTAL_VIEW_CARD_BORDER.experience : undefined;

  return (
    <Card glow className={cardBorder}>
      <CardHeader
        title={mode === "client" ? "전체 활동 이력" : "활동 대장"}
        subtitle={
          mode === "client"
            ? `체험단·업무·집행·Q&A · 총 ${allRows.length}건`
            : `전체 ${allRows.length}건 · 조회 ${filteredRows.length}건`
        }
      />

      <div className="mb-4 space-y-3">
        <PeriodFilterBar
          value={periodFilter}
          onChange={setPeriodFilter}
          summary={periodSummary}
        />
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={
            mode === "client"
              ? LIST_SEARCH_PLACEHOLDERS.activityRegistryClient
              : LIST_SEARCH_PLACEHOLDERS.activityRegistry
          }
          showSortHint
          filters={
            <div className="flex flex-wrap gap-1.5">
              <KindFilterButton
                active={kindFilter === "all"}
                label="전체"
                count={allRows.length}
                onClick={() => setKindFilter("all")}
              />
              {COMPANY_ACTIVITY_KIND_ORDER.map((kind) => {
                if (mode === "client" && kind === "expense") return null;
                const count = kindCounts[kind];
                return (
                  <KindFilterButton
                    key={kind}
                    active={kindFilter === kind}
                    label={COMPANY_ACTIVITY_KIND_LABELS[kind]}
                    count={count}
                    accent={COMPANY_ACTIVITY_KIND_ACCENTS[kind]}
                    onClick={() =>
                      setKindFilter((prev) => (prev === kind ? "all" : kind))
                    }
                  />
                );
              })}
            </div>
          }
        />
      </div>

      {filteredRows.length === 0 ? (
        <p className="pb-6 text-center text-sm text-zinc-500">
          조건에 맞는 활동이 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th className="w-10 pb-3 pr-2 text-center font-medium">#</th>
                <SortableTh
                  active={sortKey === "kind"}
                  direction={sortDirection}
                  onClick={() => toggleSort("kind")}
                  className="pb-3 pr-3"
                >
                  구분
                </SortableTh>
                {mode === "staff" && (
                  <SortableTh
                    active={sortKey === "client"}
                    direction={sortDirection}
                    onClick={() => toggleSort("client")}
                    className="pb-3 pr-4"
                  >
                    고객사
                  </SortableTh>
                )}
                <SortableTh
                  active={sortKey === "title"}
                  direction={sortDirection}
                  onClick={() => toggleSort("title")}
                  className="pb-3 pr-4"
                >
                  활동
                </SortableTh>
                <th className="pb-3 pr-4 font-medium">
                  {mode === "staff" ? "파트너/담당" : "담당"}
                </th>
                {mode === "staff" && (
                  <>
                    <th className="pb-3 pr-4 font-medium">고객 전화</th>
                    <th className="pb-3 pr-4 font-medium">연락처</th>
                  </>
                )}
                <SortableTh
                  active={sortKey === "activityDate"}
                  direction={sortDirection}
                  onClick={() => toggleSort("activityDate")}
                  className="pb-3 pr-4"
                >
                  일자
                </SortableTh>
                <th className="pb-3 pr-4 font-medium">상태</th>
                <th className="pb-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <ActivityRowGroup
                  key={row.rowKey}
                  row={row}
                  index={index}
                  mode={mode}
                  isExpanded={expandedKey === row.rowKey}
                  highlighted={highlightAnchorIds?.has(
                    row.kind === "experience" && row.experience
                      ? `client-action-experience-${row.experience.campaignId}`
                      : row.rowKey,
                  )}
                  readOnly={readOnly}
                  onToggleExpand={() => toggleExpand(row.rowKey)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function KindFilterButton({
  active,
  label,
  count,
  accent,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  accent?: TaskChannelAccent;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        getTabButtonClass(accent ?? "emerald", active),
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs",
        !active && count === 0 && "opacity-50",
      )}
    >
      {label}
      <span className="font-mono font-semibold tabular-nums">{count}</span>
    </button>
  );
}

function ActivityRowGroup({
  row,
  index,
  mode,
  isExpanded,
  highlighted,
  readOnly,
  onToggleExpand,
}: {
  row: CompanyActivityRow;
  index: number;
  mode: "staff" | "client";
  isExpanded: boolean;
  highlighted?: boolean;
  readOnly?: boolean;
  onToggleExpand: () => void;
}) {
  const canExpand =
    row.kind === "experience" && row.experience !== undefined;

  return (
    <>
      <tr
        className={cn(
          "border-b border-zinc-800/40 text-zinc-400 transition-colors",
          isExpanded && "bg-cyan-500/5",
          highlighted && "ring-2 ring-inset ring-amber-400/50",
        )}
      >
        <td className="py-3 pr-2 text-center font-mono text-xs tabular-nums text-zinc-500">
          {index + 1}
        </td>
        <td className="py-3 pr-3">
          <Badge variant="default" className={kindBadgeClass(row.kind)}>
            {COMPANY_ACTIVITY_KIND_LABELS[row.kind]}
          </Badge>
        </td>
        {mode === "staff" && (
          <td className="py-3 pr-4">
            <span className="font-medium text-zinc-200">{row.clientName}</span>
            {row.clientTradeName && (
              <p className="text-xs text-zinc-600">{row.clientTradeName}</p>
            )}
          </td>
        )}
        <td className="py-3 pr-4">
          <button
            type="button"
            onClick={canExpand ? onToggleExpand : undefined}
            className={cn(
              "text-left font-medium text-zinc-200",
              canExpand && "hover:text-cyan-300",
            )}
          >
            {row.title}
          </button>
          <p className="text-xs text-zinc-600">{row.detail}</p>
        </td>
        <td className="py-3 pr-4 text-zinc-300">{row.counterpartyName}</td>
        {mode === "staff" && (
          <>
            <td className="py-3 pr-4 text-xs">{row.clientPhone}</td>
            <td className="py-3 pr-4 text-xs">{row.counterpartyPhone}</td>
          </>
        )}
        <td className="py-3 pr-4 font-mono text-xs text-zinc-300">
          {row.activityDate || "-"}
        </td>
        <td className="py-3 pr-4">
          <Badge variant="default">{row.statusLabel}</Badge>
        </td>
        <td className="py-3">
          {canExpand ? (
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
          ) : null}
        </td>
      </tr>

      {isExpanded && row.experience && (
        <tr className="border-b border-zinc-800/40 bg-zinc-950/40">
          <td colSpan={mode === "staff" ? 10 : 7} className="px-3 py-4 sm:px-4">
            <ExperienceExpandDetail
              contractId={row.contractId}
              campaignId={row.experience.campaignId}
              participants={row.experience.participants}
              schedulingStatus={row.experience.schedulingStatus}
              readOnly={readOnly}
              mode={mode}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function ExperienceExpandDetail({
  contractId,
  campaignId,
  participants,
  schedulingStatus,
  readOnly,
  mode,
}: {
  contractId: string;
  campaignId: string;
  participants: ExperienceParticipant[];
  schedulingStatus: ExperienceSchedulingStatus;
  readOnly?: boolean;
  mode: "staff" | "client";
}) {
  if (schedulingStatus === "coordinating" && !readOnly && mode === "client") {
    return (
      <ExperienceCampaignPanel
        contractId={contractId}
        mode="client"
        filterCampaignId={campaignId}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Users className="h-4 w-4 text-cyan-400/80" />
          참가자 {participants.length}명
        </div>
        {mode === "staff" && (
          <Link
            href={`/contracts/${contractId}`}
            className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
          >
            계약 상세
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
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
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <tr key={participant.id} className="border-t border-zinc-800/80">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const KIND_BADGE_CLASS: Record<CompanyActivityKind, string> = {
  experience: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
  work_order: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  execution: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  qa: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  extension: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  expense: "border-amber-500/30 bg-amber-500/10 text-amber-100",
};

function kindBadgeClass(kind: CompanyActivityKind): string {
  return KIND_BADGE_CLASS[kind];
}
