"use client";

import { FileText } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  CLIENT_CONTRACT_FOCUS_LABELS,
  CLIENT_CONTRACT_FOCUS_ICON,
  CLIENT_PORTAL_VIEW_CARD_BORDER,
  type ClientContractFocus,
  type ClientContractFocusItem,
} from "@/lib/client-portal-utils";
import { cn } from "@/lib/cn";

export function ClientContractFocusPanel({
  focus,
  items,
}: {
  focus: ClientContractFocus;
  items: ClientContractFocusItem[];
}) {
  return (
    <Card glow className={CLIENT_PORTAL_VIEW_CARD_BORDER.contract}>
      <CardHeader
        title={CLIENT_CONTRACT_FOCUS_LABELS[focus]}
        subtitle="선택한 항목과 관련된 업무 · 이력"
      />
      {items.length === 0 ? (
        <p className="pb-4 text-center text-sm text-zinc-500">
          관련 업무가 없습니다
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"
            >
              <FileText
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  CLIENT_CONTRACT_FOCUS_ICON[focus],
                )}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {item.date ? `${item.date} · ` : ""}
                  {item.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
