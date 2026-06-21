import type {
  AppData,
  Contract,
  Execution,
  ExecutionType,
  Expense,
  OrgNode,
  TeamMemberStats,
  TeamRanking,
  User,
  UserRole,
} from "./types";
import { isLeaderManagedContract } from "./contract-access-utils";
import { getPartnerCollaborationContractIds } from "./partner-collaboration-utils";
import { calcBonusAmounts, isBonusEligible } from "./bonus-utils";
import { migratePostLinks } from "./execution-utils";
import { dedupeContractExecutions } from "./execution-generation-utils";
import {
  calcContractWorkProgress,
  filterWorkOrdersByContract,
} from "./work-order-utils";
import {
  getContractCompletionRate,
  getExecutionTypeLabel,
  getWorkOrderTaskLabel,
} from "./task-channel-utils";
import {
  getExpenseCategoryLabel,
} from "./expense-category-utils";
import {
  EXECUTION_STATUS_LABELS,
  PAYOUT_LABELS,
} from "./types";

export function getUserName(data: AppData, userId: string): string {
  return data.users.find((u) => u.id === userId)?.name ?? "-";
}

export function getTeamName(data: AppData, teamId: string): string {
  return data.teams.find((t) => t.id === teamId)?.name ?? "-";
}

export function getClientName(data: AppData, contractId: string): string {
  return data.contracts.find((c) => c.id === contractId)?.clientName ?? "-";
}

export function getCompletionRate(data: AppData, contract: Contract): number {
  return getContractCompletionRate(data.taskChannels, contract);
}

/** 해당월 실행 진행율 (워크오더 있으면 가중 진행률, 없으면 달성률) */
export function getMonthlyProgressRate(
  data: AppData,
  contract: Contract,
): number {
  const orders = filterWorkOrdersByContract(data.workOrders, contract.id);
  if (orders.length > 0) {
    return calcContractWorkProgress(orders, data.taskChannels).weightedPercent;
  }
  return Math.round(getCompletionRate(data, contract));
}

/** 계약 누적매출 (회차 기록 합산, 기록 없으면 월차 × 월 광고비) */
export function getContractCumulativeRevenue(
  data: AppData,
  contract: Contract,
): number {
  const records = data.contractRecords.filter(
    (r) => r.contractId === contract.id,
  );
  if (records.length > 0) {
    return records.reduce((sum, r) => sum + r.monthlyFee, 0);
  }
  return contract.monthlyFee * Math.max(1, contract.renewalMonthCount);
}

export function getStaffBonus(
  contracts: Contract[],
  policy: AppData["bonusPolicy"],
  data: Pick<AppData, "teams"> & { users?: AppData["users"] },
): number {
  return contracts
    .filter((c) => isBonusEligible(c))
    .reduce(
      (s, c) => s + calcBonusAmounts(c, policy, data).staffBonusAmount,
      0,
    );
}

export function getExtensionRate(contracts: Contract[]): number {
  if (contracts.length === 0) return 0;
  return (contracts.filter((c) => c.isExtension).length / contracts.length) * 100;
}

export function filterContractsByRole(
  data: AppData,
  role: UserRole,
  userId: string,
): Contract[] {
  switch (role) {
    case "staff":
      return data.contracts.filter((c) => c.assignedStaffId === userId);
    case "team_leader": {
      const user = data.users.find((u) => u.id === userId);
      if (!user?.teamId) return [];
      return data.contracts.filter((c) => {
        if (c.teamId !== user.teamId) return false;
        if (isLeaderManagedContract(data, c)) {
          return c.assignedStaffId === userId;
        }
        return true;
      });
    }
    case "executive":
    case "ceo":
    case "finance_manager":
      return data.contracts;
    case "partner": {
      const user = data.users.find((u) => u.id === userId);
      const partnerId = user?.partnerId;
      if (!partnerId) return [];
      const ids = new Set(getPartnerCollaborationContractIds(data, partnerId));
      return data.contracts.filter((c) => ids.has(c.id));
    }
    case "client": {
      const contractId = data.users.find((u) => u.id === userId)?.contractId;
      return contractId
        ? data.contracts.filter((c) => c.id === contractId)
        : [];
    }
    default:
      return data.contracts;
  }
}

export function getTeamMemberStats(
  data: AppData,
  teamId: string,
): TeamMemberStats[] {
  const staff = data.users.filter(
    (u) => u.role === "staff" && u.teamId === teamId,
  );

  return staff.map((member) => {
    const contracts = data.contracts.filter(
      (c) => c.assignedStaffId === member.id,
    );
    const avgCompletion =
      contracts.length > 0
        ? contracts.reduce((s, c) => s + getCompletionRate(data, c), 0) /
          contracts.length
        : 0;

    return {
      id: member.id,
      name: member.name,
      completionRate: avgCompletion,
      clientCount: contracts.length,
      extensionRate: getExtensionRate(contracts),
    };
  });
}

export function getTeamRankings(data: AppData): TeamRanking[] {
  return data.teams.map((team) => {
    const contracts = data.contracts.filter((c) => c.teamId === team.id);
    const revenue = contracts.reduce((s, c) => s + c.monthlyFee, 0);
    const completionRate =
      contracts.length > 0
        ? contracts.reduce((s, c) => s + getCompletionRate(data, c), 0) /
          contracts.length
        : 0;

    return {
      teamId: team.id,
      teamName: team.name,
      revenue,
      clientCount: contracts.length,
      completionRate,
    };
  });
}

export function buildOrgTree(data: AppData): OrgNode {
  const ceo = data.users.find((u) => u.role === "ceo")!;
  const executives = data.users.filter((u) => u.role === "executive");
  const leaders = data.users.filter((u) => u.role === "team_leader");
  const staff = data.users.filter((u) => u.role === "staff");

  const revenueByStaff = new Map<string, number>();
  const revenueByTeam = new Map<string, number>();
  let totalRevenue = 0;
  for (const contract of data.contracts) {
    totalRevenue += contract.monthlyFee;
    revenueByStaff.set(
      contract.assignedStaffId,
      (revenueByStaff.get(contract.assignedStaffId) ?? 0) + contract.monthlyFee,
    );
    revenueByTeam.set(
      contract.teamId,
      (revenueByTeam.get(contract.teamId) ?? 0) + contract.monthlyFee,
    );
  }

  const userRevenue = (userId: string) => revenueByStaff.get(userId) ?? 0;
  const teamRevenue = (teamId: string) => revenueByTeam.get(teamId) ?? 0;

  const execNodes: OrgNode[] = executives.map((exec) => ({
    id: exec.id,
    name: exec.name,
    role: exec.role,
    revenue: totalRevenue,
    children: leaders.map((leader) => ({
      id: leader.id,
      name: leader.name,
      role: leader.role,
      revenue: teamRevenue(leader.teamId ?? ""),
      children: staff
        .filter((s) => s.teamId === leader.teamId)
        .map((s) => ({
          id: s.id,
          name: s.name,
          role: s.role,
          revenue: userRevenue(s.id),
        })),
    })),
  }));

  return {
    id: ceo.id,
    name: ceo.name,
    role: ceo.role,
    revenue: totalRevenue,
    children: execNodes,
  };
}

/** 조직도 노드(대표·임원·팀장·담당)에 속한 계약 목록 */
export function getContractsForOrgNode(
  data: AppData,
  node: OrgNode,
): Contract[] {
  const active = data.contracts.filter((c) => c.status === "active");

  if (node.role === "staff") {
    return active
      .filter((c) => c.assignedStaffId === node.id)
      .sort((a, b) => b.monthlyFee - a.monthlyFee);
  }

  if (node.role === "team_leader") {
    const teamId = data.users.find((u) => u.id === node.id)?.teamId;
    if (!teamId) return [];
    return active
      .filter((c) => {
        if (c.teamId !== teamId) return false;
        if (isLeaderManagedContract(data, c)) {
          return c.assignedStaffId === node.id;
        }
        return true;
      })
      .sort((a, b) => b.monthlyFee - a.monthlyFee);
  }

  if (node.role === "executive") {
    const teamIds = new Set(
      data.teams.filter((t) => t.executiveId === node.id).map((t) => t.id),
    );
    return active
      .filter((c) => teamIds.has(c.teamId))
      .sort((a, b) => b.monthlyFee - a.monthlyFee);
  }

  return [...active].sort((a, b) => b.monthlyFee - a.monthlyFee);
}

export function syncContractProgress(
  data: AppData,
  contractId: string,
): Contract | undefined {
  const contract = data.contracts.find((c) => c.id === contractId);
  if (!contract) return undefined;

  const executions = data.executions.filter((e) => e.contractId === contractId);
  const optimized = executions.find((e) => e.type === "optimized");
  const influencer = executions.find((e) => e.type === "influencer");

  return {
    ...contract,
    optimizedDone: optimized?.completedCount ?? contract.optimizedDone,
    influencerDone: influencer?.completedCount ?? contract.influencerDone,
  };
}

export function syncAllContractProgress(data: AppData): Contract[] {
  return data.contracts.map(
    (c) => syncContractProgress(data, c.id) ?? c,
  );
}

export function staffUsers(data: AppData): User[] {
  return data.users.filter((u) => u.role === "staff");
}

/** 계약 담당자 후보 — 실무 담당 + 팀장 (팀장 직접 담당 계약) */
export function contractAssigneeUsers(
  data: AppData,
  teamId?: string,
): User[] {
  return data.users.filter(
    (u) =>
      (u.role === "staff" || u.role === "team_leader") &&
      (!teamId || u.teamId === teamId),
  );
}

export function enrichExpense(data: AppData, expense: Expense) {
  const partner = expense.partnerId
    ? data.partners.find((p) => p.id === expense.partnerId)
    : undefined;
  return {
    ...expense,
    clientName: getClientName(data, expense.contractId),
    partnerName: partner?.companyName ?? "-",
    bankName: partner?.bankName,
    categoryLabel: getExpenseCategoryLabel(data.expenseCategories, expense.category),
  };
}

export function enrichExecution(data: AppData, execution: Execution) {
  return {
    ...execution,
    postLinks: migratePostLinks(execution.postLinks, execution.dueDate),
    clientName: getClientName(data, execution.contractId),
  };
}

export function getContractExecutions(data: AppData, contractId: string) {
  return data.executions.filter((e) => e.contractId === contractId);
}

/** 채널 키 기준 중복 제거된 계약 실행 목록 */
export function getContractExecutionsDeduped(
  data: AppData,
  contractId: string,
): Execution[] {
  const contract = data.contracts.find((c) => c.id === contractId);
  if (!contract) return [];
  return dedupeContractExecutions(
    data.executions,
    contractId,
    contract,
    data.taskChannels,
  ).filter((e) => e.contractId === contractId);
}

export function getContractExpenses(data: AppData, contractId: string) {
  return data.expenses.filter((e) => e.contractId === contractId);
}

export function getContractRecords(data: AppData, contractId: string) {
  return data.contractRecords
    .filter((r) => r.contractId === contractId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function getContractMemos(data: AppData, contractId: string) {
  return (data.contractMemos ?? [])
    .filter((m) => m.contractId === contractId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getContractExtensionApproval(
  data: AppData,
  contractId: string,
) {
  return [...data.extensionApprovals]
    .filter((a) => a.contractId === contractId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function getContractTermsApproval(
  data: AppData,
  contractId: string,
) {
  return [...(data.contractTermsApprovals ?? [])]
    .filter((a) => a.contractId === contractId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export interface ActivityItem {
  id: string;
  date: string;
  kind: "execution" | "expense" | "extension";
  title: string;
  detail: string;
  status?: string;
}

export function getContractActivity(
  data: AppData,
  contractId: string,
): ActivityItem[] {
  const items: ActivityItem[] = [];

  getContractExecutions(data, contractId).forEach((e) => {
    items.push({
      id: e.id,
      date: e.dueDate ?? "",
      kind: "execution",
      title: `${getExecutionTypeLabel(data, e.type)} 실행`,
      detail: `${e.completedCount}/${e.targetCount} · ${EXECUTION_STATUS_LABELS[e.status]}`,
      status: e.status,
    });
  });

  getContractExpenses(data, contractId).forEach((e) => {
    items.push({
      id: e.id,
      date: "",
      kind: "expense",
      title: `${getExpenseCategoryLabel(data.expenseCategories, e.category)} 원가`,
      detail: `${e.description} · ${PAYOUT_LABELS[e.payoutStatus]}`,
      status: e.payoutStatus,
    });
  });

  data.extensionApprovals
    .filter((a) => a.contractId === contractId)
    .forEach((a) => {
      const statusLabel =
        a.status === "pending"
          ? "승인 대기"
          : a.status === "approved"
            ? "승인됨"
            : "반려됨";
      items.push({
        id: a.id,
        date: a.createdAt,
        kind: "extension",
        title: "연장 전환 신청",
        detail: statusLabel,
        status: a.status,
      });
    });

  return items.sort((a, b) => (b.date || "z").localeCompare(a.date || "z"));
}

export function getClientContractForUser(
  data: AppData,
  userId: string,
  hintContractId?: string,
): Contract | null {
  const user = data.users.find((u) => u.id === userId);
  const contractId =
    user?.contractId ??
    hintContractId ??
    data.accountProfiles?.find((profile) => profile.linkedUserId === userId)
      ?.contractId;
  if (!contractId) return null;
  return data.contracts.find((c) => c.id === contractId) ?? null;
}

/** 로그인 화면 · 조직 관리용 고객사 포털 계정 */
export function getClientPortalAccounts(data: AppData) {
  return data.accountProfiles
    .filter((p) => p.role === "client" && p.status === "approved")
    .map((profile) => {
      const contract = profile.contractId
        ? data.contracts.find((c) => c.id === profile.contractId)
        : undefined;
      return {
        profile,
        contractName: contract?.clientName ?? "-",
      };
    })
    .sort((a, b) => a.contractName.localeCompare(b.contractName, "ko"));
}

export interface ClientReportLink {
  id: string;
  channel: string;
  taskType?: string;
  executionType?: ExecutionType;
  url: string;
  dueDate?: string;
  completedDate?: string;
  enteredAt?: string;
  source: string;
  keyword?: string;
  searchRank?: number;
}

/** 고객사 보고서용 게시 링크 (실행 + 워크오더) */
export function getClientReportLinks(
  data: AppData,
  contractId: string,
): ClientReportLink[] {
  const links: ClientReportLink[] = [];

  getContractExecutions(data, contractId).forEach((exec) => {
    migratePostLinks(exec.postLinks, exec.dueDate).forEach((link) => {
      if (!link.url?.trim()) return;
      links.push({
        id: link.id,
        channel: getExecutionTypeLabel(data, exec.type),
        executionType: exec.type,
        url: link.url,
        dueDate: link.dueDate,
        completedDate: link.completedDate,
        enteredAt: link.enteredAt,
        source: "실행 진행",
        keyword: link.keyword,
        searchRank: link.searchRank,
      });
    });
  });

  data.workOrders
    .filter((o) => o.contractId === contractId)
    .forEach((order) => {
      order.postLinks.forEach((link) => {
        if (!link.url?.trim()) return;
        links.push({
          id: `${order.id}-${link.id}`,
          channel: getWorkOrderTaskLabel(data, order.taskType),
          taskType: order.taskType,
          url: link.url,
          dueDate: link.dueDate ?? order.dueDate,
          completedDate: link.completedDate ?? order.deliveredAt,
          enteredAt: link.enteredAt ?? order.deliveredAt,
          source: "집행 업무",
          keyword: link.keyword,
          searchRank: link.searchRank,
        });
      });
    });

  return links.sort((a, b) =>
    (b.completedDate || b.enteredAt || "").localeCompare(
      a.completedDate || a.enteredAt || "",
    ),
  );
}
