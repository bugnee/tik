"use client";

import { Building2 } from "lucide-react";
import { GlossaryHint } from "@/components/ui/GlossaryHint";
import { cn } from "@/lib/cn";

export type ContractDetailRowTone =
  | "default"
  | "muted"
  | "success"
  | "warning"
  | "info"
  | "fee"
  | "leader"
  | "referral";

const ROW_VALUE_TONE_CLASSES: Record<ContractDetailRowTone, string> = {
  default: "text-zinc-100",
  muted: "text-zinc-500",
  success: "text-emerald-400",
  warning: "text-amber-400",
  info: "text-cyan-400",
  fee: "font-mono text-emerald-400",
  leader: "text-cyan-400",
  referral: "text-sky-400",
};

/** 계약 정보 dl 행 — overview·history 등에서 공통 사용 */
export function ContractDetailRow({
  icon: Icon,
  label,
  value,
  tone = "default",
  pillClassName,
  labelGlossary,
}: {
  icon?: typeof Building2;
  label: string;
  value: string;
  tone?: ContractDetailRowTone;
  pillClassName?: string;
  labelGlossary?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800/40 py-2 last:border-0">
      <dt className="flex items-center gap-2 text-zinc-500">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />}
        {labelGlossary ? (
          <GlossaryHint text={labelGlossary}>{label}</GlossaryHint>
        ) : (
          label
        )}
      </dt>
      <dd
        className={cn(
          "text-right font-medium",
          pillClassName
            ? cn(
                "rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                pillClassName,
              )
            : ROW_VALUE_TONE_CLASSES[tone],
        )}
      >
        {value}
      </dd>
    </div>
  );
}
