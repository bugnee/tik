"use client";

import { BarChart3, CalendarDays, FileText, MessageCircle, Sparkles } from "lucide-react";
import {
  CLIENT_PORTAL_VIEW_ICON_SURFACE,
  CLIENT_PORTAL_VIEW_SURFACE,
  CLIENT_PORTAL_VIEWS,
  type ClientPortalView,
} from "@/lib/client-portal-utils";
import { cn } from "@/lib/cn";

const VIEW_ICONS = {
  performance: BarChart3,
  collaborate: MessageCircle,
  schedule: CalendarDays,
  experience: Sparkles,
  contract: FileText,
} as const;

/** 성과 탭 외 서브 화면 상단 — 탭별 색상 헤더 */
export function ClientPortalViewHeader({
  view,
  clientName,
  headline,
  badges,
}: {
  view: ClientPortalView;
  clientName: string;
  headline: string;
  badges: React.ReactNode;
}) {
  const meta = CLIENT_PORTAL_VIEWS.find((item) => item.id === view)!;
  const Icon = VIEW_ICONS[view];

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        CLIENT_PORTAL_VIEW_SURFACE[view],
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            CLIENT_PORTAL_VIEW_ICON_SURFACE[view],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            {meta.label}
          </p>
          <p className="text-lg font-semibold text-zinc-100">{clientName}</p>
          <p className="text-xs text-zinc-500">{headline}</p>
          <div className="mt-3 flex flex-wrap gap-2">{badges}</div>
        </div>
      </div>
    </div>
  );
}
