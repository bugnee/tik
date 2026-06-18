"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  ChevronRight,
  GitBranch,
  Layers,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardHeader } from "@/components/dashboard/StaffDashboard";
import { DashboardBonusSection } from "@/components/dashboard/DashboardBonusSection";
import {
  BonusApprovalPanel,
  BonusStatusSummary,
} from "@/components/bonus/BonusApprovalPanel";
import { ExpensePayoutApprovalPanel } from "@/components/finance/ExpensePayoutApprovalPanel";
import { BonusPolicyPanel } from "@/components/bonus/BonusPolicyPanel";
import { BonusPayrollSummaryPanel } from "@/components/bonus/BonusPayrollSummaryPanel";
import { ContractBriefListModal } from "@/components/contracts/ContractBriefListModal";
import { PlaceQaDashboardPanel } from "@/components/place-qa/PlaceQaDashboardPanel";
import { StaffWorkConfirmPanel } from "@/components/work-orders/StaffWorkConfirmPanel";
import { useData } from "@/context/DataContext";
import {
  useDashboardPeriod,
  useDashboardPeriodScope,
  useRolePeriodContracts,
} from "@/context/DashboardPeriodContext";
import { useRole } from "@/context/RoleContext";
import { calculatePL, formatKRW } from "@/lib/finance";
import { buildOrgTree, getContractCumulativeRevenue, getContractsForOrgNode, getTeamName, getUserName } from "@/lib/selectors";
import { getContractStatusDisplay } from "@/lib/contract-lifecycle";
import type { Contract, OrgNode } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";
import { cn } from "@/lib/cn";

type CeoListModal = "extension" | "referral" | null;

export function CeoDashboard() {
  const data = useData();
  const { currentUser } = useRole();
  const { periodLabel } = useDashboardPeriod();
  const periodScope = useDashboardPeriodScope();
  const contracts = useRolePeriodContracts("ceo", currentUser.id);
  const pl = useMemo(
    () =>
      calculatePL(contracts, periodScope.expenses, data.bonusPolicy, {
        teams: data.teams,
      }),
    [contracts, periodScope.expenses, data.bonusPolicy, data.teams],
  );
  const totalRevenue = useMemo(
    () => contracts.reduce((s, c) => s + periodScope.getContractFee(c), 0),
    [contracts, periodScope],
  );
  const orgTree = useMemo(
    () => buildOrgTree(data),
    [data.contracts, data.users],
  );
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(orgTree);
  const [listModal, setListModal] = useState<CeoListModal>(null);

  const nodeContracts = useMemo(
    () =>
      selectedNode
        ? getContractsForOrgNode(data, selectedNode).filter((c) =>
            periodScope.contractIds.has(c.id),
          )
        : [],
    [data, selectedNode, periodScope.contractIds],
  );

  const totalClients = contracts.length;
  const extensionContracts = useMemo(
    () => contracts.filter((c) => c.isExtension),
    [contracts],
  );
  const referralContracts = useMemo(
    () => contracts.filter((c) => c.hasReferralPromo),
    [contracts],
  );
  const extensionCount = extensionContracts.length;
  const referralCount = referralContracts.length;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="대표 대시보드"
        description={`${periodLabel} · 전사 ${totalClients}개 업체 · 캐시플로우 · 조직도 실적 모니터링`}
      />

      <StaffWorkConfirmPanel />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="총 매출 (월)"
          value={formatKRW(totalRevenue)}
          subValue={`${totalClients}개 업체`}
          icon={TrendingUp}
          accent="emerald"
        />
        <StatCard
          label="순이익 (P&L)"
          value={formatKRW(pl.netProfit)}
          subValue="비용 · 리셀러 수수료 · 파트너비 차감 후"
          icon={Wallet}
          accent="cyan"
        />
        <StatCard
          label="연장 계약"
          value={`${extensionCount}건`}
          icon={Layers}
          accent="amber"
          onValueClick={
            extensionCount > 0 ? () => setListModal("extension") : undefined
          }
        />
        <StatCard
          label="리셀러 프로모션"
          value={`${referralCount}건`}
          subValue="10% 리셀러 수수료"
          icon={Building2}
          accent="rose"
          onValueClick={
            referralCount > 0 ? () => setListModal("referral") : undefined
          }
        />
      </div>

      <PlaceQaDashboardPanel title="전사 · 고객사 Q&A" />

      <ContractBriefListModal
        open={listModal === "extension"}
        onClose={() => setListModal(null)}
        title={`연장 계약 고객사 (${extensionCount}곳)`}
        description="재계약 · 성과급 정책 적용"
        contracts={extensionContracts}
        data={data}
      />
      <ContractBriefListModal
        open={listModal === "referral"}
        onClose={() => setListModal(null)}
        title={`리셀러 프로모션 고객사 (${referralCount}곳)`}
        description="월 광고비 10% 리셀러 수수료"
        contracts={referralContracts}
        data={data}
        showReferralFee
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2" glow>
          <CardHeader
            title="조직도 · 실적 드릴다운"
            subtitle="노드를 클릭하여 하위 실적 탐색"
          />
          <OrgTree
            node={orgTree}
            selectedId={selectedNode?.id}
            onSelect={setSelectedNode}
          />
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader
            title="선택 노드 상세"
            subtitle={
              selectedNode
                ? `${selectedNode.name} · ${ROLE_LABELS[selectedNode.role]}`
                : "노드를 선택하세요"
            }
          />
          {selectedNode ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <p className="text-xs text-zinc-500">담당 매출</p>
                <p className="mt-1 text-3xl font-bold text-emerald-400">
                  {formatKRW(selectedNode.revenue)}
                </p>
              </div>

              <NodeClientList contracts={nodeContracts} data={data} />

              {selectedNode.children && selectedNode.children.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    하위 조직
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedNode.children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => setSelectedNode(child)}
                        className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-left transition-colors hover:border-emerald-500/30 hover:bg-zinc-900"
                      >
                        <div>
                          <p className="text-sm font-medium text-zinc-200">
                            {child.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {ROLE_LABELS[child.role]}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-emerald-400">
                            {formatKRW(child.revenue)}
                          </span>
                          <ChevronRight className="h-4 w-4 text-zinc-600" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-zinc-500">
              조직도에서 노드를 선택하세요
            </p>
          )}
        </Card>
      </div>

      <ExpensePayoutApprovalPanel />

      <Card>
        <CardHeader title="전사 업체 목록" subtitle={`총 ${totalClients}개`} />
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-900">
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th className="pb-3 pr-4 font-medium">업체명</th>
                <th className="pb-3 pr-4 font-medium">팀</th>
                <th className="pb-3 pr-4 font-medium">담당</th>
                <th className="pb-3 pr-4 font-medium">월 광고비</th>
                <th className="pb-3 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-zinc-800/40 text-zinc-400"
                >
                  <td className="py-2.5 pr-4 font-medium text-zinc-200">
                    {c.clientName}
                  </td>
                  <td className="py-2.5 pr-4">{getTeamName(data, c.teamId)}</td>
                  <td className="py-2.5 pr-4">
                    {getUserName(data, c.assignedStaffId)}
                  </td>
                  <td className="py-2.5 pr-4 font-mono">
                    {formatKRW(c.monthlyFee)}
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-1">
                      {c.isExtension && (
                        <Badge variant="success">연장</Badge>
                      )}
                      {c.hasReferralPromo && (
                        <Badge variant="info">리셀러</Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <DashboardBonusSection>
        <BonusPayrollSummaryPanel />
        <BonusStatusSummary />
        <BonusPolicyPanel />
        <BonusApprovalPanel role="ceo" />
      </DashboardBonusSection>
    </div>
  );
}

function NodeClientList({
  contracts,
  data,
}: {
  contracts: Contract[];
  data: ReturnType<typeof useData>;
}) {
  type SortKey =
    | "clientName"
    | "monthlyFee"
    | "cumulativeRevenue"
    | "contractStartDate"
    | "contractStatus";

  const [sortKey, setSortKey] = useState<SortKey>("clientName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sortedContracts = useMemo(() => {
    const list = [...contracts];
    const dir = sortDir === "asc" ? 1 : -1;

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "clientName":
          cmp = a.clientName.localeCompare(b.clientName, "ko");
          break;
        case "monthlyFee":
          cmp = a.monthlyFee - b.monthlyFee;
          break;
        case "cumulativeRevenue":
          cmp =
            getContractCumulativeRevenue(data, a) -
            getContractCumulativeRevenue(data, b);
          break;
        case "contractStartDate":
          cmp = a.contractStartDate.localeCompare(b.contractStartDate);
          break;
        case "contractStatus":
          cmp = getContractStatusDisplay(a).sortKey.localeCompare(
            getContractStatusDisplay(b).sortKey,
          );
          break;
      }
      return cmp * dir;
    });

    return list;
  }, [contracts, data, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "clientName" ? "asc" : "desc");
  }

  function SortHeader({
    label,
    column,
    align = "left",
  }: {
    label: string;
    column: SortKey;
    align?: "left" | "right";
  }) {
    const active = sortKey === column;
    return (
      <th className={cn("px-3 py-2.5 sm:px-4", align === "right" && "text-right")}>
        <button
          type="button"
          onClick={() => toggleSort(column)}
          className={cn(
            "inline-flex items-center gap-1 font-medium transition-colors hover:text-zinc-300",
            active ? "text-emerald-400" : "text-zinc-500",
            align === "right" && "ml-auto",
          )}
        >
          {label}
          {active ? (
            sortDir === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      </th>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          담당 고객사 ({contracts.length}곳)
        </p>
        <p className="text-[11px] text-zinc-600">열 헤더 클릭 · 정렬</p>
      </div>

      {contracts.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-950/40 py-8 text-center text-sm text-zinc-500">
          담당 고객사가 없습니다
        </p>
      ) : (
        <div className="max-h-64 overflow-x-auto overflow-y-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm">
              <tr className="border-b border-zinc-800 text-left text-xs">
                <SortHeader label="고객사" column="clientName" />
                <SortHeader label="월 광고비" column="monthlyFee" />
                <SortHeader label="누적매출" column="cumulativeRevenue" />
                <SortHeader label="계약시작" column="contractStartDate" />
                <SortHeader label="계약현황" column="contractStatus" />
              </tr>
            </thead>
            <tbody>
              {sortedContracts.map((c) => {
                const status = getContractStatusDisplay(c);
                return (
                  <tr
                    key={c.id}
                    className="border-b border-zinc-800/50 text-zinc-400 last:border-0"
                  >
                    <td className="px-3 py-2.5 font-medium text-zinc-200 sm:px-4">
                      {c.clientName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-emerald-400/90 sm:px-4">
                      {formatKRW(c.monthlyFee)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-cyan-400/90 sm:px-4">
                      {formatKRW(getContractCumulativeRevenue(data, c))}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-zinc-300 sm:px-4">
                      {c.contractStartDate}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs sm:px-4">
                      {status.isInProgress ? (
                        <span className="font-medium text-emerald-400">
                          진행중
                        </span>
                      ) : (
                        <span className="text-zinc-400">{status.label}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OrgTree({
  node,
  selectedId,
  onSelect,
  depth = 0,
}: {
  node: OrgNode;
  selectedId?: string;
  onSelect: (node: OrgNode) => void;
  depth?: number;
}) {
  const isSelected = node.id === selectedId;

  return (
    <div className={cn(depth > 0 && "ml-4 border-l border-zinc-800 pl-3")}>
      <button
        type="button"
        onClick={() => onSelect(node)}
        className={cn(
          "mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
          isSelected
            ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
            : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200",
        )}
      >
        <GitBranch className="h-3.5 w-3.5 shrink-0 opacity-60" />
        <span className="flex-1 truncate font-medium">{node.name}</span>
        <span className="font-mono text-xs opacity-70">
          {(node.revenue / 1_000_000).toFixed(1)}M
        </span>
      </button>
      {node.children?.map((child) => (
        <OrgTree
          key={child.id}
          node={child}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}
