"use client";



import { useState } from "react";

import { Send } from "lucide-react";

import { useWorkOrders } from "@/features/work-orders/useWorkOrders";

import { Badge } from "@/components/ui/Badge";

import { Button } from "@/components/ui/Button";

import { Input, Textarea } from "@/components/ui/FormFields";

import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";

import type { AppData, PostLinkEntry } from "@/lib/types";

import {

  isReferralCommissionWorkOrder,

  WORK_ORDER_STAGE_LABELS,

  type EnrichedWorkOrder,

} from "@/lib/work-order-utils";



/** 담당 — approved 단계 결과 URL·메모 등록 (집행 업무만) */

export function StaffWorkDeliverCard({

  data,

  order,

}: {

  data: AppData;

  order: EnrichedWorkOrder;

}) {

  const { deliverWorkOrder } = useWorkOrders();

  const [url, setUrl] = useState(order.postLinks[0]?.url ?? "");

  const [memo, setMemo] = useState(order.memo ?? "");

  const [hidden, setHidden] = useState(false);



  if (isReferralCommissionWorkOrder(order)) return null;



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

    if (ok) setHidden(true);

  }



  if (hidden) return null;



  return (

    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">

      <div className="flex flex-wrap items-center gap-2">

        <TaskChannelBadge data={data} taskType={order.taskType} />

        <Badge variant="info">{WORK_ORDER_STAGE_LABELS.approved}</Badge>

      </div>

      <p className="mt-2 font-medium text-zinc-100">{order.title}</p>

      <p className="mt-1 text-xs text-zinc-500">

        {order.clientName} · 파트너 {order.partnerName} · 마감 {order.dueDate}

      </p>

      <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">

        <Input

          label="결과 URL"

          type="url"

          placeholder="https://..."

          value={url}

          onChange={(e) => setUrl(e.target.value)}

        />

        <Textarea

          label="메모 (선택)"

          value={memo}

          onChange={(e) => setMemo(e.target.value)}

          rows={2}

        />

        <Button size="sm" onClick={handleSubmit}>

          <Send className="h-3.5 w-3.5" />

          결과 등록 · 납품

        </Button>

      </div>

    </div>

  );

}


