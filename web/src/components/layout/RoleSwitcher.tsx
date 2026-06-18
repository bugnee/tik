"use client";

import { ChevronDown, Crown, Handshake, Building2, Shield, UserCog, Users, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRole } from "@/context/RoleContext";
import { cn } from "@/lib/cn";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

const ROLES: {
  value: UserRole;
  icon: typeof UserCog;
  description: string;
}[] = [
  {
    value: "staff",
    icon: UserCog,
    description: "담당 업체 · 달성률 · 성과급 지급 신청",
  },
  {
    value: "team_leader",
    icon: Users,
    description: "팀원 비교 · 연장 전환율 승인",
  },
  {
    value: "executive",
    icon: Shield,
    description: "팀별 매출 · 성과급 %·결재",
  },
  {
    value: "ceo",
    icon: Crown,
    description: "전사 업체 · 조직도 드릴다운",
  },
  {
    value: "finance_manager",
    icon: Wallet,
    description: "원가·성과급(세전) 자금 운영 · 15일 마감 · 25일 급여 합산",
  },
  {
    value: "partner",
    icon: Handshake,
    description: "파트너사 수주함 · 분야별 승인·제출",
  },
  {
    value: "client",
    icon: Building2,
    description: "계약 · 진행 · 링크 통합 보고서",
  },
];

export function RoleSwitcher() {
  const { activeRole, setActiveRole } = useRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = ROLES.find((r) => r.value === activeRole)!;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-3 py-2",
          "text-sm font-medium text-zinc-200 transition-colors hover:border-emerald-500/40 hover:bg-zinc-800/80",
          open && "border-emerald-500/50 ring-1 ring-emerald-500/20",
        )}
      >
        <current.icon className="h-4 w-4 text-emerald-400" />
        <span className="hidden sm:inline">{ROLE_LABELS[activeRole]}</span>
        <span className="sm:hidden">역할</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-zinc-500 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900 shadow-2xl shadow-black/50">
          <div className="border-b border-zinc-800 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              역할 전환 (데모)
            </p>
            <p className="mt-0.5 text-xs text-zinc-600">
              권한별 대시보드 UI 미리보기
            </p>
          </div>
          <div className="p-1.5">
            {ROLES.map(({ value, icon: Icon, description }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setActiveRole(value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  activeRole === value
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "text-zinc-300 hover:bg-zinc-800/80",
                )}
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    activeRole === value ? "text-emerald-400" : "text-zinc-500",
                  )}
                />
                <div>
                  <p className="text-sm font-medium">{ROLE_LABELS[value]}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
