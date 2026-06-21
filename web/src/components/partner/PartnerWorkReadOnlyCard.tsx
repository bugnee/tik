"use client";

import { ExternalLink, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import { WorkOrderCostBreakdown } from "@/components/work-orders/WorkOrderCostBreakdown";
import { WorkOrderTimelineDeliverables } from "@/components/work-orders/WorkOrderTimelineDeliverables";
import { ReferralCommissionWorkNote } from "@/components/work-orders/ReferralCommissionWorkNote";
import { formatKRW } from "@/lib/finance";
import type { AppData } from "@/lib/types";
import {
  isReferralCommissionWorkOrder,
  WORK_ORDER_STAGE_LABELS,
  getWorkOrderStageLabel,
  WORK_ORDER_STAGE_BADGE_VARIANT,
  type EnrichedWorkOrder,
} from "@/lib/work-order-utils";

/** 파트너 포털 — 배정 업무 조회 전용 (승인·결과입력 없음) */
export function PartnerWorkReadOnlyCard({
  data,
  order,
}: {
  data: AppData;
  order: EnrichedWorkOrder;
}) {
  const isReferral = isReferralCommissionWorkOrder(order);
  const contract = data.contracts.find((c) => c.id === order.contractId);
  const links = order.postLinks.filter((l) => l.url?.trim());

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TaskChannelBadge data={data} taskType={order.taskType} />
            <Badge variant={WORK_ORDER_STAGE_BADGE_VARIANT[order.stage]}>
              {getWorkOrderStageLabel(order, contract)}
            </Badge>
          </div>
          <p className="mt-2 font-medium text-zinc-100">{order.title}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {order.clientName} · 담당 {order.staffName} · 마감 {order.dueDate}
          </p>
          {order.partnerApprovalNote && (
            <p className="mt-2 text-xs text-violet-300/90">
              참고: {order.partnerApprovalNote}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-emerald-400">
            {order.totalAmount > 0 ? formatKRW(order.totalAmount) : "비용 없음"}
          </p>
          {order.totalAmount > 0 && (
            <WorkOrderCostBreakdown
              lines={order.costLines}
              className="mt-1"
              variant={isReferral ? "referral" : "default"}
            />
          )}
        </div>
      </div>

      {isReferral ? (
        <ReferralCommissionWorkNote order={order} />
      ) : (
        <WorkOrderTimelineDeliverables order={order} />
      )}

      {!isReferral && links.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-zinc-800 pt-3">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-1.5 text-xs text-emerald-400 hover:underline"
            >
              <Link2 className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="min-w-0 break-all">{link.url}</span>
              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
            </a>
          ))}
        </div>
      )}

      {order.memo && (
        <p className="mt-2 text-xs text-zinc-500">메모 · {order.memo}</p>
      )}
    </div>
  );
}
