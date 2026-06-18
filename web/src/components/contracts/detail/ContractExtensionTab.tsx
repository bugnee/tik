"use client";

import { Pencil, RefreshCw } from "lucide-react";
import { BonusAmountBreakdownInline } from "@/components/bonus/BonusAmountBreakdown";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { formatBonusKRW, getEligibilityMessage } from "@/lib/bonus-utils";
import type { BonusAmounts } from "@/lib/bonus-utils";
import { formatKRW } from "@/lib/finance";
import type { Contract, ExtensionApproval, UserRole } from "@/lib/types";

export function ContractExtensionTab({
  contract,
  extensionApproval,
  bonusEligible,
  expectedBonus,
  expectedPct,
  showBonusTierBreakdown,
  bonusAmounts,
  activeRole,
  scheduledBonusPayDate,
  scheduledBonusClosingDate,
  canEditTerms,
  onRequestExtension,
  onOpenTermsModal,
}: {
  contract: Contract;
  extensionApproval?: ExtensionApproval;
  bonusEligible: boolean;
  expectedBonus: number;
  expectedPct: number | null;
  showBonusTierBreakdown: boolean;
  bonusAmounts: BonusAmounts | null;
  activeRole: UserRole;
  scheduledBonusPayDate?: string;
  scheduledBonusClosingDate?: string;
  canEditTerms: boolean;
  onRequestExtension: () => void;
  onOpenTermsModal: (mode: "amend" | "renewal") => void;
}) {
  return (
    <Card>
      <CardHeader
        title="연장 전환 신청"
        subtitle="팀장 승인 후 재계약 · 3개월 이상 경과 시 4월차부터 성과급 지급 신청"
      />
      {contract.isExtension ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
            <p className="font-medium text-emerald-300">연장 계약 확정</p>
            <p className="mt-1 text-sm text-zinc-500">
              재계약 {contract.renewalMonthCount}월차
            </p>
            {bonusEligible ? (
              <>
                <Badge variant="success" className="mt-3">
                  성과금 지급 대상
                </Badge>
                <div className="mx-auto mt-4 max-w-sm rounded-lg border border-emerald-500/20 bg-zinc-950/40 px-4 py-3">
                  <p className="text-xs text-zinc-500">예상 성과금(세전)</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-300">
                    {formatBonusKRW(expectedBonus)}
                  </p>
                  {expectedPct != null ? (
                    <p className="mt-1 text-sm text-zinc-400">
                      월 {formatKRW(contract.monthlyFee)} × {expectedPct}%
                    </p>
                  ) : showBonusTierBreakdown && bonusAmounts ? (
                    <BonusAmountBreakdownInline
                      amounts={bonusAmounts}
                      viewerRole={activeRole}
                      className="mt-2 text-sm text-zinc-400"
                    />
                  ) : null}
                </div>
                {scheduledBonusPayDate ? (
                  <p className="mt-3 text-sm text-emerald-400/80">
                    마감 {scheduledBonusClosingDate} · 급여 합산{" "}
                    {scheduledBonusPayDate}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-amber-400/90">
                    업체 입금일 등록 후 지급 신청 가능
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">
                {getEligibilityMessage(contract)}
              </p>
            )}
          </div>
          {canEditTerms && (
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="secondary" onClick={() => onOpenTermsModal("amend")}>
                <Pencil className="h-4 w-4" />
                중간 조건 변경
              </Button>
              <Button onClick={() => onOpenTermsModal("renewal")}>
                <RefreshCw className="h-4 w-4" />
                재계약 · 조건 설정
              </Button>
            </div>
          )}
        </div>
      ) : extensionApproval?.status === "pending" ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
          <Badge variant="warning">승인 대기 중</Badge>
          <p className="mt-2 text-sm text-zinc-400">
            {extensionApproval.createdAt} 신청 · 팀장 검토 중
          </p>
        </div>
      ) : extensionApproval?.status === "rejected" ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-rose-400">최근 신청이 반려되었습니다.</p>
          <Button onClick={onRequestExtension}>다시 신청</Button>
        </div>
      ) : (
        <div className="space-y-4 py-6 text-center">
          <p className="text-sm text-zinc-500">
            연장 전환 후 재계약 3개월 이상 경과 시 4월차부터 성과급 지급 신청이
            가능합니다. (팀장 설정 % 적용)
          </p>
          <Button onClick={onRequestExtension}>
            <RefreshCw className="h-4 w-4" />
            연장 전환 신청
          </Button>
        </div>
      )}
    </Card>
  );
}
