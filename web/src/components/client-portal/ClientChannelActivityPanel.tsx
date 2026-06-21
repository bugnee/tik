"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import { ExperienceCampaignPanel } from "@/components/experience/ExperienceCampaignPanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SortableTh } from "@/components/ui/DataTable";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { LIST_SEARCH_PLACEHOLDERS } from "@/lib/list-ui-consistency";
import { PeriodFilterBar } from "@/components/ui/PeriodFilterBar";
import { useData } from "@/context/DataContext";
import {
  CLIENT_CHANNEL_ACCENTS,
  CLIENT_CHANNEL_LABELS,
  CLIENT_CHANNEL_ORDER,
  buildClientChannelActivityRows,
  clientChannelPeriodSummary,
  countClientChannelByCategory,
  filterClientChannelActivityRows,
  sortClientChannelActivityRows,
  type ClientChannelActivityRow,
  type ClientChannelCategory,
  type ClientChannelSortDirection,
  type ClientChannelSortKey,
} from "@/lib/client-channel-activity-utils";
import { CLIENT_PORTAL_VIEW_CARD_BORDER } from "@/lib/client-portal-utils";
import {
  createDefaultPeriodFilter,
  type PeriodFilterValue,
} from "@/lib/date-filter-utils";
import { getTabButtonClass } from "@/lib/tab-ui-utils";
import { EXPERIENCE_SCHEDULING_STATUS_LABELS } from "@/lib/experience-campaign-utils";
import type { TaskChannelAccent } from "@/lib/types";
import { cn } from "@/lib/cn";

export function ClientChannelActivityPanel({
  contractId,
  readOnly = false,
  highlightAnchorIds,
}: {
  contractId: string;
  readOnly?: boolean;
  highlightAnchorIds?: Set<string>;
}) {
  const data = useData();
  const [periodFilter, setPeriodFilter] =
    useState<PeriodFilterValue>(createDefaultPeriodFilter);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    ClientChannelCategory | "all"
  >("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<ClientChannelSortKey>("activityDate");
  const [sortDirection, setSortDirection] =
    useState<ClientChannelSortDirection>("desc");

  const allRows = useMemo(
    () => buildClientChannelActivityRows(data, contractId),
    [data, contractId],
  );

  const categoryCounts = useMemo(
    () => countClientChannelByCategory(allRows),
    [allRows],
  );

  const filteredRows = useMemo(
    () =>
      sortClientChannelActivityRows(
        filterClientChannelActivityRows(allRows, {
          periodFilter,
          search,
          category: categoryFilter,
        }),
        sortKey,
        sortDirection,
      ),
    [allRows, periodFilter, search, categoryFilter, sortKey, sortDirection],
  );

  const periodSummary = useMemo(
    () => clientChannelPeriodSummary(filteredRows, periodFilter),
    [filteredRows, periodFilter],
  );

  function toggleSort(key: ClientChannelSortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "activityDate" ? "desc" : "asc");
  }

  return (
    <Card glow className={CLIENT_PORTAL_VIEW_CARD_BORDER.experience}>
      <CardHeader
        title="전체 활동 이력"
        subtitle={`체험단 · 파워블로그 · 인플루언서 · 인스타 · 유튜브 · 클립 · 총 ${allRows.length}건`}
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
          searchPlaceholder={LIST_SEARCH_PLACEHOLDERS.activity}
          showSortHint
          filters={
            <div className="flex flex-wrap gap-1.5">
              <CategoryFilterButton
                active={categoryFilter === "all"}
                label="전체"
                count={allRows.length}
                onClick={() => setCategoryFilter("all")}
              />
              {CLIENT_CHANNEL_ORDER.map((category) => (
                <CategoryFilterButton
                  key={category}
                  active={categoryFilter === category}
                  label={CLIENT_CHANNEL_LABELS[category]}
                  count={categoryCounts[category]}
                  accent={CLIENT_CHANNEL_ACCENTS[category]}
                  onClick={() =>
                    setCategoryFilter((prev) =>
                      prev === category ? "all" : category,
                    )
                  }
                />
              ))}
            </div>
          }
        />
        <p className="text-xs text-zinc-500">
          이름은 가운데 * 처리 · 전화번호는 뒷 4자리만 표시됩니다.
        </p>
      </div>

      {filteredRows.length === 0 ? (
        <p className="pb-6 text-center text-sm text-zinc-500">
          조건에 맞는 활동이 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th className="w-10 pb-3 pr-2 text-center font-medium">#</th>
                <SortableTh
                  active={sortKey === "category"}
                  direction={sortDirection}
                  onClick={() => toggleSort("category")}
                  className="pb-3 pr-3"
                >
                  채널
                </SortableTh>
                <SortableTh
                  active={sortKey === "title"}
                  direction={sortDirection}
                  onClick={() => toggleSort("title")}
                  className="pb-3 pr-4"
                >
                  활동
                </SortableTh>
                <th className="pb-3 pr-4 font-medium">이름</th>
                <th className="pb-3 pr-4 font-medium">전화</th>
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
              {filteredRows.map((row, index) => {
                const highlighted =
                  row.experience &&
                  highlightAnchorIds?.has(
                    `client-action-experience-${row.experience.campaignId}`,
                  );
                const isExpanded = expandedKey === row.rowKey;
                const canExpand =
                  row.category === "experience" && row.experience !== undefined;

                return (
                  <ChannelRowGroup
                    key={row.rowKey}
                    row={row}
                    index={index}
                    isExpanded={isExpanded}
                    highlighted={highlighted}
                    canExpand={canExpand}
                    readOnly={readOnly}
                    contractId={contractId}
                    onToggleExpand={() =>
                      setExpandedKey((prev) =>
                        prev === row.rowKey ? null : row.rowKey,
                      )
                    }
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

function CategoryFilterButton({
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

function ChannelRowGroup({
  row,
  index,
  isExpanded,
  highlighted,
  canExpand,
  readOnly,
  contractId,
  onToggleExpand,
}: {
  row: ClientChannelActivityRow;
  index: number;
  isExpanded: boolean;
  highlighted?: boolean;
  canExpand: boolean;
  readOnly?: boolean;
  contractId: string;
  onToggleExpand: () => void;
}) {
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
          <Badge variant="default" className={channelBadgeClass(row.category)}>
            {row.categoryLabel}
          </Badge>
        </td>
        <td className="py-3 pr-4">
          <p className="font-medium text-zinc-200">{row.title}</p>
          <p className="text-xs text-zinc-600">{row.detail}</p>
        </td>
        <td className="py-3 pr-4 font-medium text-zinc-300">
          {row.displayName}
        </td>
        <td className="py-3 pr-4 font-mono text-xs text-zinc-400">
          {row.displayPhone}
        </td>
        <td className="py-3 pr-4 font-mono text-xs text-zinc-300">
          {row.activityDate || "-"}
        </td>
        <td className="py-3 pr-4">
          <Badge variant="default">
            {row.category === "experience"
              ? EXPERIENCE_SCHEDULING_STATUS_LABELS[
                  row.experience?.schedulingStatus ?? "draft"
                ] ?? row.statusLabel
              : row.statusLabel}
          </Badge>
        </td>
        <td className="py-3">
          <div className="flex items-center gap-2">
            {row.postUrl && (
              <a
                href={row.postUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
              >
                링크
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {canExpand && (
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
            )}
          </div>
        </td>
      </tr>

      {isExpanded && row.experience && (
        <tr className="border-b border-zinc-800/40 bg-zinc-950/40">
          <td colSpan={8} className="px-3 py-4 sm:px-4">
            {row.experience.schedulingStatus === "coordinating" && !readOnly ? (
              <ExperienceCampaignPanel
                contractId={contractId}
                mode="client"
                filterCampaignId={row.experience.campaignId}
              />
            ) : (
              <p className="text-sm text-zinc-500">
                {row.detail} ·{" "}
                {
                  EXPERIENCE_SCHEDULING_STATUS_LABELS[
                    row.experience.schedulingStatus
                  ]
                }
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

const CHANNEL_BADGE_CLASS: Record<ClientChannelCategory, string> = {
  experience: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
  power_blog: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  influencer: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  instagram: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200",
  youtube: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  clip: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  tiktok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
};

function channelBadgeClass(category: ClientChannelCategory): string {
  return CHANNEL_BADGE_CLASS[category];
}
