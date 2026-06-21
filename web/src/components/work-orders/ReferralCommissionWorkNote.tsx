"use client";

import Link from "next/link";
import { CalendarClock, Handshake } from "lucide-react";
import { useData } from "@/context/DataContext";
import {
  REFERRAL_NOTE_BODY,
  REFERRAL_NOTE_ICON,
  REFERRAL_NOTE_LINK,
  REFERRAL_NOTE_SCHEDULE_BOX,
  REFERRAL_NOTE_SCHEDULE_ICON,
  REFERRAL_NOTE_SURFACE,
  REFERRAL_NOTE_TITLE,
} from "@/components/work-orders/referral-commission-styles";
import { formatKRW } from "@/lib/finance";
import {
  getReferralPayoutContext,
  REFERRAL_PAYOUT_POLICY_LABEL,
} from "@/lib/referral-commission-utils";
import { isReferralCommissionWorkOrder } from "@/lib/work-order-utils";
import type { WorkOrder } from "@/lib/types";

/** 리셀러 수수료 — 계약·입금+10일 지급 안내 */
export function ReferralCommissionWorkNote({
  order,
  className,
}: {
  order: WorkOrder;
  className?: string;
}) {
  const data = useData();
  if (!isReferralCommissionWorkOrder(order)) return null;

  const contract = data.contracts.find((c) => c.id === order.contractId);
  const ctx = getReferralPayoutContext(contract, order);

  return (
    <div className={className ?? REFERRAL_NOTE_SURFACE}>
      <div className="flex items-start gap-2">
        <Handshake className={REFERRAL_NOTE_ICON} />
        <div className="min-w-0 flex-1 space-y-2">
          <p className={REFERRAL_NOTE_TITLE}>
            리셀러 수수료 · {REFERRAL_PAYOUT_POLICY_LABEL}
          </p>
          <p className={REFERRAL_NOTE_BODY}>
            영업 후 계약 체결 수수료 · 집행·키워드·링크 없음 · 월 광고비 10% (
            {formatKRW(ctx.commissionAmount)})
          </p>

          <div className={REFERRAL_NOTE_SCHEDULE_BOX}>
            <div className="flex items-center gap-1.5">
              <CalendarClock className={REFERRAL_NOTE_SCHEDULE_ICON} />
              <span>
                고객사 입금{" "}
                {ctx.clientDepositDate ? (
                  <strong className="text-emerald-50">
                    {ctx.clientDepositDate}
                  </strong>
                ) : (
                  <span className="text-sky-200/80">
                    미확인 · 재무 입금 확인 필요
                  </span>
                )}
              </span>
            </div>
            {ctx.payoutDueDate && (
              <p className="pl-5">
                리셀러 지급 예정{" "}
                <strong className="text-emerald-50">{ctx.payoutDueDate}</strong>
                {!ctx.isPayoutDue &&
                  ctx.daysUntilPayout != null &&
                  ctx.daysUntilPayout > 0 && (
                    <span className="text-sky-200/85">
                      {" "}
                      · D-{ctx.daysUntilPayout}
                    </span>
                  )}
                {ctx.isPayoutDue && (
                  <span className="font-medium text-emerald-300">
                    {" "}
                    · 지급 가능
                  </span>
                )}
              </p>
            )}
          </div>

          {contract && (
            <Link href={`/contracts/${contract.id}`} className={REFERRAL_NOTE_LINK}>
              계약 상세 · 리셀러·월 광고비 확인 →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
