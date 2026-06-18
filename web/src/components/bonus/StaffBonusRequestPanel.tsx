"use client";

import { useMemo } from "react";
import { Award, Send } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import {
  StaffBonusLimitInfo,
  TeamLeaderSelfBonusLimitInfo,
} from "@/components/bonus/BonusPolicyPanel";
import { BonusPayDateLine, BonusPayScheduleNotice } from "@/components/bonus/BonusPayScheduleNotice";
import {
  calcBonusAmounts,
  calcBonusClosingDeadline,
  calcScheduledPayDate,
  canRequestBonus,
  formatBonusKRW,
  getEligibilityMessage,
} from "@/lib/bonus-utils";
import { filterLeaderWorkContracts } from "@/lib/contract-access-utils";
import { filterContractsByRole } from "@/lib/selectors";
import { BONUS_STAGE_LABELS } from "@/lib/types";

type BonusRequestMode = "staff" | "team_leader";

export function StaffBonusRequestPanel({
  mode = "staff",
}: {
  mode?: BonusRequestMode;
}) {
  const data = useData();
  const { currentUser } = useRole();
  const { bonusPayments, requestBonusPayment } = data;
  const isLeaderMode = mode === "team_leader";

  const contracts = useMemo(() => {
    const list = isLeaderMode
      ? filterLeaderWorkContracts(data, currentUser.id)
      : filterContractsByRole(data, "staff", currentUser.id);
    return list.filter((c) => c.isExtension);
  }, [data, currentUser.id, isLeaderMode]);

  const myPayments = bonusPayments.filter((p) => p.requestedBy === currentUser.id);

  return (
    <Card>
      <CardHeader
        title={isLeaderMode ? "내 담당 성과급 신청" : "성과급 지급 신청"}
        subtitle={
          isLeaderMode
            ? "팀장 직접 담당 · 한도 전액 · 재계약 4월차+"
            : "재계약 4월차+ · 업체 입금 확인 후 익월 정산 · 15일 마감 · 25일 급여 합산"
        }
        action={
          isLeaderMode ? <TeamLeaderSelfBonusLimitInfo /> : <StaffBonusLimitInfo />
        }
      />
      <div className="mb-3 px-1">
        <BonusPayScheduleNotice compact />
      </div>
      <div className="space-y-3">
        {contracts.map((c) => {
          const eligible = canRequestBonus(c);
          const existing = myPayments.find(
            (p) =>
              p.contractId === c.id &&
              !["paid", "rejected"].includes(p.stage),
          );
          const amounts = calcBonusAmounts(c, data.bonusPolicy, data);
          const scheduledPayDate = c.lastClientDepositDate
            ? calcScheduledPayDate(c.lastClientDepositDate)
            : undefined;
          const closingDeadline = c.lastClientDepositDate
            ? calcBonusClosingDeadline(c.lastClientDepositDate)
            : undefined;
          const bonusAmount = isLeaderMode
            ? amounts.teamLeaderBonusAmount
            : amounts.staffBonusAmount;
          const bonusPct = isLeaderMode
            ? amounts.teamLeaderPercentApplied
            : amounts.staffPercentApplied;
          const bonusRoleLabel = isLeaderMode ? "팀장" : "담당";

          return (
            <div
              key={c.id}
              className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-200">{c.clientName}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {getEligibilityMessage(c)}
                  </p>
                  <BonusPayDateLine
                    clientDepositDate={c.lastClientDepositDate}
                    closingDeadline={closingDeadline}
                    scheduledPayDate={scheduledPayDate}
                    paidAt={existing?.paidAt}
                  />
                  <p className="mt-1 text-xs text-zinc-600">
                    재계약 {c.renewalMonthCount}월차 · 예상{" "}
                    {formatBonusKRW(bonusAmount)} ({bonusRoleLabel}{" "}
                    {bonusPct}%)
                  </p>
                </div>
                {existing ? (
                  <Badge variant="warning">
                    {BONUS_STAGE_LABELS[existing.stage]}
                  </Badge>
                ) : eligible ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      const ok = requestBonusPayment(c.id, currentUser.id);
                      if (!ok) alert("신청할 수 없습니다.");
                    }}
                  >
                    <Send className="h-3.5 w-3.5" />
                    지급 신청
                  </Button>
                ) : (
                  <Badge variant="default">
                    <Award className="mr-1 inline h-3 w-3" />
                    {c.renewalMonthCount}월차
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
        {contracts.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">
            {isLeaderMode
              ? "팀장 직접 담당 연장 계약이 없습니다"
              : "연장 계약이 없습니다"}
          </p>
        )}
      </div>
    </Card>
  );
}
