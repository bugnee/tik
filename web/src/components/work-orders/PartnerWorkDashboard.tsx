"use client";

import { useMemo, useState } from "react";
import { Check, Link2, PackageCheck, X } from "lucide-react";
import { PostLinksField } from "@/components/executions/PostLinksField";
import { PartnerWorkCalendar } from "@/components/work-orders/PartnerWorkCalendar";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/FormFields";
import { formatKRW } from "@/lib/finance";
import { formatPartnerCategories, getPartnerName } from "@/lib/partner-utils";
import type { PostLinkEntry } from "@/lib/types";
import {
  enrichWorkOrder,
  filterWorkOrdersByPartner,
  WORK_ORDER_COST_LABELS,
  WORK_ORDER_STAGE_LABELS,
} from "@/lib/work-order-utils";
import {
  getWorkOrderEndDate,
  getWorkOrderStartDate,
} from "@/lib/partner-work-calendar-utils";
import { createEmptyPostLink } from "@/lib/execution-utils";

export function PartnerWorkDashboard() {
  const data = useData();
  const { currentUser } = useRole();
  const {
    workOrders,
    partners,
    approveWorkOrder,
    rejectWorkOrder,
    deliverWorkOrder,
  } = data;

  const partnerId = currentUser.partnerId ?? partners[0]?.id ?? "";
  const partner = partners.find((p) => p.id === partnerId);
  const partnerName = getPartnerName(partners, partnerId);
  const partnerFields = partner
    ? formatPartnerCategories(partner.categories)
    : "";

  const orders = useMemo(
    () =>
      filterWorkOrdersByPartner(workOrders, partnerId)
        .filter((o) => o.stage !== "draft" && o.stage !== "order_ready")
        .map((o) => enrichWorkOrder(data, o)),
    [workOrders, partnerId, data],
  );

  const pending = orders.filter((o) => o.stage === "pending_approval");
  const approved = orders.filter((o) => o.stage === "approved");
  const delivered = orders.filter((o) => o.stage === "delivered");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
          파트너 수주함
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {partnerName}
          {partnerFields && ` · ${partnerFields}`} · 승인 · 링크/메모 제출 ·
          입금 대기
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="승인 대기" value={pending.length} accent="amber" />
        <Stat label="결과 입력" value={approved.length} accent="cyan" />
        <Stat label="입금 대기" value={delivered.length} accent="emerald" />
      </div>

      <PartnerWorkCalendar orders={orders} />

      <OrderSection title="승인 요청" items={pending} variant="pending" />
      <OrderSection title="링크 · 메모 입력" items={approved} variant="approved" />
      <OrderSection title="입금 대기 (제출 완료)" items={delivered} variant="delivered" />
    </div>
  );

  function OrderSection({
    title,
    items,
    variant,
  }: {
    title: string;
    items: ReturnType<typeof enrichWorkOrder>[];
    variant: "pending" | "approved" | "delivered";
  }) {
    return (
      <Card glow={items.length > 0}>
        <CardHeader
          title={title}
          action={
            items.length > 0 ? (
              <Badge variant="warning">{items.length}건</Badge>
            ) : undefined
          }
        />
        <div className="space-y-3">
          {items.map((item) => (
            <PartnerOrderCard
              key={item.id}
              item={item}
              variant={variant}
              onApprove={() => {
                if (!approveWorkOrder(item.id, currentUser.id)) {
                  alert("승인할 수 없습니다.");
                }
              }}
              onReject={() => {
                const reason = prompt("반려 사유를 입력하세요") ?? "반려";
                rejectWorkOrder(item.id, reason);
              }}
              onDeliver={(links, memo) => {
                if (!deliverWorkOrder(item.id, links, memo)) {
                  alert("링크 또는 메모를 입력하세요.");
                }
              }}
            />
          ))}
          {items.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500">
              {title} 건이 없습니다
            </p>
          )}
        </div>
      </Card>
    );
  }
}

function PartnerOrderCard({
  item,
  variant,
  onApprove,
  onReject,
  onDeliver,
}: {
  item: ReturnType<typeof enrichWorkOrder>;
  variant: "pending" | "approved" | "delivered";
  onApprove: () => void;
  onReject: () => void;
  onDeliver: (links: PostLinkEntry[], memo: string) => void;
}) {
  const [links, setLinks] = useState<PostLinkEntry[]>(
    item.postLinks.length ? item.postLinks : [createEmptyPostLink()],
  );
  const [memo, setMemo] = useState(item.memo ?? "");

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-zinc-200">{item.clientName}</p>
          <p className="text-sm text-zinc-400">{item.title}</p>
          <p className="mt-1 text-xs text-zinc-500">
            시작 {getWorkOrderStartDate(item)} · 마감 {getWorkOrderEndDate(item)} ·{" "}
            {WORK_ORDER_STAGE_LABELS[item.stage]}
          </p>
        </div>
        <p className="font-mono text-sm font-semibold text-emerald-400">
          {formatKRW(item.totalAmount)}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
        {item.costLines
          .filter((l) => l.amount > 0)
          .map((l) => (
            <span key={l.type}>
              {WORK_ORDER_COST_LABELS[l.type]} {formatKRW(l.amount)}
            </span>
          ))}
      </div>

      {variant === "pending" && (
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={onReject}>
            <X className="h-3.5 w-3.5" />
            반려
          </Button>
          <Button size="sm" onClick={onApprove}>
            <Check className="h-3.5 w-3.5" />
            승인
          </Button>
        </div>
      )}

      {variant === "approved" && (
        <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
          {item.taskType === "referral" ? (
            <Textarea
              label="리셀러 완료 메모 *"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              placeholder="영업 고객사명 · 연락처 · 영업 경위 등"
            />
          ) : (
            <>
              <PostLinksField
                links={links}
                onChange={setLinks}
                defaultDueDate={item.dueDate}
              />
              <Textarea
                label="메모"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
                placeholder="집행 결과 메모"
              />
            </>
          )}
          <Button
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => onDeliver(links, memo)}
          >
            <PackageCheck className="h-3.5 w-3.5" />
            {item.taskType === "referral" ? "리셀러 완료 제출" : "링크·메모 제출"}
          </Button>
        </div>
      )}

      {variant === "delivered" && (
        <div className="mt-3 text-xs text-zinc-500">
          {item.memo && <p className="text-zinc-400">{item.memo}</p>}
          <p className="mt-1 text-amber-400/90">
            담당자 입금 확인 후 오더준 · 원가 자동 반영
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "amber" | "cyan" | "emerald";
}) {
  const colors = {
    amber: "text-amber-400",
    cyan: "text-cyan-400",
    emerald: "text-emerald-400",
  };
  return (
    <Card className="p-4 text-center">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${colors[accent]}`}>{value}</p>
    </Card>
  );
}
