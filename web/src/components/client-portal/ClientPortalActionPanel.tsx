"use client";

import { ArrowDown, Check, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  getClientPortalActionItemsForView,
  type ClientPortalActionItem,
  type ClientPortalView,
} from "@/lib/client-portal-utils";
import { cn } from "@/lib/cn";

/** 처리 항목 위치로 스크롤 */
function scrollToClientAction(anchorId: string) {
  document.getElementById(anchorId)?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

/** 현재 탭 상단 — 뱃지 숫자의 구체적 내용 */
export function ClientPortalActionPanel({
  items,
  view,
  onDismiss,
  className,
}: {
  items: ClientPortalActionItem[];
  view: ClientPortalView;
  /** 미리보기 모드 등 — 확인 버튼 숨김 */
  onDismiss?: (actionId: string) => void;
  className?: string;
}) {
  const viewItems = getClientPortalActionItemsForView(items, view);
  if (viewItems.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-[var(--card-muted)] to-[var(--card-muted)] p-3 sm:p-4",
        className,
      )}
      aria-label="해야 할 일"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-100">
          <ListTodo className="h-4 w-4 text-amber-300" />
          해야 할 일 {viewItems.length}건
        </span>
        <span className="text-xs text-zinc-400">
          탭 뱃지와 동일 기준 · 해당 위치로 이동
        </span>
      </div>

      <ul className="space-y-2">
        {viewItems.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-200">{item.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                {item.detail}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => scrollToClientAction(item.anchorId)}
              >
                {item.actionLabel ?? "이동"}
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              {onDismiss && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onDismiss(item.id)}
                >
                  <Check className="h-3.5 w-3.5" />
                  확인
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
