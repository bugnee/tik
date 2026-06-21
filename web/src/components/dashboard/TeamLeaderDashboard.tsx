"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Building2,
  Check,
  ChevronRight,
  Percent,
  RefreshCw,
  Target,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardHeader } from "@/components/dashboard/StaffDashboard";
import { StandardContractWorkflowPanel } from "@/components/dashboard/StandardContractWorkflowPanel";
import { RoleOnboardingPanel } from "@/components/dashboard/RoleOnboardingPanel";
import { StaffDailyActionsPanel } from "@/components/dashboard/StaffDailyActionsPanel";
import { DashboardBonusSection } from "@/components/dashboard/DashboardBonusSection";
import { BonusApprovalPanel } from "@/components/bonus/BonusApprovalPanel";
import { BonusPolicyPanel } from "@/components/bonus/BonusPolicyPanel";
import { StaffBonusRequestPanel } from "@/components/bonus/StaffBonusRequestPanel";
import { BonusPayScheduleNotice } from "@/components/bonus/BonusPayScheduleNotice";
import { PlaceQaDashboardPanel } from "@/components/place-qa/PlaceQaDashboardPanel";
import { StaffWorkConfirmPanel } from "@/components/work-orders/StaffWorkConfirmPanel";
import { ContractBriefListModal } from "@/components/contracts/ContractBriefListModal";
import { TeamMemberListModal } from "@/components/dashboard/TeamMemberListModal";
import { useData } from "@/context/DataContext";
import {
  useDashboardPeriod,
  useDashboardPeriodScope,
  useRolePeriodContracts,
} from "@/context/DashboardPeriodContext";
import { filterContractsInPeriod } from "@/lib/dashboard-period-utils";
import { useRole } from "@/context/RoleContext";
import {
  calcBonusAmounts,
  getTeamLeaderLimit,
  isBonusEligible,
} from "@/lib/bonus-utils";
import { filterLeaderWorkContracts } from "@/lib/contract-access-utils";
import { formatBonusKRW } from "@/lib/bonus-utils";
import { formatKRW, formatPercent } from "@/lib/finance";
import {
  filterContractsByRole,
  getClientName,
  getCompletionRate,
  getExtensionRate,
  getTeamMemberStats,
  getUserName,
} from "@/lib/selectors";
import {
  formatChangedFieldsSummary,
  getTermsFormChangedFields,
  TERMS_MODE_LABELS,
} from "@/lib/contract-terms-approval-utils";
import { contractToTermsForm } from "@/lib/contract-terms-utils";
import {
  formatContractTargetSummary,
  getContractTargetChannels,
  getContractVisibleTargetChannels,
} from "@/lib/task-channel-utils";

type TeamLeaderListModal =
  | "members"
  | "teamContracts"
  | "teamCompletion"
  | "extension"
  | "myWork"
  | "myCompletion"
  | "myBonus"
  | null;

export function TeamLeaderDashboard() {
  const data = useData();
  const { currentUser } = useRole();
  const { periodLabel } = useDashboardPeriod();
  const periodScope = useDashboardPeriodScope();
  const [listModal, setListModal] = useState<TeamLeaderListModal>(null);
  const {
    extensionApprovals,
    contractTermsApprovals,
    approveExtension,
    rejectExtension,
    approveContractTermsApproval,
    rejectContractTermsApproval,
    contracts: allContracts,
    taskChannels,
  } = data;

  const teamId = currentUser.teamId ?? "team-a";
  const teamContracts = useRolePeriodContracts("team_leader", currentUser.id);
  const myWorkContracts = useMemo(
    () =>
      filterContractsInPeriod(
        filterLeaderWorkContracts(data, currentUser.id),
        periodScope.contractIds,
      ),
    [data, currentUser.id, periodScope.contractIds],
  );
  const leaderLimit = getTeamLeaderLimit(data.bonusPolicy, currentUser.id);
  const myBonusTotal = useMemo(
    () =>
      myWorkContracts
        .filter((c) => isBonusEligible(c))
        .reduce(
          (sum, c) =>
            sum + calcBonusAmounts(c, data.bonusPolicy, data).teamLeaderBonusAmount,
          0,
        ),
    [myWorkContracts, data.bonusPolicy, data],
  );
  const myAvgCompletion =
    myWorkContracts.length > 0
      ? myWorkContracts.reduce((s, c) => s + getCompletionRate(data, c), 0) /
        myWorkContracts.length
      : 0;
  const targetChannels = useMemo(
    () => getContractTargetChannels(data.taskChannels),
    [data.taskChannels],
  );
  const extensionRate = getExtensionRate(teamContracts);
  const teamMembers = getTeamMemberStats(data, teamId);
  const teamAvgCompletion =
    teamMembers.length > 0
      ? teamMembers.reduce((s, m) => s + m.completionRate, 0) /
        teamMembers.length
      : 0;
  const extensionContracts = useMemo(
    () => teamContracts.filter((c) => c.isExtension),
    [teamContracts],
  );
  const myBonusContracts = useMemo(
    () => myWorkContracts.filter((c) => isBonusEligible(c)),
    [myWorkContracts],
  );
  const teamContractsByCompletion = useMemo(
    () =>
      [...teamContracts].sort(
        (a, b) => getCompletionRate(data, b) - getCompletionRate(data, a),
      ),
    [teamContracts, data],
  );

  const pending = extensionApprovals.filter((a) => a.status === "pending");

  const teamContractIds = useMemo(
    () => new Set(teamContracts.map((c) => c.id)),
    [teamContracts],
  );
  const pendingTermsApprovals = useMemo(
    () =>
      (contractTermsApprovals ?? []).filter(
        (a) => a.status === "pending" && teamContractIds.has(a.contractId),
      ),
    [contractTermsApprovals, teamContractIds],
  );

  const chartData = teamMembers.map((m) => ({
    name: m.name,
    달성률: Math.round(m.completionRate * 10) / 10,
  }));

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="팀장 대시보드"
        description={`${periodLabel} · 팀 관리 · 본인 담당 업무 · 연장 승인`}
      />

      <RoleOnboardingPanel />
      <StandardContractWorkflowPanel />
      <StaffDailyActionsPanel />

      <StaffWorkConfirmPanel />

      {myWorkContracts.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="내 담당 업체"
              value={`${myWorkContracts.length}개`}
              subValue="팀장 직접 담당 · 담당 실무 비공개"
              icon={Building2}
              accent="cyan"
              onValueClick={() => setListModal("myWork")}
            />
            <StatCard
              label="내 담당 달성률"
              value={`${myAvgCompletion.toFixed(1)}%`}
              icon={Target}
              accent="emerald"
              onValueClick={() => setListModal("myCompletion")}
            />
          </div>

          <Card glow>
            <CardHeader
              title="내 담당 업무"
              subtitle="담당자와 동일하게 실행·계약 관리"
            />
            <div className="space-y-3">
              {myWorkContracts.map((c) => {
                const rate = getCompletionRate(data, c);
                const summaryChannels = getContractVisibleTargetChannels(
                  c,
                  data.taskChannels,
                );
                return (
                  <Link
                    key={c.id}
                    href={`/contracts/${c.id}`}
                    className="group block rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-4 transition-all hover:border-cyan-500/40 hover:bg-cyan-500/5"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-200 group-hover:text-cyan-300">
                          {c.clientName}
                        </span>
                        {c.isExtension && (
                          <Badge variant="success">연장</Badge>
                        )}
                        <Badge variant="info">팀장 담당</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-zinc-400">
                          {formatKRW(c.monthlyFee)}/월
                        </span>
                        <ChevronRight className="h-4 w-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-400" />
                      </div>
                    </div>
                    <ProgressBar value={rate} label="종합 달성률" color="cyan" />
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-zinc-500">
                      {summaryChannels.map((channel) => (
                        <span key={channel.id}>
                          {channel.label}{" "}
                          {formatContractTargetSummary(c, channel)}
                        </span>
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="팀원 수"
          value={`${teamMembers.length}명`}
          icon={Users}
          accent="cyan"
          onValueClick={() => setListModal("members")}
        />
        <StatCard
          label="팀 담당 업체"
          value={`${teamContracts.length}개`}
          icon={RefreshCw}
          accent="cyan"
          onValueClick={() => setListModal("teamContracts")}
        />
        <StatCard
          label="팀 평균 달성률"
          value={formatPercent(teamAvgCompletion)}
          icon={Percent}
          accent="emerald"
          onValueClick={() => setListModal("teamCompletion")}
        />
        <StatCard
          label="연장 전환율"
          value={formatPercent(extensionRate)}
          subValue="팀 전체 기준"
          icon={RefreshCw}
          accent="amber"
          onValueClick={() => setListModal("extension")}
        />
      </div>

      <TeamMemberListModal
        open={listModal === "members"}
        onClose={() => setListModal(null)}
        title={`팀원 (${teamMembers.length}명)`}
        description="개인별 담당 업체 · 달성률 · 연장 전환율"
        members={teamMembers}
      />
      <ContractBriefListModal
        open={listModal === "teamContracts"}
        onClose={() => setListModal(null)}
        title={`팀 담당 업체 (${teamContracts.length}개)`}
        description="팀 전체 활성·종료 계약"
        contracts={teamContracts}
        data={data}
      />
      <ContractBriefListModal
        open={listModal === "teamCompletion"}
        onClose={() => setListModal(null)}
        title={`팀 담당 업체 · 달성률 (${teamContracts.length}개)`}
        description={`팀 평균 달성률 ${formatPercent(teamAvgCompletion)} · 달성률 높은 순`}
        contracts={teamContractsByCompletion}
        data={data}
      />
      <ContractBriefListModal
        open={listModal === "extension"}
        onClose={() => setListModal(null)}
        title={`연장 계약 (${extensionContracts.length}/${teamContracts.length})`}
        description={`팀 연장 전환율 ${formatPercent(extensionRate)}`}
        contracts={extensionContracts}
        data={data}
      />
      <ContractBriefListModal
        open={listModal === "myWork"}
        onClose={() => setListModal(null)}
        title={`내 담당 업체 (${myWorkContracts.length}개)`}
        description="팀장 직접 담당 · 담당 실무 비공개"
        contracts={myWorkContracts}
        data={data}
      />
      <ContractBriefListModal
        open={listModal === "myCompletion"}
        onClose={() => setListModal(null)}
        title={`내 담당 업체 · 달성률 (${myWorkContracts.length}개)`}
        description={`평균 달성률 ${myAvgCompletion.toFixed(1)}%`}
        contracts={[...myWorkContracts].sort(
          (a, b) => getCompletionRate(data, b) - getCompletionRate(data, a),
        )}
        data={data}
      />
      <ContractBriefListModal
        open={listModal === "myBonus"}
        onClose={() => setListModal(null)}
        title={`연장 성과급(세전) 대상 (${myBonusContracts.length}개)`}
        description={`예상 합계 ${formatBonusKRW(myBonusTotal)} · 한도 ${leaderLimit}% · 15일 마감 · 25일 급여 합산`}
        contracts={myBonusContracts}
        data={data}
      />

      <PlaceQaDashboardPanel title="팀 · 고객사 Q&A" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card glow>
          <CardHeader
            title="팀원별 업무 이행률"
            subtitle="월간 목표 대비 달성률 비교"
          />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#71717a", fontSize: 12 }}
                  axisLine={{ stroke: "#3f3f46" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#71717a", fontSize: 12 }}
                  axisLine={{ stroke: "#3f3f46" }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [`${value}%`, "달성률"]}
                />
                <Bar dataKey="달성률" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="연장 전환 승인"
            subtitle={`대기 ${pending.length}건 · 승인 시 재계약 월차 누적`}
            action={
              pending.length > 0 ? (
                <Badge variant="warning">{pending.length}건 대기</Badge>
              ) : undefined
            }
          />
          <div className="space-y-3">
            {pending.map((item) => {
              const contract = allContracts.find(
                (c) => c.id === item.contractId,
              );
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
                >
                  <div>
                    <p className="font-medium text-zinc-200">
                      {contract?.clientName ?? getClientName(data, item.contractId)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      요청 {getUserName(data, item.requestedBy)} · 월{" "}
                      {formatKRW(contract?.monthlyFee ?? 0)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => rejectExtension(item.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                      반려
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approveExtension(item.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      승인
                    </Button>
                  </div>
                </div>
              );
            })}
            {pending.length === 0 && (
              <p className="py-12 text-center text-sm text-zinc-500">
                승인 대기 항목이 없습니다
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="계약 조건 변경 결재"
            subtitle={`대기 ${pendingTermsApprovals.length}건 · 재계약·조건 변경 팀장 승인`}
            action={
              pendingTermsApprovals.length > 0 ? (
                <Badge variant="warning">
                  {pendingTermsApprovals.length}건 대기
                </Badge>
              ) : undefined
            }
          />
          <div className="space-y-3">
            {pendingTermsApprovals.map((item) => {
              const contract = allContracts.find(
                (c) => c.id === item.contractId,
              );
              const baseline = contract
                ? contractToTermsForm(contract)
                : null;
              const changedSummary = baseline
                ? formatChangedFieldsSummary(
                    getTermsFormChangedFields(
                      baseline,
                      item.proposedValues,
                      taskChannels,
                    ),
                    taskChannels,
                  )
                : "";
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-200">
                      {contract?.clientName ??
                        getClientName(data, item.contractId)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {TERMS_MODE_LABELS[item.mode]} · 요청{" "}
                      {getUserName(data, item.requestedBy)} ·{" "}
                      {item.createdAt}
                    </p>
                    {changedSummary && (
                      <p className="mt-1 truncate text-xs text-amber-400/80">
                        변경: {changedSummary}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        rejectContractTermsApproval(item.id, currentUser.id)
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                      반려
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        approveContractTermsApproval(item.id, currentUser.id)
                      }
                    >
                      <Check className="h-3.5 w-3.5" />
                      승인
                    </Button>
                  </div>
                </div>
              );
            })}
            {pendingTermsApprovals.length === 0 && (
              <p className="py-12 text-center text-sm text-zinc-500">
                조건 변경 결재 대기 항목이 없습니다
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="팀원 상세" subtitle="개인별 연장 전환율" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th className="pb-3 pr-4 font-medium">이름</th>
                <th className="pb-3 pr-4 font-medium">담당 업체</th>
                <th className="pb-3 pr-4 font-medium">달성률</th>
                <th className="pb-3 font-medium">연장 전환율</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-zinc-800/50 text-zinc-300"
                >
                  <td className="py-3 pr-4 font-medium text-zinc-200">
                    {m.name}
                  </td>
                  <td className="py-3 pr-4">{m.clientCount}개</td>
                  <td className="py-3 pr-4">
                    <span
                      className={
                        m.completionRate >= 85
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }
                    >
                      {formatPercent(m.completionRate)}
                    </span>
                  </td>
                  <td className="py-3">{formatPercent(m.extensionRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <DashboardBonusSection
        hint={
          myBonusContracts.length > 0 ? (
            <span className="text-xs text-[var(--muted)]">
              대상 {myBonusContracts.length}건
            </span>
          ) : undefined
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-muted)] px-4 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              내 연장 성과급(세전) 예상
            </p>
            <p className="text-xs text-[var(--muted)]">
              한도 {leaderLimit}% · 대상 {myBonusContracts.length}건
            </p>
          </div>
          <button
            type="button"
            onClick={() => setListModal("myBonus")}
            className="text-lg font-bold text-emerald-600 dark:text-emerald-400"
          >
            {formatBonusKRW(myBonusTotal)}
          </button>
        </div>
        <BonusPayScheduleNotice />
        <StaffBonusRequestPanel mode="team_leader" />
        <BonusPolicyPanel />
        <BonusApprovalPanel role="team_leader" />
      </DashboardBonusSection>
    </div>
  );
}
