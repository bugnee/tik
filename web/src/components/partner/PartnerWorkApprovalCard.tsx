"use client";

import { useState } from "react";
import { CheckCircle2, MessageSquare, XCircle } from "lucide-react";
import { useWorkOrders } from "@/features/work-orders/useWorkOrders";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/FormFields";
import { WorkOrderRejectReasonField } from "@/components/work-orders/WorkOrderRejectReasonField";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import { WorkOrderCostBreakdown } from "@/components/work-orders/WorkOrderCostBreakdown";
import { formatKRW } from "@/lib/finance";
import {
  PARTNER_WORK_REJECT_REASONS,
  resolveWorkOrderRejectReason,
} from "@/lib/work-order-reject-utils";
import type { AppData } from "@/lib/types";
import { WORK_ORDER_STAGE_LABELS } from "@/lib/work-order-utils";
import type { EnrichedWorkOrder } from "@/lib/work-order-utils";

export function PartnerWorkApprovalCard({
  data,
  order,
}: {
  data: AppData;
  order: EnrichedWorkOrder;
}) {
  const { currentUser } = useRole();
  const { approveWorkOrder, rejectWorkOrder } = useWorkOrders();
  const [note, setNote] = useState("");
  const [rejectPreset, setRejectPreset] = useState("");
  const [rejectCustom, setRejectCustom] = useState("");
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const resolvedRejectReason = resolveWorkOrderRejectReason(
    rejectPreset,
    rejectCustom,
    PARTNER_WORK_REJECT_REASONS,
  );

  function handleApprove() {
    const ok = approveWorkOrder(order.id, currentUser.id, note);
    if (ok) {
      setFeedback("승인했습니다. 담당자 확인 후 업무가 시작됩니다.");
      setMode(null);
    }
  }

  function handleReject() {
    if (!resolvedRejectReason) return;
    rejectWorkOrder(order.id, resolvedRejectReason);
    setFeedback("반려했습니다. 담당자에게 전달됩니다.");
    setMode(null);
  }

  if (feedback) {
    return (
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        {feedback}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TaskChannelBadge data={data} taskType={order.taskType} />
            <Badge variant="warning">
              {WORK_ORDER_STAGE_LABELS.pending_approval}
            </Badge>
          </div>
          <p className="mt-2 font-medium text-zinc-100">{order.title}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {order.clientName} · 담당 {order.staffName} · 마감 {order.dueDate}
          </p>
          {order.memo && (
            <p className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400">
              {order.memo}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-semibold text-emerald-400">
            {formatKRW(order.totalAmount)}
          </p>
          <WorkOrderCostBreakdown lines={order.costLines} className="mt-1" />
        </div>
      </div>

      {mode === null && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setMode("approve")}>
            <CheckCircle2 className="h-4 w-4" />
            승인 · 담당자에게 전달
          </Button>
          <Button size="sm" variant="secondary" onClick={() => {
            setRejectPreset("");
            setRejectCustom("");
            setMode("reject");
          }}>
            <XCircle className="h-4 w-4" />
            반려
          </Button>
        </div>
      )}

      {mode === "approve" && (
        <div className="mt-4 space-y-3 border-t border-amber-500/15 pt-4">
          <Textarea
            label="파트너 피드백 (선택)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="일정 조율 · 제작 조건 · 문의 사항"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setMode(null)}>
              취소
            </Button>
            <Button size="sm" onClick={handleApprove}>
              <MessageSquare className="h-4 w-4" />
              승인 전송
            </Button>
          </div>
        </div>
      )}

      {mode === "reject" && (
        <div className="mt-4 space-y-3 border-t border-rose-500/15 pt-4">
          <WorkOrderRejectReasonField
            options={PARTNER_WORK_REJECT_REASONS}
            presetId={rejectPreset}
            onPresetChange={setRejectPreset}
            customText={rejectCustom}
            onCustomTextChange={setRejectCustom}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setRejectPreset("");
                setRejectCustom("");
                setMode(null);
              }}
            >
              취소
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={!resolvedRejectReason}
              onClick={handleReject}
            >
              반려 전송
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
