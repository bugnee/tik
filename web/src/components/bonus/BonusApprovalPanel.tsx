"use client";

import { Check, Coins, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import {
  enrichBonusPayment,
  filterBonusForExecutive,
  filterBonusForTeamLeader,
  getPendingBonusForRole,
} from "@/lib/bonus-utils";
import {
  ClientDepositTaskLine,
} from "@/components/finance/ClientDepositConfirmPanel";
import { formatKRW } from "@/lib/finance";
import { BONUS_STAGE_LABELS } from "@/lib/types";

type ApprovalRole = "team_leader" | "executive" | "ceo";

const ROLE_CONFIG: Record<
  ApprovalRole,
  {
    title: string;
    subtitle: string;
    nextLabel: string;
    approve: (
      ctx: ReturnType<typeof useData>,
      id: string,
      userId: string,
    ) => void;
  }
> = {
  team_leader: {
    title: "성과급 결재 (1차 · 팀장)",
    subtitle: "담당 신청 건 · 설정 % 기준 검토 후 임원 결재로 상신",
    nextLabel: "임원 결재",
    approve: (ctx, id, userId) => ctx.approveBonusTeamLeader(id, userId),
  },
  executive: {
    title: "성과급 결재 (2차 · 임원)",
    subtitle: "팀장 승인 건 · 대표 부여 한도 내 총액 검토",
    nextLabel: "대표 결재",
    approve: (ctx, id, userId) => ctx.approveBonusExecutive(id, userId),
  },
  ceo: {
    title: "성과급 결재 (3차 · 대표)",
    subtitle: "최종 승인 → 재무담당 지급 (하향 설정 · 상향 결재)",
    nextLabel: "승인 · 지급 대기",
    approve: (ctx, id, userId) => ctx.approveBonusCeo(id, userId),
  },
};

export function BonusApprovalPanel({ role }: { role: ApprovalRole }) {
  const data = useData();
  const { currentUser } = useRole();
  const { bonusPayments, rejectBonus } = data;
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
                  월 광고비 {formatKRW(item.monthlyFee)}
                </p>
                <div className="mt-1">
                  <ClientDepositTaskLine
                    contractId={item.contractId}
                    scheduledPayDate={item.scheduledPayDate}
                    paidAt={item.paidAt}
                  />
                </div>
              </div>
              <Badge variant="info">{BONUS_STAGE_LABELS[item.stage]}</Badge>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <AmountCell
                label={`담당 ${item.staffPercentApplied}%`}
                value={item.staffBonusAmount}
              />
              <AmountCell
                label={`팀장 ${item.teamLeaderPercentApplied}%`}
                value={item.teamLeaderBonusAmount}
              />
              <AmountCell
                label={`임원 ${item.executivePercentApplied}%`}
                value={item.executiveBonusAmount}
              />
              <AmountCell
                label="총 지급 성과금"
                value={item.totalAmount}
                highlight
              />
            </div>

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
                  config.approve(data, item.id, currentUser.id)
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

function AmountCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        highlight
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-0.5 font-mono text-sm font-semibold ${
          highlight ? "text-emerald-400" : "text-zinc-300"
        }`}
      >
        {formatKRW(value)}
      </p>
    </div>
  );
}

export function BonusStatusSummary() {
  const { bonusPayments } = useData();
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
      <Badge variant="info">지급 대기 {counts.confirmed}건</Badge>
      <Badge variant="success">지급 완료 {counts.paid}건</Badge>
    </div>
  );
}
