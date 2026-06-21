"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { useWorkOrders } from "@/features/work-orders/useWorkOrders";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { WorkOrderRejectReasonField } from "@/components/work-orders/WorkOrderRejectReasonField";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import { WorkOrderCostBreakdown } from "@/components/work-orders/WorkOrderCostBreakdown";
import { formatKRW } from "@/lib/finance";
import { getStaffPendingConfirmOrders } from "@/lib/partner-work-queue-utils";
import { getUserName } from "@/lib/selectors";
import {
  resolveWorkOrderRejectReason,
  STAFF_WORK_REJECT_REASONS,
} from "@/lib/work-order-reject-utils";
import type { AppData } from "@/lib/types";
import { WORK_ORDER_STAGE_LABELS } from "@/lib/work-order-utils";
import type { EnrichedWorkOrder } from "@/lib/work-order-utils";

import { PARTNER_SELF_SERVICE_WORKFLOW_ENABLED } from "@/lib/partner-workflow-config";

/** 담당자 — 파트너 승인 후 확인 · 업무 반영 */
export function StaffWorkConfirmPanel({ className }: { className?: string }) {
  if (!PARTNER_SELF_SERVICE_WORKFLOW_ENABLED) return null;
  const data = useData();
  const { currentUser, activeRole } = useRole();
  const { confirmWorkOrderByStaff, rejectWorkOrderByStaff } = useWorkOrders();

  const orders = getStaffPendingConfirmOrders(
    data,
    currentUser.id,
    activeRole,
  );

  if (orders.length === 0) return null;

  return (
    <Card glow className={`border-violet-500/25 ${className ?? ""}`}>
      <CardHeader
        title="파트너 승인 확인"
        subtitle={`${orders.length}건 · 확인 후 업무가 진행 단계로 반영됩니다`}
      />
      <div className="space-y-3 px-4 pb-4">
        {orders.map((order) => (
          <StaffConfirmRow
            key={order.id}
            data={data}
            order={order}
            approverName={
              order.approvedBy ? getUserName(data, order.approvedBy) : "-"
            }
            onConfirm={() => confirmWorkOrderByStaff(order.id, currentUser.id)}
            onReject={(reason) =>
              rejectWorkOrderByStaff(order.id, currentUser.id, reason)
            }
          />
        ))}
      </div>
    </Card>
  );
}

function StaffConfirmRow({
  data,
  order,
  approverName,
  onConfirm,
  onReject,
}: {
  data: AppData;
  order: EnrichedWorkOrder;
  approverName: string;
  onConfirm: () => void;
  onReject: (reason: string) => void;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectPreset, setRejectPreset] = useState("");
  const [rejectCustom, setRejectCustom] = useState("");
  const [hidden, setHidden] = useState(false);

  const resolvedRejectReason = resolveWorkOrderRejectReason(
    rejectPreset,
    rejectCustom,
    STAFF_WORK_REJECT_REASONS,
  );

  if (hidden) return null;

  return (
    <div className="rounded-xl border border-violet-500/20 bg-zinc-950/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TaskChannelBadge data={data} taskType={order.taskType} />
            <Badge variant="warning">
              {WORK_ORDER_STAGE_LABELS.pending_staff_confirm}
            </Badge>
          </div>
          <p className="mt-2 font-medium text-zinc-100">{order.title}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {order.clientName} · {order.partnerName} · 마감 {order.dueDate}
          </p>
          <p className="mt-2 text-xs text-violet-200/90">
            파트너 승인 · {approverName}
            {order.approvedAt && ` · ${order.approvedAt}`}
          </p>
          {order.partnerApprovalNote && (
            <p className="mt-2 rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-sm text-zinc-200">
              <span className="text-xs text-violet-300">파트너 피드백 · </span>
              {order.partnerApprovalNote}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-emerald-400">
            {formatKRW(order.totalAmount)}
          </p>
          <WorkOrderCostBreakdown lines={order.costLines} className="mt-1" />
        </div>
      </div>

      {!rejectMode ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              onConfirm();
              setHidden(true);
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            확인 · 업무 진행
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setRejectPreset("");
              setRejectCustom("");
              setRejectMode(true);
            }}
          >
            <XCircle className="h-4 w-4" />
            반려
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-2 border-t border-zinc-800 pt-4">
          <WorkOrderRejectReasonField
            options={STAFF_WORK_REJECT_REASONS}
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
                setRejectMode(false);
              }}
            >
              취소
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={!resolvedRejectReason}
              onClick={() => {
                if (!resolvedRejectReason) return;
                onReject(resolvedRejectReason);
                setHidden(true);
              }}
            >
              반려
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
