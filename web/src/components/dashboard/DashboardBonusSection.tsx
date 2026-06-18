"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

type DashboardBonusSectionProps = {
  children: ReactNode;
  title?: string;
  /** 접힌 상태에서 버튼 옆에 표시 (건수 등 — 금액 노출 지양) */
  hint?: ReactNode;
  className?: string;
  /** ?section= 값과 일치하면 자동 펼침 · 해야 할 일 링크용 */
  sectionId?: string;
};

/** 대시보드 하단 · 기본 접힘 — 성과급 정보는 클릭 시에만 표시 */
export function DashboardBonusSection({
  children,
  title = "성과급(세전) · 연장 정산",
  hint,
  className,
  sectionId = "bonus-approval",
}: DashboardBonusSectionProps) {
  const searchParams = useSearchParams();
  const sectionTarget = searchParams.get("section");
  const shouldReveal = sectionTarget === sectionId;

  const [open, setOpen] = useState(shouldReveal);

  useEffect(() => {
    if (!shouldReveal) return;
    setOpen(true);
    const timer = window.setTimeout(() => {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [shouldReveal, sectionId]);

  return (
    <section
      id={sectionId}
      className={cn(
        "scroll-mt-24 border-t border-[var(--border)] pt-6",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-muted)] px-4 py-3 text-left transition-colors",
          "hover:bg-[var(--card)]",
          shouldReveal && !open && "ring-1 ring-amber-500/40",
        )}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {title}
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {open
                ? "다시 클릭하면 숨깁니다"
                : "기본 숨김 · 클릭 시에만 표시 (주변 노출 방지)"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!open && hint}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[var(--muted)] transition-transform",
              open && "rotate-180",
            )}
          />
        </div>
      </button>

      {open && <div className="mt-4 space-y-6">{children}</div>}
    </section>
  );
}
