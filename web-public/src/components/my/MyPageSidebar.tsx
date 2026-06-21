"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CircleHelp,
  Heart,
  LayoutGrid,
  LogOut,
  MessageCircle,
  User,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/cn";

const SECTIONS = [
  {
    title: "마이페이지",
    items: [
      { href: "/my", label: "내 체험단", icon: LayoutGrid },
      { href: "/my?tab=cancelled", label: "체험단 취소", icon: MessageCircle },
    ],
  },
  {
    title: "내 정보 관리",
    items: [
      { href: "/my", label: "프로필", icon: User, match: "/my" },
      { href: "/my?tab=edit", label: "프로필 관리", icon: User },
      { href: "/my?tab=wishlist", label: "찜목록", icon: Heart },
      { href: "/my?tab=points", label: "포인트", icon: Wallet },
    ],
  },
  {
    title: "고객센터",
    items: [
      { href: "/guide", label: "이용가이드", icon: CircleHelp },
    ],
  },
] as const;

export function MyPageSidebar({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  function isActive(href: string) {
    if (href === "/my" && !href.includes("tab=")) {
      return pathname === "/my" && !tab;
    }
    if (href.includes("tab=cancelled")) return tab === "cancelled";
    if (href.includes("tab=edit")) return tab === "edit";
    if (href.includes("tab=wishlist")) return tab === "wishlist";
    if (href.includes("tab=points")) return tab === "points";
    return pathname === href;
  }

  return (
    <aside className="w-full shrink-0 lg:w-56">
      <nav className="space-y-6 rounded-2xl border border-[var(--border)] bg-white p-4">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-2 text-xs font-bold text-[var(--muted)]">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition",
                        active
                          ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                          : "text-[var(--foreground-secondary)] hover:bg-slate-50",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--muted)] transition hover:bg-slate-50 hover:text-[var(--danger)]"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </nav>
    </aside>
  );
}
