"use client";

import { GlossaryHint } from "@/components/ui/GlossaryHint";
import { formatKRW } from "@/lib/finance";
import { getGlossaryForTaskChannel } from "@/lib/marketing-glossary";
import {
  getContractDoneCount,
  getContractTargetChannels,
  getContractTargetCount,
} from "@/lib/task-channel-utils";
import type { Contract } from "@/lib/types";
import {
  CONTRACT_STATUS_LABELS,
  TERMINATION_REASON_LABELS,
} from "@/lib/types";
import { cn } from "@/lib/cn";

export function ContractKpiStrip({
  contract,
  progressChannels,
  completionRate,
  scheduledBonusPayDate,
  bonusEligible,
  expectedPct,
}: {
  contract: Contract;
  progressChannels: ReturnType<typeof getContractTargetChannels>;
  completionRate: number;
  scheduledBonusPayDate?: string;
  bonusEligible: boolean;
  expectedPct: number | null;
}) {
  const chips: Array<{
    key: string;
    label: string;
    value: string;
    accent?: string;
    channel?: (typeof progressChannels)[number];
  }> = [
    {
      key: "fee",
      label: "월 광고비",
      value: formatKRW(contract.monthlyFee),
      accent: "text-emerald-400",
    },
    {
      key: "completion",
      label: "종합 달성",
      value: `${completionRate.toFixed(0)}%`,
      accent: completionRate >= 70 ? "text-emerald-400" : "text-amber-300",
    },
    {
      key: "status",
      label: "계약",
      value: CONTRACT_STATUS_LABELS[contract.status],
    },
    ...progressChannels.map((channel) => ({
      key: channel.id,
      label: channel.label,
      channel,
      value: `${getContractDoneCount(contract, channel)}/${getContractTargetCount(contract, channel)}`,
    })),
    {
      key: "deposit",
      label: "입금일",
      value: contract.lastClientDepositDate ?? "미등록",
      accent: contract.lastClientDepositDate ? undefined : "text-amber-400",
    },
    {
      key: "bonus",
      label: expectedPct != null ? `성과급 ${expectedPct}%` : "성과급",
      value: scheduledBonusPayDate
        ? scheduledBonusPayDate
        : bonusEligible
          ? "입금일 필요"
          : "-",
    },
  ];

  if (contract.status === "terminated" && contract.terminationReason) {
    chips.push({
      key: "termination",
      label: "해지",
      value: TERMINATION_REASON_LABELS[contract.terminationReason],
      accent: "text-rose-400",
    });
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chips.map((chip) => (
        <div
          key={chip.key ?? chip.label}
          className="shrink-0 rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-3 py-2"
        >
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {chip.channel ? (
              <GlossaryHint entry={getGlossaryForTaskChannel(chip.channel)}>
                {chip.label}
              </GlossaryHint>
            ) : (
              chip.label
            )}
          </span>
          <p
            className={cn(
              "mt-0.5 text-sm font-semibold text-zinc-100",
              chip.accent,
            )}
          >
            {chip.value}
          </p>
        </div>
      ))}
    </div>
  );
}
