"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronRight, Coins, Medal, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardHeader } from "@/components/dashboard/StaffDashboard";
import { DashboardBonusSection } from "@/components/dashboard/DashboardBonusSection";
import { ExtensionBonusDetailModal } from "@/components/dashboard/ExtensionBonusDetailModal";
import { BonusApprovalPanel } from "@/components/bonus/BonusApprovalPanel";
import { ExpensePayoutApprovalPanel } from "@/components/finance/ExpensePayoutApprovalPanel";
import { BonusPolicyPanel } from "@/components/bonus/BonusPolicyPanel";
import { BonusPayrollSummaryPanel } from "@/components/bonus/BonusPayrollSummaryPanel";
import { PlaceQaDashboardPanel } from "@/components/place-qa/PlaceQaDashboardPanel";
import { StaffWorkConfirmPanel } from "@/components/work-orders/StaffWorkConfirmPanel";
import { useData } from "@/context/DataContext";
import {
  useDashboardPeriod,
  useDashboardPeriodScope,
  useRolePeriodContracts,
} from "@/context/DashboardPeriodContext";
import { useRole } from "@/context/RoleContext";
import {
  calcBonusAmounts,
  getExecutiveLimit,
  isBonusEligible,
} from "@/lib/bonus-utils";
import { getTeamRankingsForContracts } from "@/lib/dashboard-period-utils";
import { formatBonusKRW } from "@/lib/bonus-utils";
import { formatKRW } from "@/lib/finance";
import type { Contract, TeamRanking } from "@/lib/types";

const RANK_COLORS = ["#10b981", "#06b6d4", "#f59e0b"];

type SelectedTeamBonus = {
  team: TeamRanking;
  contracts: Contract[];
};

function getTeamBonusContracts(contracts: Contract[], teamId: string) {
  return contracts.filter((c) => c.teamId === teamId && isBonusEligible(c));
}

export function ExecutiveDashboard() {
  const data = useData();
  const { currentUser } = useRole();
  const { periodLabel } = useDashboardPeriod();
  const contracts = useRolePeriodContracts("executive", currentUser.id);
  const periodScope = useDashboardPeriodScope();
  const [selectedTeam, setSelectedTeam] = useState<SelectedTeamBonus | null>(
    null,
  );

  const execLimit = getExecutiveLimit(data.bonusPolicy, currentUser.id);
  const teamIds = data.teams
    .filter((t) => t.executiveId === currentUser.id)
    .map((t) => t.id);

  const extensionContracts = contracts.filter(
    (c) => c.isExtension && teamIds.includes(c.teamId),
  );
  const extensionRevenue = extensionContracts.reduce(
    (s, c) => s + periodScope.getContractFee(c),
    0,
  );
  const executiveBonus = contracts
    .filter((c) => isBonusEligible(c) && teamIds.includes(c.teamId))
    .reduce(
      (s, c) =>
        s + calcBonusAmounts(c, data.bonusPolicy, data).executiveBonusAmount,
      0,
    );
  const allRankings = getTeamRankingsForContracts(
    data,
    contracts,
    periodScope.getContractFee,
  );
  const rankings = allRankings.filter((t) => teamIds.includes(t.teamId));
  const totalRevenue = rankings.reduce((s, t) => s + t.revenue, 0);

  const chartData = rankings.map((t, i) => ({
    name: t.teamName.replace("마케팅 ", ""),
    매출: Math.round(t.revenue / 100_000) / 10,
    rank: i + 1,
  }));

  const topShare =
    rankings.length > 0
      ? ((rankings[0].revenue / totalRevenue) * 100).toFixed(1)
      : "0";

  const bonusEligibleCount = contracts.filter(
    (c) => isBonusEligible(c) && teamIds.includes(c.teamId),
  ).length;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="임원 대시보드"
        description={`${periodLabel} · 산하 팀 매출 기여도 · 연장 계약 현황`}
      />

      <StaffWorkConfirmPanel />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="산하 팀 매출"
          value={formatKRW(totalRevenue)}
          subValue={`${rankings.length}개 팀 합산`}
          icon={TrendingUp}
          accent="emerald"
        />
        <StatCard
          label="연장 계약 매출"
          value={formatKRW(extensionRevenue)}
          subValue={`${extensionContracts.length}건 연장`}
          icon={Coins}
          accent="amber"
        />
        <StatCard
          label="1팀 기여도"
          value={`${topShare}%`}
          icon={Medal}
          accent="emerald"
        />
      </div>

      <PlaceQaDashboardPanel title="전사 · 고객사 Q&A" />

      <Card glow>
        <CardHeader
          title="팀별 매출 기여도 랭킹"
          subtitle="월 광고비 기준 (백만원)"
        />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: "#71717a", fontSize: 12 }}
                axisLine={{ stroke: "#3f3f46" }}
                tickFormatter={(v) => `${v}M`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fill: "#a1a1aa", fontSize: 12 }}
                axisLine={{ stroke: "#3f3f46" }}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "12px",
                }}
                formatter={(value) => [`${value}M원`, "매출"]}
              />
              <Bar dataKey="매출" radius={[0, 6, 6, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={RANK_COLORS[i % RANK_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <ExpensePayoutApprovalPanel />

      <DashboardBonusSection
        hint={
          bonusEligibleCount > 0 ? (
            <span className="text-xs text-[var(--muted)]">
              4월차+ {bonusEligibleCount}건
            </span>
          ) : undefined
        }
      >
        <BonusPayrollSummaryPanel />

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-muted)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              임직원 성과급(세전) 예상 (한도 {execLimit}%)
            </p>
            <p className="text-xs text-[var(--muted)]">
              재계약 4월차+ · 정책 % 기준
            </p>
          </div>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatBonusKRW(executiveBonus)}
          </span>
        </div>

        <Card>
          <CardHeader
            title="연장 성과급(세전) 정산"
            subtitle={`팀별 · 임원 한도 ${execLimit}% 기준 (4월차+)`}
          />
          <div className="space-y-3">
            {rankings.map((team, i) => {
              const teamExtensions = getTeamBonusContracts(
                contracts,
                team.teamId,
              );
              const bonus = teamExtensions.reduce(
                (s, c) =>
                  s +
                  calcBonusAmounts(c, data.bonusPolicy, data)
                    .executiveBonusAmount,
                0,
              );

              return (
                <button
                  key={team.teamId}
                  type="button"
                  onClick={() =>
                    setSelectedTeam({ team, contracts: teamExtensions })
                  }
                  className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-left transition-colors hover:border-cyan-500/30 hover:bg-zinc-900"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
                      style={{
                        background: `${RANK_COLORS[i % RANK_COLORS.length]}20`,
                        color: RANK_COLORS[i % RANK_COLORS.length],
                      }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">
                        {team.teamName}
                      </p>
                      <p className="text-xs text-zinc-500">
                        연장 {teamExtensions.length}건 · 클릭하여 세부내역
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-semibold text-cyan-400">
                      {formatBonusKRW(bonus)}
                    </p>
                    <ChevronRight className="h-4 w-4 text-zinc-600" />
                  </div>
                </button>
              );
            })}
            {rankings.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-500">
                산하 팀이 없습니다
              </p>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
            <span className="text-sm font-medium text-zinc-300">
              본인 지급 예정
            </span>
            <Badge variant="success">{formatBonusKRW(executiveBonus)}</Badge>
          </div>
        </Card>

        <BonusPolicyPanel />
        <BonusApprovalPanel role="executive" />
      </DashboardBonusSection>

      <ExtensionBonusDetailModal
        open={selectedTeam != null}
        onClose={() => setSelectedTeam(null)}
        teamName={selectedTeam?.team.teamName ?? ""}
        limitPercent={execLimit}
        contracts={selectedTeam?.contracts ?? []}
        data={data}
        view="executive"
      />
    </div>
  );
}
