"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useRole } from "@/context/RoleContext";
import { cn } from "@/lib/cn";
import { getNavItemsForRole, isNavActive } from "@/lib/nav-config";

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
  const { activeRole, canViewFinancials, canManageContractTerms } = useRole();
  const [moreOpen, setMoreOpen] = useState(false);

  const visibleNav = useMemo(
    () => getNavItemsForRole(activeRole, canViewFinancials, canManageContractTerms),
    [activeRole, canViewFinancials, canManageContractTerms],
  );

  const primaryItems = visibleNav.filter((item) =>
    PRIMARY_HREFS.includes(item.href),
  );
  const moreItems = visibleNav.filter(
    (item) => !PRIMARY_HREFS.includes(item.href),
  );
  const moreActive = moreItems.some((item) => isNavActive(pathname, item.href));

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
        <div className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 rounded-2xl border border-zinc-700/80 bg-zinc-900 p-2 shadow-2xl md:hidden">
          {moreItems.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-zinc-300 hover:bg-zinc-800",
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="모바일 하단 메뉴"
      >
        <div className="mx-auto flex h-[3.75rem] max-w-lg items-stretch justify-around px-1">
          {primaryItems.map(({ href, shortLabel, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors touch-manipulation",
                  active ? "text-emerald-400" : "text-zinc-500",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
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
                moreActive || moreOpen ? "text-emerald-400" : "text-zinc-500",
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
