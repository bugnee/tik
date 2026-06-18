"use client";

import { Check, Coins, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { useData } from "@/context/DataContext";
import { useBonus } from "@/features/bonus/useBonus";
import type { BonusStore } from "@/features/bonus/create-bonus-store";
import { useRole } from "@/context/RoleContext";
import {
  enrichBonusPayment,
  filterBonusForExecutive,
  filterBonusForTeamLeader,
  formatBonusKRW,
  getPendingBonusForRole,
} from "@/lib/bonus-utils";
import { BonusPayDateLine } from "@/components/bonus/BonusPayScheduleNotice";
import { BonusAmountBreakdownGrid } from "@/components/bonus/BonusAmountBreakdown";
import { BONUS_STAGE_LABELS } from "@/lib/types";

type ApprovalRole = "team_leader" | "executive" | "ceo";

const ROLE_CONFIG: Record<
  ApprovalRole,
  {
    title: string;
    subtitle: string;
    nextLabel: string;
    approve: (
      ctx: BonusStore,
      id: string,
      userId: string,
    ) => void;
  }
> = {
  team_leader: {
    title: "성과급 결재 (1차 · 팀장)",
    subtitle: "담당 신청 건 · 매월 15일 마감 전 임원 결재로 상신",
    nextLabel: "임원 결재",
    approve: (ctx, id, userId) => ctx.approveBonusTeamLeader(id, userId),
  },
  executive: {
    title: "성과급 결재 (2차 · 임원)",
    subtitle: "팀장 승인 건 · 15일 마감 전 대표 결재",
    nextLabel: "대표 결재",
    approve: (ctx, id, userId) => ctx.approveBonusExecutive(id, userId),
  },
  ceo: {
    title: "성과급 결재 (3차 · 대표)",
    subtitle: "최종 승인 → 매월 15일 마감 · 25일 급여 합산 지급",
    nextLabel: "승인 · 급여 반영 대기",
    approve: (ctx, id, userId) => ctx.approveBonusCeo(id, userId),
  },
};

export function BonusApprovalPanel({ role }: { role: ApprovalRole }) {
  const data = useData();
  const bonus = useBonus();
  const { currentUser } = useRole();
  const { bonusPayments, rejectBonus } = bonus;
  const config = ROLE_CONFIG[role];

  let pending = getPendingBonusForRole(bonusPayments, role);
  if (role === "team_leader") {
    pending = filterBonusForTeamLeader(data, pending, currentUser.id);
  }
  if (role === "executive") {
    pending = filterBonusForExecutive(data, pending, currentUser.id);
  }

  const enriched = pending.map((p) => enrichBonusPayment(data, p));

  return (
    <Card glow={pending.length > 0}>
      <CardHeader
        title={config.title}
        subtitle={config.subtitle}
        action={
          pending.length > 0 ? (
            <Badge variant="warning">{pending.length}건 대기</Badge>
          ) : undefined
        }
      />
      <div className="space-y-3">
        {enriched.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-zinc-200">{item.clientName}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {item.teamName} · {item.staffName} · {item.period}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  재계약 {item.renewalMonthAtRequest ?? item.renewalMonthCount}월차 ·
                  월 광고비 {formatBonusKRW(item.monthlyFee)}
                </p>
                <div className="mt-1">
                  <BonusPayDateLine
                    clientDepositDate={item.clientDepositDate}
                    closingDeadline={item.closingDeadline}
                    scheduledPayDate={item.scheduledPayDate}
                    paidAt={item.paidAt}
                  />
                </div>
              </div>
              <Badge variant="info">{BONUS_STAGE_LABELS[item.stage]}</Badge>
            </div>

            <BonusAmountBreakdownGrid amounts={item} viewerRole={role} />

            <div className="mt-4 flex justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => rejectBonus(item.id, currentUser.id)}
              >
                <X className="h-3.5 w-3.5" />
                반려
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  config.approve(bonus, item.id, currentUser.id)
                }
              >
                <Check className="h-3.5 w-3.5" />
                {config.nextLabel}
              </Button>
            </div>
          </div>
        ))}
        {enriched.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-500">
            결재 대기 중인 성과급이 없습니다
          </p>
        )}
      </div>
    </Card>
  );
}

export function BonusStatusSummary() {
  const { bonusPayments } = useBonus();
  const counts = {
    pending: bonusPayments.filter((p) =>
      [
        "pending_team_leader",
        "pending_executive",
        "pending_ceo",
      ].includes(p.stage),
    ).length,
    confirmed: bonusPayments.filter((p) => p.stage === "ceo_confirmed").length,
    paid: bonusPayments.filter((p) => p.stage === "paid").length,
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="warning">
        <Coins className="mr-1 inline h-3 w-3" />
        결재 진행 {counts.pending}건
      </Badge>
      <Badge variant="info">급여 합산 대기 {counts.confirmed}건</Badge>
      <Badge variant="success">급여 반영 완료 {counts.paid}건</Badge>
    </div>
  );
}
