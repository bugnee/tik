"use client";

import { ChevronRight, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  calcBonusAmounts,
  calcBonusClosingDeadline,
  calcScheduledPayDate,
  formatBonusKRW,
} from "@/lib/bonus-utils";
import { formatKRW } from "@/lib/finance";
import type { AppData, Contract } from "@/lib/types";
import { getUserName } from "@/lib/selectors";

type BonusView = "executive" | "team_leader" | "staff";

const VIEW_LABELS: Record<
  BonusView,
  { amountKey: keyof ReturnType<typeof calcBonusAmounts>; pctKey: keyof ReturnType<typeof calcBonusAmounts>; label: string }
> = {
  executive: {
    amountKey: "executiveBonusAmount",
    pctKey: "executivePercentApplied",
    label: "임원",
  },
  team_leader: {
    amountKey: "teamLeaderBonusAmount",
    pctKey: "teamLeaderPercentApplied",
    label: "팀장",
  },
  staff: {
    amountKey: "staffBonusAmount",
    pctKey: "staffPercentApplied",
    label: "실무",
  },
};

type ExtensionBonusDetailModalProps = {
  open: boolean;
  onClose: () => void;
  teamName: string;
  limitPercent: number;
  contracts: Contract[];
  data: AppData;
  view?: BonusView;
};

export function ExtensionBonusDetailModal({
  open,
  onClose,
  teamName,
  limitPercent,
  contracts,
  data,
  view = "executive",
}: ExtensionBonusDetailModalProps) {
  const router = useRouter();
  const { amountKey, pctKey, label } = VIEW_LABELS[view];

  const sorted = [...contracts].sort((a, b) => {
    const aa = calcBonusAmounts(a, data.bonusPolicy, data)[amountKey] as number;
    const bb = calcBonusAmounts(b, data.bonusPolicy, data)[amountKey] as number;
    return bb - aa;
  });

  const total = sorted.reduce((sum, c) => {
    const amounts = calcBonusAmounts(c, data.bonusPolicy, data);
    return sum + (amounts[amountKey] as number);
  }, 0);

  function goToContract(contract: Contract) {
    onClose();
    router.push(`/contracts/${contract.id}`);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${teamName} · 연장 성과급(세전) 세부`}
      size="lg"
    >
      <p className="mb-4 text-sm text-zinc-500">
        {label} 한도 {limitPercent}% · 4월차+ {sorted.length}건 · 합계{" "}
        <span className="font-semibold text-emerald-400">{formatBonusKRW(total)}</span>
      </p>

      <div className="space-y-2">
        {sorted.map((c) => {
          const amounts = calcBonusAmounts(c, data.bonusPolicy, data);
          const primaryAmount = amounts[amountKey] as number;
          const primaryPct = amounts[pctKey] as number;
          const scheduled = c.lastClientDepositDate
            ? calcScheduledPayDate(c.lastClientDepositDate)
            : undefined;
          const closing = c.lastClientDepositDate
            ? calcBonusClosingDeadline(c.lastClientDepositDate)
            : undefined;

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => goToContract(c)}
              className="flex w-full items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-left transition-colors hover:border-cyan-500/30 hover:bg-zinc-900 sm:items-center sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-100">{c.clientName}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  담당 {getUserName(data, c.assignedStaffId)} · 재계약{" "}
                  {c.renewalMonthCount}월차 · {formatKRW(c.monthlyFee)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatKRW(c.monthlyFee)} × {primaryPct}% ={" "}
                  <span className="font-medium text-cyan-400">
                    {formatBonusKRW(primaryAmount)}
                  </span>
                </p>
                {view === "executive" && (
                  <p className="mt-1 text-[11px] text-zinc-600">
                    실무 {amounts.staffPercentApplied}%{" "}
                    {formatBonusKRW(amounts.staffBonusAmount)} · 팀장{" "}
                    {amounts.teamLeaderPercentApplied}%{" "}
                    {formatBonusKRW(amounts.teamLeaderBonusAmount)}
                  </p>
                )}
                {c.lastClientDepositDate && scheduled && (
                  <p className="mt-1 text-xs text-cyan-400/80">
                    입금 {c.lastClientDepositDate} → 마감 {closing} → 급여
                    합산 {scheduled}
                  </p>
                )}
                {!c.lastClientDepositDate && (
                  <p className="mt-1 text-xs text-amber-400/80">
                    업체 입금일 미등록
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="success">연장</Badge>
                <p className="hidden font-mono text-sm font-semibold text-cyan-400 sm:block">
                  {formatBonusKRW(primaryAmount)}
                </p>
                <ChevronRight className="h-4 w-4 text-zinc-600" />
              </div>
            </button>
          );
        })}

        {sorted.length === 0 && (
          <p className="py-12 text-center text-sm text-zinc-500">
            연장 성과급 대상 계약이 없습니다
          </p>
        )}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-600">
        <Clock className="h-3.5 w-3.5" />
        고객사를 클릭하면 계약 상세 화면으로 이동합니다
      </p>
    </Modal>
  );
}
