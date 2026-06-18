"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { NavAlertBadge } from "@/components/ui/NavAlertBadge";
import { useData } from "@/context/DataContext";
import { useClientPortalBadgeCounts } from "@/hooks/useClientPortalBadgeCounts";
import { getNavBadgeCountForHref } from "@/lib/notification-utils";
import { useRole } from "@/context/RoleContext";
import { cn } from "@/lib/cn";
import { getNavItemsForRole, isNavActive } from "@/lib/nav-config";
import {
  CLIENT_PORTAL_VIEW_ACCENTS,
  getClientPortalViewFromHref,
  parseClientPortalView,
} from "@/lib/client-portal-utils";
import { getTabButtonClass } from "@/lib/tab-ui-utils";

/** 모바일(< md) 전용 하단 탭 — 주요 5개 + 더보기 */
const PRIMARY_HREFS = [
  "/dashboard",
  "/contracts",
  "/executions",
  "/expenses",
  "/partners",
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const portalView = parseClientPortalView(searchParams.get("view"));
  const { activeRole, currentUser, canViewFinancials, canManageContractTerms } = useRole();
  const [moreOpen, setMoreOpen] = useState(false);
  const data = useData();
  const clientPortalBadges = useClientPortalBadgeCounts();

  const visibleNav = useMemo(
    () => getNavItemsForRole(activeRole, canViewFinancials, canManageContractTerms),
    [activeRole, canViewFinancials, canManageContractTerms],
  );

  const primaryItems = useMemo(() => {
    if (activeRole === "client") return visibleNav;
    return visibleNav.filter((item) => PRIMARY_HREFS.includes(item.href));
  }, [activeRole, visibleNav]);
  const moreItems =
    activeRole === "client"
      ? []
      : visibleNav.filter((item) => !PRIMARY_HREFS.includes(item.href));
  const moreActive = moreItems.some((item) =>
    isNavActive(pathname, item.href, searchParams),
  );

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          aria-label="메뉴 닫기"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {moreOpen && moreItems.length > 0 && (
        <div className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-2xl md:hidden">
          {moreItems.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href, searchParams);
            const badgeCount = getNavBadgeCountForHref(
              data,
              currentUser.id,
              activeRole,
              href,
              clientPortalBadges,
            );
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? activeRole === "client"
                      ? (() => {
                          const view = getClientPortalViewFromHref(href);
                          return view
                            ? getTabButtonClass(
                                CLIENT_PORTAL_VIEW_ACCENTS[view],
                                true,
                                "w-full",
                              )
                            : "bg-rose-500/10 text-rose-500";
                        })()
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "text-[var(--foreground-secondary)] hover:bg-[var(--card-muted)] dark:text-zinc-300 dark:hover:bg-zinc-800",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="inline-flex flex-1 items-center justify-between gap-2">
                  {label}
                  <NavAlertBadge count={badgeCount} inline />
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--nav-bg)] backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="모바일 하단 메뉴"
      >
        <div className="mx-auto flex h-[3.75rem] max-w-lg items-stretch justify-around px-1">
          {primaryItems.map(({ href, shortLabel, icon: Icon }) => {
            const clientView =
              activeRole === "client" ? getClientPortalViewFromHref(href) : null;
            const active =
              activeRole === "client" && href.includes("view=")
                ? pathname === "/dashboard" &&
                  href.endsWith(`view=${portalView}`)
                : isNavActive(pathname, href, searchParams);
            const badgeCount = getNavBadgeCountForHref(
              data,
              currentUser.id,
              activeRole,
              href,
              clientPortalBadges,
            );
            return (
              <Link
                key={href}
                href={href}
                className={
                  clientView
                    ? getTabButtonClass(
                        CLIENT_PORTAL_VIEW_ACCENTS[clientView],
                        active,
                        "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 touch-manipulation",
                      )
                    : cn(
                        "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors touch-manipulation",
                        active
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-[var(--muted)]",
                      )
                }
              >
                <span className="relative">
                  <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                  <NavAlertBadge count={badgeCount} />
                </span>
                <span className="max-w-full truncate text-[10px] font-medium">
                  {shortLabel}
                </span>
              </Link>
            );
          })}

          {moreItems.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors touch-manipulation",
                moreActive || moreOpen ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--muted)]",
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">더보기</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
