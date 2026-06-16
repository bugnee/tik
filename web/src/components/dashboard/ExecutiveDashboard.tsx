"use client";

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
import { Coins, Medal, TrendingUp, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardHeader } from "@/components/dashboard/StaffDashboard";
import { BonusApprovalPanel } from "@/components/bonus/BonusApprovalPanel";
import { ExpensePayoutApprovalPanel } from "@/components/finance/ExpensePayoutApprovalPanel";
import { BonusPolicyPanel } from "@/components/bonus/BonusPolicyPanel";
import { PlaceQaDashboardPanel } from "@/components/place-qa/PlaceQaDashboardPanel";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import {
  calcBonusAmounts,
  getExecutiveLimit,
  isBonusEligible,
} from "@/lib/bonus-utils";
import { formatKRW } from "@/lib/finance";
import { getTeamRankings } from "@/lib/selectors";

const RANK_COLORS = ["#10b981", "#06b6d4", "#f59e0b"];

export function ExecutiveDashboard() {
  const data = useData();
  const { currentUser } = useRole();
  const { contracts } = data;

  const execLimit = getExecutiveLimit(data.bonusPolicy, currentUser.id);
  const teamIds = data.teams
    .filter((t) => t.executiveId === currentUser.id)
    .map((t) => t.id);

  const extensionContracts = contracts.filter(
    (c) => c.isExtension && teamIds.includes(c.teamId),
  );
  const extensionRevenue = extensionContracts.reduce(
    (s, c) => s + c.monthlyFee,
    0,
  );
  const executiveBonus = contracts
    .filter((c) => isBonusEligible(c) && teamIds.includes(c.teamId))
    .reduce(
      (s, c) =>
        s + calcBonusAmounts(c, data.bonusPolicy, data).executiveBonusAmount,
      0,
    );
  const rankings = getTeamRankings(data);
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

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="임원 대시보드"
        description="산하 팀 매출 기여도 · 연장 성과급(대표 한도 내) 실시간 정산"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          label={`임원 성과급 (한도 ${execLimit}%)`}
          value={formatKRW(executiveBonus)}
          subValue="재계약 4월차+ · 정책 % 기준"
          icon={Wallet}
          accent="cyan"
        />
        <StatCard
          label="1팀 기여도"
          value={`${topShare}%`}
          icon={Medal}
          accent="emerald"
        />
      </div>

      <PlaceQaDashboardPanel title="전사 · 플레이스 문의 현황" />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3" glow>
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

        <Card className="lg:col-span-2">
          <CardHeader
            title="연장 성과급 정산"
            subtitle={`팀별 · 임원 한도 ${execLimit}% 기준 (4월차+)`}
          />
          <div className="space-y-3">
            {rankings.map((team, i) => {
              const teamExtensions = contracts.filter(
                (c) =>
                  c.teamId === team.teamId &&
                  isBonusEligible(c),
              );
              const bonus = teamExtensions.reduce(
                (s, c) =>
                  s +
                  calcBonusAmounts(c, data.bonusPolicy, data)
                    .executiveBonusAmount,
                0,
              );

              return (
                <div
                  key={team.teamId}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3"
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
                        연장 {teamExtensions.length}건
                      </p>
                    </div>
                  </div>
                  <p className="font-mono text-sm font-semibold text-cyan-400">
                    {formatKRW(bonus)}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4">
            <span className="text-sm font-medium text-zinc-300">본인 지급 예정</span>
            <Badge variant="success">{formatKRW(executiveBonus)}</Badge>
          </div>
        </Card>
      </div>

      <BonusPolicyPanel />
      <ExpensePayoutApprovalPanel />
      <BonusApprovalPanel role="executive" />
    </div>
  );
}
