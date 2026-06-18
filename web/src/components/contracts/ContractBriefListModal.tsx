"use client";

import { ChevronRight, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import type { AppData } from "@/lib/types";
import type { Contract } from "@/lib/types";
import { daysUntil } from "@/lib/contract-lifecycle";
import { formatKRW } from "@/lib/finance";
import {
  getCompletionRate,
  getMonthlyProgressRate,
  getTeamName,
  getUserName,
} from "@/lib/selectors";

type ContractBriefListModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  contracts: Contract[];
  data: AppData;
  /** 리셀러 프로모션 목록 등 — 월 리셀러 수수료(10%) 표시 */
  showReferralFee?: boolean;
};

export function ContractBriefListModal({
  open,
  onClose,
  title,
  description,
  contracts,
  data,
  showReferralFee = false,
}: ContractBriefListModalProps) {
  const router = useRouter();

  function goToContract(contract: Contract) {
    onClose();
    router.push(`/contracts/${contract.id}`);
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {description && (
        <p className="mb-4 text-sm text-zinc-500">{description}</p>
      )}
      <div className="space-y-2">
        {contracts.map((c) => {
          const remaining = daysUntil(c.contractEndDate);
          const monthlyProgress = getMonthlyProgressRate(data, c);
          const referralFee = showReferralFee
            ? Math.round(c.monthlyFee * 0.1)
            : null;

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => goToContract(c)}
              className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-left transition-colors hover:border-emerald-500/30 hover:bg-zinc-900 sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-100">{c.clientName}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {getTeamName(data, c.teamId)} · 담당{" "}
                  {getUserName(data, c.assignedStaffId)} ·{" "}
                  {formatKRW(c.monthlyFee)}
                  {referralFee != null && (
                    <span className="text-rose-400/90">
                      {" "}
                      · 리셀러 수수료 {formatKRW(referralFee)}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  달성률 {getCompletionRate(data, c).toFixed(0)}%
                  {c.status === "terminated"
                    ? " · 해지됨"
                    : remaining >= 0
                      ? ` · D-${remaining}`
                      : ` · 만료 ${Math.abs(remaining)}일 경과`}
                </p>
              </div>

              <div className="hidden shrink-0 border-l border-zinc-800/80 pl-4 text-right sm:block">
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                  계약 시작
                </p>
                <p className="mt-0.5 text-xs font-medium text-zinc-300">
                  {c.contractStartDate}
                </p>
                <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                  해당월 진행율
                </p>
                <p className="mt-0.5 text-sm font-bold text-emerald-400">
                  {monthlyProgress}%
                </p>
              </div>

              <div className="shrink-0 text-right sm:hidden">
                <p className="text-[10px] text-zinc-600">
                  시작 {c.contractStartDate}
                </p>
                <p className="text-xs font-semibold text-emerald-400">
                  해당월 {monthlyProgress}%
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {c.isExtension && <Badge variant="success">연장</Badge>}
                {c.hasReferralPromo && <Badge variant="info">리셀러</Badge>}
                {c.status === "terminated" && (
                  <Badge variant="danger">해지</Badge>
                )}
                <ChevronRight className="h-4 w-4 text-zinc-600" />
              </div>
            </button>
          );
        })}
        {contracts.length === 0 && (
          <p className="py-12 text-center text-sm text-zinc-500">
            해당 고객사가 없습니다
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
