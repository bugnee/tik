"use client";

import { useState } from "react";
import { Link2, Send } from "lucide-react";
import { useWorkOrders } from "@/features/work-orders/useWorkOrders";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/FormFields";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import { formatKRW } from "@/lib/finance";
import type { AppData, PostLinkEntry } from "@/lib/types";
import { ClientLinkMultiSelect } from "@/components/contracts/ClientLinkMultiSelect";
import { WORK_ORDER_STAGE_LABELS } from "@/lib/work-order-utils";
import type { EnrichedWorkOrder } from "@/lib/work-order-utils";

export function PartnerWorkDeliverCard({
  data,
  order,
}: {
  data: AppData;
  order: EnrichedWorkOrder;
}) {
  const { deliverWorkOrder } = useWorkOrders();
  const contract = data.contracts.find((c) => c.id === order.contractId);
  const [url, setUrl] = useState(order.postLinks[0]?.url ?? "");
  const [memo, setMemo] = useState(order.memo ?? "");
  const [done, setDone] = useState(false);

  function handleSubmit() {
    const links: PostLinkEntry[] = url.trim()
      ? [
          {
            id: order.postLinks[0]?.id ?? `pl-${order.id}`,
            url: url.trim(),
            enteredAt: new Date().toISOString().slice(0, 10),
          },
        ]
      : [];
    const ok = deliverWorkOrder(order.id, links, memo);
    if (ok) setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        결과를 제출했습니다. 담당자 입금 확인 후 반영됩니다.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-zinc-950/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <TaskChannelBadge data={data} taskType={order.taskType} />
            <Badge variant="info">{WORK_ORDER_STAGE_LABELS.approved}</Badge>
          </div>
          <p className="mt-2 font-medium text-zinc-100">{order.title}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {order.clientName} · 마감 {order.dueDate}
          </p>
        </div>
        <p className="font-mono text-sm text-emerald-400">
          {formatKRW(order.totalAmount)}
        </p>
      </div>

      <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
        {contract && (
          <ClientLinkMultiSelect
            contract={contract}
            onApply={(urls) => {
              if (urls[0]) setUrl(urls[0]);
              if (urls.length > 1) {
                const extra = urls.slice(1).join("\n");
                setMemo((prev) => (prev.trim() ? `${prev}\n${extra}` : extra));
              }
            }}
          />
        )}
        <Input
          label="포스팅 · 결과 URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://"
        />
        <Textarea
          label="전달 메모"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
        />
        <Button size="sm" onClick={handleSubmit} disabled={!url.trim() && !memo.trim()}>
          <Send className="h-4 w-4" />
          결과 제출
        </Button>
      </div>
    </div>
  );
}
