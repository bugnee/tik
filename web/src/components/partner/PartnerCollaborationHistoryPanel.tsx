"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight, ExternalLink, Handshake, Link2, Receipt, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { PeriodFilterBar } from "@/components/ui/PeriodFilterBar";
import { formatKRW } from "@/lib/finance";
import {
  formatPartnerCollaborationAmount,
  getPartnerCollaborationForPeriod,
  type PartnerCollaborationItem,
  type PartnerCollaborationPeriodSummary,
  type PeriodFilterValue,
} from "@/lib/partner-detail-utils";
import type { AppData } from "@/lib/types";
import { cn } from "@/lib/cn";

type PartnerCollaborationHistoryPanelProps = {
  data: AppData;
  partnerId: string;
  periodFilter: PeriodFilterValue;
  onPeriodFilterChange: (value: PeriodFilterValue) => void;
  showPeriodFilter?: boolean;
  glow?: boolean;
  id?: string;
};

export function PartnerCollaborationHistoryPanel({
  data,
  partnerId,
  periodFilter,
  onPeriodFilterChange,
  showPeriodFilter = true,
  glow,
  id = "collaboration",
}: PartnerCollaborationHistoryPanelProps) {
  const { items, summary, periodLabel } = useMemo(
    () => getPartnerCollaborationForPeriod(data, partnerId, periodFilter),
    [data, partnerId, periodFilter],
  );

  return (
    <div id={id}>
      <Card glow={glow}>
        <CardHeader
          title="협업 이력"
          subtitle={`${periodLabel} · 완료 업무 · 원가 지급 · 리셀러`}
        />

        {showPeriodFilter && (
          <div className="mb-4">
            <PeriodFilterBar
              value={periodFilter}
              onChange={onPeriodFilterChange}
              summary={`${periodLabel} · ${summary.totalCount}건 · 합계 ${formatKRW(summary.totalAmount)}`}
            />
          </div>
        )}

        <CollaborationPeriodSummaryTable summary={summary} periodLabel={periodLabel} />

        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            선택 기간의 협업 이력이 없습니다.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {items.map((item) => (
              <CollaborationRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function CollaborationPeriodSummaryTable({
  summary,
  periodLabel,
}: {
  summary: PartnerCollaborationPeriodSummary;
  periodLabel: string;
}) {
  const rows = [
    {
      key: "work_order",
      label: "완료 업무",
      icon: Handshake,
      count: summary.workOrderCount,
      amount: summary.workOrderAmount,
      accent: "text-cyan-400",
    },
    {
      key: "expense",
      label: "원가 지급",
      icon: Receipt,
      count: summary.expenseCount,
      amount: summary.expenseAmount,
      accent: "text-emerald-400",
    },
    {
      key: "referral",
      label: "리셀러",
      icon: Users,
      count: summary.referralCount,
      amount: summary.referralAmount,
      accent: "text-amber-400",
    },
  ] as const;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/30">
      <table className="w-full min-w-[360px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500">
            <th className="px-3 py-2 font-medium">구분</th>
            <th className="px-3 py-2 font-medium">건수</th>
            <th className="px-3 py-2 font-medium">금액</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <tr key={row.key} className="border-b border-zinc-800/80">
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2 font-medium text-zinc-200">
                    <Icon className={cn("h-3.5 w-3.5", row.accent)} />
                    {row.label}
                  </span>
                </td>
                <td className={cn("px-3 py-2.5 tabular-nums", row.accent)}>
                  {row.count}건
                </td>
                <td className="px-3 py-2.5 font-mono text-zinc-300">
                  {row.amount > 0 ? formatKRW(row.amount) : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-zinc-900/50">
            <td className="px-3 py-2.5 text-xs font-semibold text-zinc-300">
              {periodLabel} 합계
            </td>
            <td className="px-3 py-2.5 text-sm font-bold tabular-nums text-zinc-100">
              {summary.totalCount}건
            </td>
            <td className="px-3 py-2.5 font-mono text-sm font-bold text-emerald-400">
              {formatKRW(summary.totalAmount)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function CollaborationRow({ item }: { item: PartnerCollaborationItem }) {
  const kindLabel =
    item.kind === "work_order"
      ? "집행 완료"
      : item.kind === "expense"
        ? "원가 지급"
        : "리셀러";

  const postLinks = item.postLinks ?? [];
  const hasExtras = !!(item.memo?.trim() || postLinks.length > 0);

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/30 px-4 py-3">
      <div className="min-w-[72px] pt-0.5 text-xs text-zinc-600">{item.date}</div>
      <Badge variant="default" className="shrink-0 text-[10px]">
        {kindLabel}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200">{item.title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {item.clientName}
          {item.detail ? ` · ${item.detail}` : ""}
        </p>
        {hasExtras && (
          <div className="mt-2 space-y-1.5 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2">
            {item.memo?.trim() && (
              <p className="text-xs leading-relaxed text-zinc-400">
                <span className="font-medium text-zinc-500">메모</span>{" "}
                {item.memo}
              </p>
            )}
            {postLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-1.5 text-xs text-emerald-400 hover:underline"
              >
                <Link2 className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="min-w-0 break-all">
                  {link.url}
                  {link.completedDate && (
                    <span className="ml-1 text-zinc-600">
                      · 등록 {link.completedDate}
                    </span>
                  )}
                </span>
                <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="text-right">
        <p className="font-mono text-sm text-zinc-300">
          {formatPartnerCollaborationAmount(item.amount)}
        </p>
        <p className="text-[10px] text-zinc-600">{item.statusLabel}</p>
      </div>
      {item.contractId && (
        <Link
          href={`/contracts/${item.contractId}`}
          className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
          title="계약 상세"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
