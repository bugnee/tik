"use client";

import { ExternalLink, Link2, MessageSquare } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import { useData } from "@/context/DataContext";
import {
  formatPostLinkOpinionAuthor,
  getPostLinkOpinionsForWorkOrderLink,
} from "@/lib/post-link-opinion-utils";
import { getWorkOrderTaskLabel } from "@/lib/task-channel-utils";
import type { WorkOrder } from "@/lib/types";
import {
  isReferralCommissionWorkOrder,
  resolveWorkOrderPostLink,
} from "@/lib/work-order-utils";
import { ReferralCommissionWorkNote } from "@/components/work-orders/ReferralCommissionWorkNote";

/** 업무 타임라인 — 노출채널 · 키워드 · 해당 회차 피드백 링크 1건 */
export function WorkOrderTimelineDeliverables({ order }: { order: WorkOrder }) {
  const data = useData();

  if (isReferralCommissionWorkOrder(order)) {
    return <ReferralCommissionWorkNote order={order} />;
  }

  const channelLabel = getWorkOrderTaskLabel(data, order.taskType);
  const link = useMemo(
    () => resolveWorkOrderPostLink(data, order),
    [data, order],
  );

  const opinions = useMemo(
    () =>
      link
        ? getPostLinkOpinionsForWorkOrderLink(
            data,
            order.contractId,
            order.id,
            link,
          )
        : [],
    [data, link, order.contractId, order.id],
  );

  const keyword = link?.keyword?.trim();

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          노출채널
        </span>
        <TaskChannelBadge data={data} taskType={order.taskType} />
        <span className="text-xs text-zinc-400">{channelLabel}</span>
      </div>

      {keyword ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            키워드
          </span>
          <span className="rounded-md bg-zinc-950/60 px-2 py-0.5 text-xs text-zinc-300">
            {keyword}
          </span>
          {link?.searchRank != null && (
            <Badge variant="info" className="text-[10px]">
              {link.searchRank}위
            </Badge>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            키워드
          </span>
          <span className="text-xs text-zinc-600">
            미등록 · 계약 상세 → 집행 실행 → 포스팅 링크 {order.sequence}번째 행
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          피드백 링크
        </span>
        {!link ? (
          <p className="text-xs text-zinc-600">
            등록 전 · {order.sequence}회차 납품·오더준 후 표시됩니다
          </p>
        ) : (
          <div className="rounded-md border border-zinc-800/60 bg-zinc-950/50 px-2.5 py-2">
            <a
              href={
                link.url.startsWith("http") ? link.url : `https://${link.url}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-1.5 break-all text-xs text-emerald-400 hover:underline"
            >
              <Link2 className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="min-w-0 flex-1">{link.url}</span>
              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
            </a>
            {(link.completedDate || link.dueDate) && (
              <p className="mt-1 text-[10px] text-zinc-600">
                {link.completedDate && `발행 ${link.completedDate}`}
                {link.completedDate && link.dueDate && " · "}
                {link.dueDate && `마감 ${link.dueDate}`}
              </p>
            )}
            {opinions.map((opinion) => (
              <p
                key={opinion.id}
                className="mt-2 flex items-start gap-1.5 rounded-md border border-violet-500/20 bg-violet-500/5 px-2 py-1.5 text-[11px] leading-relaxed text-zinc-300"
              >
                <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-violet-400" />
                <span>
                  <span className="text-violet-300">
                    {formatPostLinkOpinionAuthor(data, opinion)} ·{" "}
                  </span>
                  {opinion.body}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
