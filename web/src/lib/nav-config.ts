import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  Handshake,
  LayoutDashboard,
  MapPin,
  Receipt,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

import type { UserRole } from "@/lib/types";
import { canViewWorkEvaluations } from "@/lib/work-evaluation-utils";

  /** ERP 주요 메뉴 — Navbar·MobileBottomNav 공통 사용 */
export interface NavItem {
  href: string;
  label: string;
  /** 태블릿 등 좁은 화면용 짧은 라벨 */
  shortLabel: string;
  icon: LucideIcon;
  financialOnly?: boolean;
  settingsOnly?: boolean;
  placeQaOnly?: boolean;
  /** 파트너(리셀러·집행) 화면에서 숨김 */
  hideForPartnerRole?: boolean;
  /** 고객사·파트너·대표 화면에서 숨김 */
  internalEvaluationOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "대시보드",
    shortLabel: "홈",
    icon: LayoutDashboard,
  },
  {
    href: "/contracts",
    label: "계약",
    shortLabel: "계약",
    icon: Building2,
  },
  {
    href: "/executions",
    label: "실행 진행",
    shortLabel: "실행",
    icon: BarChart3,
    hideForPartnerRole: true,
  },
  {
    href: "/evaluations",
    label: "업무평가",
    shortLabel: "평가",
    icon: ClipboardCheck,
    internalEvaluationOnly: true,
  },
  {
    href: "/place-qa",
    label: "고객사 Q&A",
    shortLabel: "Q&A",
    icon: MapPin,
    placeQaOnly: true,
  },
  {
    href: "/expenses",
    label: "원가",
    shortLabel: "원가",
    icon: Receipt,
    hideForPartnerRole: true,
  },
  {
    href: "/partners",
    label: "파트너",
    shortLabel: "파트너",
    icon: Handshake,
    hideForPartnerRole: true,
  },
  {
    href: "/users",
    label: "조직",
    shortLabel: "조직",
    icon: Users,
    hideForPartnerRole: true,
  },
  {
    href: "/settings",
    label: "설정",
    shortLabel: "설정",
    icon: Settings,
    settingsOnly: true,
  },
  {
    href: "/finance",
    label: "재무",
    shortLabel: "재무",
    icon: Wallet,
    financialOnly: true,
  },
];

/** 현재 경로가 메뉴와 일치하는지 확인 */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** 역할별 표시 메뉴 — 고객사는 보고서 대시보드만 */
export function getNavItemsForRole(
  role: UserRole,
  canViewFinancials: boolean,
  canManageSettings?: boolean,
): NavItem[] {
  if (role === "client") {
    return NAV_ITEMS.filter((item) => item.href === "/dashboard");
  }
  const canPlaceQa =
    role === "staff" ||
    role === "team_leader" ||
    role === "executive" ||
    role === "ceo" ||
    role === "finance_manager";
  return NAV_ITEMS.filter((item) => {
    if (item.financialOnly && !canViewFinancials) return false;
    if (item.settingsOnly && !canManageSettings) return false;
    if (item.placeQaOnly && !canPlaceQa) return false;
    if (role === "partner" && item.hideForPartnerRole) return false;
    if (item.internalEvaluationOnly && !canViewWorkEvaluations(role)) return false;
    return true;
  });
}
