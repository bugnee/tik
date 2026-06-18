"use client";

import {
  CLIENT_PORTAL_VIEWS,
  type ClientPortalBadgeCounts,
  type ClientPortalView,
} from "@/lib/client-portal-utils";
import { getTabButtonClass } from "@/lib/tab-ui-utils";
import { NavAlertBadge } from "@/components/ui/NavAlertBadge";
import { cn } from "@/lib/cn";
import {
  BarChart3,
  CalendarDays,
  FileText,
  MessageCircle,
  Sparkles,
} from "lucide-react";

const VIEW_ICONS = {
  performance: BarChart3,
  collaborate: MessageCircle,
  schedule: CalendarDays,
  experience: Sparkles,
  contract: FileText,
} as const;

export function ClientPortalTabBar({
  active,
  onChange,
  badgeCounts,
  className,
}: {
  active: ClientPortalView;
  onChange: (view: ClientPortalView) => void;
  badgeCounts?: ClientPortalBadgeCounts | null;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "sticky top-14 z-40 -mx-3 border-b border-zinc-800/80 bg-[var(--background)]/95 px-3 py-2 backdrop-blur-md sm:-mx-4 sm:px-4 md:top-16 lg:static lg:mx-0 lg:rounded-xl lg:border lg:bg-zinc-950/50 lg:px-2 lg:py-1.5",
        className,
      )}
      aria-label="고객사 포털 메뉴"
    >
      <div className="flex gap-1 overflow-x-auto">
        {CLIENT_PORTAL_VIEWS.map((view) => {
          const Icon = VIEW_ICONS[view.id];
          const isActive = active === view.id;
          return (
            <button
              key={view.id}
              type="button"
              onClick={() => onChange(view.id)}
              className={getTabButtonClass(
                view.accent,
                isActive,
                "shrink-0 gap-1.5 px-3 py-2 text-sm",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{view.label}</span>
              <NavAlertBadge count={badgeCounts?.[view.id] ?? 0} inline />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
