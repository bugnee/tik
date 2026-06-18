"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatCard } from "@/components/ui/StatCard";
import { StaffBonusRequestPanel } from "@/components/bonus/StaffBonusRequestPanel";
import { BonusPayScheduleNotice } from "@/components/bonus/BonusPayScheduleNotice";
import { ContractBriefListModal } from "@/components/contracts/ContractBriefListModal";
import { DashboardBonusSection } from "@/components/dashboard/DashboardBonusSection";
import { PlaceQaDashboardPanel } from "@/components/place-qa/PlaceQaDashboardPanel";
import { StaffWorkConfirmPanel } from "@/components/work-orders/StaffWorkConfirmPanel";
import { useData } from "@/context/DataContext";
import {
  useDashboardPeriod,
  useRolePeriodContracts,
} from "@/context/DashboardPeriodContext";
import { useRole } from "@/context/RoleContext";
import {
  calcBonusAmounts,
  calcScheduledPayDate,
  formatBonusKRW,
  isBonusEligible,
} from "@/lib/bonus-utils";
import { formatKRW } from "@/lib/finance";
import {
  filterContractsByRole,
  getCompletionRate,
  getStaffBonus,
} from "@/lib/selectors";
import {
  formatContractTargetSummary,
  getContractTargetChannels,
  getContractVisibleTargetChannels,
} from "@/lib/task-channel-utils";

export function StaffDashboard() {
  const data = useData();
  const { currentUser } = useRole();
  const { periodLabel } = useDashboardPeriod();
  const contracts = useRolePeriodContracts("staff", currentUser.id);
  const bonus = getStaffBonus(contracts, data.bonusPolicy, data);
  const staffPct = data.bonusPolicy.staffPercent[currentUser.id] ?? 0;
  const eligibleExtensions = contracts.filter((c) => isBonusEligible(c));

  const targetChannels = useMemo(
    () => getContractTargetChannels(data.taskChannels),
    [data.taskChannels],
  );

  const avgCompletion =
    contracts.length > 0
      ? contracts.reduce((s, c) => s + getCompletionRate(data, c), 0) /
        contracts.length
      : 0;

  const extensionCount = contracts.filter((c) => c.isExtension).length;
  const extensionContracts = useMemo(
    () => contracts.filter((c) => c.isExtension),
    [contracts],
  );
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="실무 담당자 대시보드"
        description={`${periodLabel} · ${currentUser.name}님이 담당하는 ${contracts.length}개 업체 현황`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="담당 업체"
          value={`${contracts.length}개`}
          subValue="본인 배정 계약만 표시"
          icon={Building2}
          accent="cyan"
        />
        <StatCard
          label="평균 달성률"
          value={`${avgCompletion.toFixed(1)}%`}
          icon={Target}
          accent="emerald"
        />
        <StatCard
          label="연장 계약"
          value={`${extensionCount}건`}
          subValue="재계약(연장) 전환 고객사"
          icon={TrendingUp}
          accent="amber"
          onValueClick={
            extensionCount > 0 ? () => setExtensionModalOpen(true) : undefined
          }
        />
      </div>

      <ContractBriefListModal
        open={extensionModalOpen}
        onClose={() => setExtensionModalOpen(false)}
        title={`연장 계약 고객사 (${extensionCount}곳)`}
        description="본인 담당 · 재계약 고객사"
        contracts={extensionContracts}
        data={data}
      />

      <StaffWorkConfirmPanel />

      <PlaceQaDashboardPanel />

      <Card glow>
        <CardHeader
          title="업무 달성률"
          subtitle="업체를 클릭하면 계약·진행·원가를 입력할 수 있습니다"
        />
        <div className="space-y-3">
          {contracts.map((c) => {
            const rate = getCompletionRate(data, c);
            const summaryChannels = getContractVisibleTargetChannels(
              c,
              data.taskChannels,
            );
            return (
              <Link
                key={c.id}
                href={`/contracts/${c.id}`}
                className="group block rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-4 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/5"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-200 group-hover:text-emerald-300">
                      {c.clientName}
                    </span>
                    {c.isExtension && (
                      <Badge variant="success">연장</Badge>
                    )}
                    {c.hasReferralPromo && (
                      <Badge variant="info">리셀러 10%</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-zinc-400">
                      {formatKRW(c.monthlyFee)}/월
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-400" />
                  </div>
                </div>
                <ProgressBar value={rate} label="종합 달성률" color="emerald" />
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-zinc-500">
                  {summaryChannels.map((channel) => (
                    <span key={channel.id}>
                      {channel.label} {formatContractTargetSummary(c, channel)}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      <DashboardBonusSection
        hint={
          eligibleExtensions.length > 0 ? (
            <span className="text-xs text-[var(--muted)]">
              지급 대상 {eligibleExtensions.length}건
            </span>
          ) : undefined
        }
      >
        <BonusPayScheduleNotice />
        <StaffBonusRequestPanel />
        <Card>
          <CardHeader
            title={`연장 성과급(세전) (${staffPct}%)`}
            subtitle="재계약 4월차+ · 지급 신청 가능"
          />
          <div className="space-y-3">
            {eligibleExtensions.map((c) => {
              const amounts = calcBonusAmounts(c, data.bonusPolicy, data);
              const scheduled = c.lastClientDepositDate
                ? calcScheduledPayDate(c.lastClientDepositDate)
                : undefined;
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {c.clientName}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatKRW(c.monthlyFee)} × {amounts.staffPercentApplied}%
                    </p>
                    {scheduled && (
                      <p className="text-xs text-cyan-400/80">
                        지급 예정 {scheduled}
                      </p>
                    )}
                  </div>
                  <p className="font-mono text-sm font-semibold text-emerald-400">
                    +{formatBonusKRW(amounts.staffBonusAmount)}
                  </p>
                </div>
              );
            })}
            {eligibleExtensions.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-500">
                연장·4월차 미달 계약은 지급 신청 불가
              </p>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
            <span className="text-sm text-zinc-400">누적 합계</span>
            <span className="text-lg font-bold text-emerald-400">
              {formatBonusKRW(bonus)}
            </span>
          </div>
        </Card>
      </DashboardBonusSection>
    </div>
  );
}

function DashboardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
          {title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>
      {action ?? (
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <Clock className="h-3.5 w-3.5" />
          실시간 데이터 · 계약/실행 수정 시 자동 반영
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        </div>
      )}
    </div>
  );
}

export { DashboardHeader };
