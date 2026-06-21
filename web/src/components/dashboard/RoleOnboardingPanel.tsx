"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, X } from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { cn } from "@/lib/cn";
import {
  getRoleOnboardingSteps,
  hasRoleOnboarding,
} from "@/lib/role-onboarding-utils";
import { ROLE_LABELS } from "@/lib/types";

const DISMISS_KEY_PREFIX = "tripitkorea-role-onboarding-dismissed";

function dismissStorageKey(role: string, userId: string): string {
  return `${DISMISS_KEY_PREFIX}:${role}:${userId}`;
}

/** 역할별 시스템 실무 가이드 — 신입도 대시보드에서 바로 업무 시작 */
export function RoleOnboardingPanel({ className }: { className?: string }) {
  const { activeRole, currentUser } = useRole();
  const steps = useMemo(
    () => getRoleOnboardingSteps(activeRole),
    [activeRole],
  );
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!hasRoleOnboarding(activeRole)) return;
    try {
      const raw = localStorage.getItem(
        dismissStorageKey(activeRole, currentUser.id),
      );
      setDismissed(raw === "1");
    } catch {
      setDismissed(false);
    }
  }, [activeRole, currentUser.id]);

  if (!hasRoleOnboarding(activeRole) || dismissed) return null;

  return (
    <section
      className={cn(
        "rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-[var(--card-muted)] to-[var(--card-muted)] p-3 sm:p-4",
        className,
      )}
      aria-label="시스템 실무 가이드"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100">
            <BookOpen className="h-4 w-4 text-emerald-300" />
            {ROLE_LABELS[activeRole]} · 시스템 실무 가이드
          </span>
          <p className="mt-1 text-xs text-zinc-400">
            매뉴얼 없이도 ERP 화면만으로 실무를 시작할 수 있습니다. 아래 순서대로
            진행하세요.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800/60 hover:text-zinc-200"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "가이드 펼치기" : "가이드 접기"}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "-rotate-90",
              )}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(
                  dismissStorageKey(activeRole, currentUser.id),
                  "1",
                );
              } catch {
                /* localStorage 불가 시 패널만 숨김 */
              }
              setDismissed(true);
            }}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800/60 hover:text-zinc-200"
            aria-label="가이드 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <ol className="space-y-2">
          {steps.map((step) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className="flex items-start gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/5"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-300">
                  {step.order}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-200">
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {step.description}
                  </p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-500" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
