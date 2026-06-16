import type { UserRole } from "@/lib/types";

/** 역할 배지 · 네비/대시보드와 동일 색상 체계 */
export const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  staff: "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30",
  team_leader: "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30",
  executive: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
  ceo: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
  finance_manager: "bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30",
  partner: "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30",
  client: "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30",
};

/** Navbar 등 그라데이션 배경용 */
export const ROLE_SURFACE_CLASSES: Record<UserRole, string> = {
  staff: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/30 text-cyan-300",
  team_leader:
    "from-violet-500/20 to-violet-600/5 border-violet-500/30 text-violet-300",
  executive:
    "from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-300",
  ceo: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-300",
  finance_manager:
    "from-sky-500/20 to-sky-600/5 border-sky-500/30 text-sky-300",
  partner:
    "from-orange-500/20 to-orange-600/5 border-orange-500/30 text-orange-300",
  client: "from-rose-500/20 to-rose-600/5 border-rose-500/30 text-rose-300",
};

export const ROLE_BANNER_CLASSES: Record<UserRole, string> = {
  staff: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
  team_leader: "border-violet-500/30 bg-violet-500/5 text-violet-300",
  executive: "border-amber-500/30 bg-amber-500/5 text-amber-300",
  ceo: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
  finance_manager: "border-sky-500/30 bg-sky-500/5 text-sky-300",
  partner: "border-orange-500/30 bg-orange-500/5 text-orange-300",
  client: "border-rose-500/30 bg-rose-500/5 text-rose-300",
};
