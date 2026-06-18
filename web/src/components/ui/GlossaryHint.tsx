"use client";

import type { ReactNode } from "react";
import {
  lookupMarketingGlossary,
  type MarketingGlossaryEntry,
} from "@/lib/marketing-glossary";
import { cn } from "@/lib/cn";

export function GlossaryHint({
  text,
  entry: entryProp,
  children,
  className,
  tooltipClassName,
  underline = true,
}: {
  /** 조회할 표시 텍스트 */
  text?: string;
  /** 미리 조회된 항목 (채널 ID 매핑 등) */
  entry?: MarketingGlossaryEntry | null;
  children?: ReactNode;
  className?: string;
  tooltipClassName?: string;
  underline?: boolean;
}) {
  const display = children ?? text ?? "";
  const entry =
    entryProp ?? (typeof text === "string" ? lookupMarketingGlossary(text) : null);

  if (!entry) {
    return <>{display}</>;
  }

  return (
    <span
      className={cn(
        "group/glossary relative inline align-baseline",
        underline && "cursor-help border-b border-dotted border-zinc-500/60",
        className,
      )}
      tabIndex={0}
      aria-describedby={undefined}
    >
      {display}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-[120] w-64 -translate-x-1/2 rounded-xl border border-zinc-700/90 bg-zinc-900/98 px-3 py-2.5 text-left opacity-0 shadow-2xl shadow-black/40 transition-opacity duration-150",
          "group-hover/glossary:opacity-100 group-focus-visible/glossary:opacity-100",
          tooltipClassName,
        )}
      >
        {/* span 사용: GlossaryHint가 <p> 라벨 안에 올 수 있어 툴팁에 <p> 금지 */}
        <span className="block text-xs font-semibold text-emerald-300">
          {entry.officialName}
        </span>
        <span className="mt-1 block text-[11px] leading-relaxed text-zinc-400">
          {entry.description}
        </span>
        <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-zinc-700/90 bg-zinc-900/98" />
      </span>
    </span>
  );
}

/** 필드 라벨용 — 별표·단위 등 접미사 유지 */
export function GlossaryFieldLabel({
  label,
  suffix,
}: {
  label: string;
  suffix?: string;
}) {
  const base = label.replace(/\s*\*.*$/, "").trim();
  const rest = label.slice(base.length);

  return (
    <span>
      <GlossaryHint text={base} />
      {suffix}
      {rest}
    </span>
  );
}
