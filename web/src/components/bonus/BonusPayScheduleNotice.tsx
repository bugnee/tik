"use client";

import { CalendarClock } from "lucide-react";
import {
  BONUS_PAY_POLICY_NOTICE,
  BONUS_PAY_SCHEDULE_SUMMARY,
} from "@/lib/types";

export function BonusPayScheduleNotice({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs text-zinc-500">{BONUS_PAY_POLICY_NOTICE}</p>
    );
  }

  return (
    <div className="flex gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
      <div className="text-sm text-zinc-300">
        <p className="font-medium text-cyan-300">성과급(세전) 지급 일정</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          {BONUS_PAY_POLICY_NOTICE}
        </p>
        <p className="mt-1 text-[11px] text-zinc-500">
          {BONUS_PAY_SCHEDULE_SUMMARY}
        </p>
      </div>
    </div>
  );
}

export function BonusPayDateLine({
  clientDepositDate,
  closingDeadline,
  scheduledPayDate,
  paidAt,
}: {
  clientDepositDate?: string;
  closingDeadline?: string;
  scheduledPayDate?: string;
  paidAt?: string;
}) {
  if (paidAt) {
    return (
      <p className="text-xs text-emerald-400/90">
        급여 합산 지급 완료 {paidAt}
        {scheduledPayDate ? ` · 예정 ${scheduledPayDate}` : ""}
      </p>
    );
  }
  if (!clientDepositDate || !scheduledPayDate) {
    return (
      <p className="text-xs text-amber-400/90">업체 입금일 미등록</p>
    );
  }
  return (
    <p className="text-xs text-zinc-500">
      업체 입금 {clientDepositDate}
      {closingDeadline ? (
        <>
          {" "}
          → 마감{" "}
          <span className="font-medium text-amber-400/90">{closingDeadline}</span>
        </>
      ) : null}
      {" "}
      → 급여 합산{" "}
      <span className="font-medium text-cyan-400">{scheduledPayDate}</span>
    </p>
  );
}
