"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LogOut, Plane } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/context/RoleContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { NavAlertBadge } from "@/components/ui/NavAlertBadge";
import { useData } from "@/context/DataContext";
import { useClientPortalBadgeCounts } from "@/hooks/useClientPortalBadgeCounts";
import { getNavItemsForRole, isNavActive } from "@/lib/nav-config";
import { getNavBadgeCountForHref } from "@/lib/notification-utils";
import {
  CLIENT_PORTAL_VIEW_ACCENTS,
  getClientPortalViewFromHref,
  parseClientPortalView,
} from "@/lib/client-portal-utils";
import { getTabButtonClass } from "@/lib/tab-ui-utils";
import { ROLE_SURFACE_CLASSES } from "@/lib/role-utils";
import { ROLE_LABELS } from "@/lib/types";
import { RoleSwitcher } from "./RoleSwitcher";
import { ThemeToggle } from "./ThemeToggle";

/** 상단 Navbar — 업무 큐 알림 뱃지 포함 */
export function AppNavbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const portalView = parseClientPortalView(searchParams.get("view"));
  const { activeRole, currentUser, canViewFinancials, canManageContractTerms, isAuthenticated } =
    useRole();
  const { sessionUser, logout } = useAuth();
  const data = useData();
  const clientPortalBadges = useClientPortalBadgeCounts();

  const visibleNav = getNavItemsForRole(
    activeRole,
    canViewFinancials,
    canManageContractTerms,
  );

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--nav-bg)] backdrop-blur-xl safe-top">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 md:h-16 md:gap-4 lg:gap-6 lg:px-8">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl shadow-lg",
              "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-900/40",
            )}
          >
            <Plane className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold tracking-tight text-[var(--foreground)]">
              TripItKorea
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
              {activeRole === "client" ? "Client Portal" : "ERP · Settlement"}
            </p>
          </div>
        </Link>

        <nav
          className="hidden flex-1 items-center gap-0.5 overflow-x-auto md:flex lg:gap-1"
          aria-label="주요 메뉴"
        >
          {visibleNav.map(({ href, label, shortLabel, icon: Icon }) => {
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
                        "relative flex shrink-0 items-center gap-1.5 px-2 py-2 text-sm font-medium lg:gap-2 lg:px-3",
                      )
                    : cn(
                        "relative flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors lg:gap-2 lg:px-3",
                        active
                          ? "bg-[var(--card-muted)] text-emerald-600 ring-1 ring-emerald-500/25 dark:bg-zinc-800/80 dark:text-emerald-400 dark:ring-0"
                          : "text-[var(--muted)] hover:bg-[var(--card-muted)] hover:text-[var(--foreground)] dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200",
                      )
                }
              >
                <span className="relative shrink-0">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="lg:hidden">{shortLabel}</span>
                  <span className="hidden lg:inline">{label}</span>
                  <NavAlertBadge count={badgeCount} inline />
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <ThemeToggle />

          {!isAuthenticated && <RoleSwitcher />}

          <div
            className={cn(
              "hidden items-center gap-2 rounded-xl border bg-gradient-to-r px-2 py-1.5 md:flex lg:px-3",
              ROLE_SURFACE_CLASSES[activeRole],
            )}
          >
            {sessionUser?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sessionUser.avatarUrl}
                alt=""
                className="h-6 w-6 rounded-full ring-1 ring-zinc-700"
              />
            ) : null}
            <span className="max-w-[4rem] truncate text-xs font-medium lg:max-w-none">
              {currentUser.name}
            </span>
            <span className="hidden text-[10px] opacity-70 lg:inline">·</span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-wide lg:inline">
              {ROLE_LABELS[activeRole]}
            </span>
          </div>

          {isAuthenticated && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void logout()}
              title="로그아웃"
              className="touch-manipulation"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
