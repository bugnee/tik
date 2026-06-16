"use client";

import { CalendarClock } from "lucide-react";
import { BONUS_PAYMENT_DELAY_DAYS, BONUS_PAY_POLICY_NOTICE } from "@/lib/types";

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
        <p className="font-medium text-cyan-300">성과급 지급 일정</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          {BONUS_PAY_POLICY_NOTICE}
        </p>
        <p className="mt-1 text-[11px] text-zinc-500">
          지급 예정일 = 업체 입금일 + {BONUS_PAYMENT_DELAY_DAYS}일
        </p>
      </div>
    </div>
  );
}

export function BonusPayDateLine({
  clientDepositDate,
  scheduledPayDate,
  paidAt,
}: {
  clientDepositDate?: string;
  scheduledPayDate?: string;
  paidAt?: string;
}) {
  if (paidAt) {
    return (
      <p className="text-xs text-emerald-400/90">
        실제 지급일 {paidAt}
        {scheduledPayDate ? ` · 예정일 ${scheduledPayDate}` : ""}
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
      업체 입금 {clientDepositDate} → 지급 예정{" "}
      <span className="font-medium text-cyan-400">{scheduledPayDate}</span>
    </p>
  );
}
