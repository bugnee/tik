"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ExternalLink, PackageCheck, Receipt } from "lucide-react";
import { useData } from "@/context/DataContext";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/DataTable";
import { formatKRW } from "@/lib/finance";
import { getWorkOrderTaskLabel } from "@/lib/task-channel-utils";
import {
  enrichWorkOrder,
  WORK_ORDER_STAGE_LABELS,
} from "@/lib/work-order-utils";

export function OrderReadyQueue() {
  const data = useData();
  const { workOrders, expenses } = data;

  const ready = useMemo(
    () =>
      workOrders
        .filter((o) => o.stage === "order_ready")
        .map((o) => enrichWorkOrder(data, o))
        .sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? "")),
    [workOrders, data],
  );

  return (
    <Card glow={ready.length > 0}>
      <CardHeader
        title="오더준"
        subtitle="입금 확인 완료 · 원가·실행 진행에 자동 반영된 건"
        action={
          ready.length > 0 ? (
            <Badge variant="success">
              <PackageCheck className="mr-1 inline h-3 w-3" />
              {ready.length}건
            </Badge>
          ) : undefined
        }
      />
      <div className="space-y-3">
        {ready.map((item) => {
          const expense = expenses.find((e) => e.id === item.expenseId);
          return (
            <div
              key={item.id}
              className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-100">{item.clientName}</p>
                  <p className="mt-0.5 text-sm text-zinc-400">
                    {item.title} · {getWorkOrderTaskLabel(data, item.taskType)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    파트너 {item.partnerName} · {item.costSummary}
                  </p>
                  {item.memo && (
                    <p className="mt-1 text-xs text-zinc-600">{item.memo}</p>
                  )}
                  <p className="mt-1 text-xs text-emerald-400/80">
                    {WORK_ORDER_STAGE_LABELS.order_ready} · 입금{" "}
                    {item.paidAt ?? "-"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-emerald-400">
                    {formatKRW(item.totalAmount)}
                  </p>
                  {expense && (
                    <Link
                      href="/expenses"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
                    >
                      <Receipt className="h-3 w-3" />
                      원가 반영됨
                    </Link>
                  )}
                  {item.postLinks.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {item.postLinks.map((l) => (
                        <a
                          key={l.id}
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-end gap-1 text-xs text-zinc-500 hover:text-emerald-400"
                        >
                          <ExternalLink className="h-3 w-3" />
                          링크
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {ready.length === 0 && (
          <EmptyState message="오더준 완료 건이 없습니다 · 타임라인에서 입금 확인 시 자동 반영" />
        )}
      </div>
    </Card>
  );
}
