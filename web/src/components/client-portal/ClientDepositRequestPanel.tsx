"use client";

import { AlertCircle, Building2, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  CLIENT_DEPOSIT_STATUS_VARIANT,
  type Contract,
  type FundBudget,
} from "@/lib/types";
import {
  getClientDepositRequestInfo,
  isClientDepositBlockingWork,
} from "@/lib/client-deposit-utils";
import { formatKRW } from "@/lib/finance";
import { cn } from "@/lib/cn";

type PanelVariant = "client" | "staff";

export function ClientDepositRequestPanel({
  contract,
  fundBudget,
  variant = "client",
  className,
}: {
  contract: Contract;
  fundBudget?: FundBudget;
  variant?: PanelVariant;
  className?: string;
}) {
  if (!isClientDepositBlockingWork(contract)) return null;

  const info = getClientDepositRequestInfo(contract, fundBudget);
  const isClient = variant === "client";

  return (
    <Card
      id="client-action-deposit"
      className={cn(
        "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-zinc-950/60 to-zinc-950",
        className,
      )}
      glow={isClient}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
              {isClient ? (
                <Wallet className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-100">
                {isClient
                  ? "광고비 입금이 필요합니다"
                  : "입금 확인 전 — 업무 진행 중지"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                {isClient
                  ? "입금 확인 후 집행·체험단 등 모든 업무가 시작됩니다."
                  : `${contract.clientName} · 재무 입금 확인 후 파트너 배정·승인 요청이 가능합니다.`}
              </p>
            </div>
          </div>
          <Badge variant={CLIENT_DEPOSIT_STATUS_VARIANT[info.status]}>
            {info.statusLabel}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-amber-500/20 bg-zinc-950/50 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              입금 요청 금액
            </p>
            <p className="mt-1 text-xl font-bold text-amber-200">
              {formatKRW(info.amount)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">월 광고비 · VAT 별도</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              <Building2 className="h-3.5 w-3.5" />
              입금 계좌
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-100">
              {info.bankName} {info.accountNumber}
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">예금주 {info.accountHolder}</p>
          </div>
        </div>

        {isClient && (
          <p className="text-[11px] text-zinc-600">
            입금 후 담당 매니저에게 연락 주시거나 소통 탭으로 입금 확인을 요청해
            주세요.
          </p>
        )}
      </div>
    </Card>
  );
}
