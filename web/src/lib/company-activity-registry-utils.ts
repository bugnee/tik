import {
  matchesPeriodDate,
  periodFilterLabel,
  type PeriodFilterValue,
} from "@/lib/date-filter-utils";
import {
  EXPERIENCE_SCHEDULING_STATUS_LABELS,
} from "@/lib/experience-campaign-utils";
import { buildExperienceRegistryRows } from "@/lib/experience-registry-utils";
import { getWorkOrderTaskLabel, getExecutionTypeLabel } from "@/lib/task-channel-utils";
import { getExpenseCategoryLabel } from "@/lib/expense-category-utils";
import { getUserName } from "@/lib/selectors";
import {
  EXECUTION_STATUS_LABELS,
  PAYOUT_LABELS,
  QA_THREAD_STATUS_LABELS,
} from "@/lib/types";
import type {
  AppData,
  Contract,
  ExperienceParticipant,
  ExperienceSchedulingStatus,
  TaskChannelAccent,
} from "@/lib/types";
import { CLIENT_WORK_STAGE_LABELS } from "@/lib/work-order-utils";

/** 고객사·임직원 통합 활동 구분 */
export type CompanyActivityKind =
  | "experience"
  | "work_order"
  | "execution"
  | "qa"
  | "extension"
  | "expense";

export interface CompanyActivityRow {
  rowKey: string;
  kind: CompanyActivityKind;
  contractId: string;
  clientName: string;
  clientTradeName?: string;
  clientPhone: string;
  /** 파트너사 또는 담당자 표시 */
  counterpartyName: string;
  counterpartyPhone: string;
  title: string;
  activityDate: string;
  statusLabel: string;
  detail: string;
  experience?: {
    campaignId: string;
    schedulingStatus: ExperienceSchedulingStatus;
    participants: ExperienceParticipant[];
    visitScheduleLabel: string;
  };
}

export type CompanyActivitySortKey = "title" | "client" | "activityDate" | "kind";
export type CompanyActivitySortDirection = "asc" | "desc";

export const COMPANY_ACTIVITY_KIND_ORDER: CompanyActivityKind[] = [
  "experience",
  "work_order",
  "execution",
  "qa",
  "extension",
  "expense",
];

export const COMPANY_ACTIVITY_KIND_LABELS: Record<CompanyActivityKind, string> = {
  experience: "체험단",
  work_order: "업무",
  execution: "집행",
  qa: "Q&A",
  extension: "계약",
  expense: "원가",
};

export const COMPANY_ACTIVITY_KIND_ACCENTS: Record<
  CompanyActivityKind,
  TaskChannelAccent
> = {
  experience: "cyan",
  work_order: "amber",
  execution: "emerald",
  qa: "rose",
  extension: "violet",
  expense: "amber",
};

function formatClientPhone(contract?: Contract): string {
  if (!contract) return "-";
  const phones = [contract.clientContactPhone, contract.clientPhone].filter(
    Boolean,
  );
  return [...new Set(phones)].join(" / ") || "-";
}

function clientDisplay(contract?: Contract) {
  const companyName = contract?.companyName?.trim();
  const tradeName = contract?.clientName?.trim();
  return {
    clientName: companyName || tradeName || "-",
    clientTradeName:
      companyName && tradeName && companyName !== tradeName
        ? tradeName
        : undefined,
    clientPhone: formatClientPhone(contract),
  };
}

/** 계약 범위 내 모든 활동 행 생성 */
export function buildCompanyActivityRows(
  data: AppData,
  contractIds: Set<string>,
  options?: { includeExpenses?: boolean },
): CompanyActivityRow[] {
  const rows: CompanyActivityRow[] = [];
  const includeExpenses = options?.includeExpenses ?? true;

  for (const expRow of buildExperienceRegistryRows(data, contractIds)) {
    rows.push({
      rowKey: `experience-${expRow.campaignId}`,
      kind: "experience",
      contractId: expRow.contractId,
      clientName: expRow.clientName,
      clientTradeName: expRow.clientTradeName,
      clientPhone: expRow.clientPhone,
      counterpartyName: expRow.partnerNames,
      counterpartyPhone: expRow.partnerPhone,
      title: expRow.campaignTitle,
      activityDate: expRow.visitDate,
      statusLabel: EXPERIENCE_SCHEDULING_STATUS_LABELS[expRow.status],
      detail: `${expRow.sequence}회차 · 참가 ${expRow.participantCount}명 · ${expRow.visitScheduleLabel}`,
      experience: {
        campaignId: expRow.campaignId,
        schedulingStatus: expRow.status,
        participants: expRow.participants,
        visitScheduleLabel: expRow.visitScheduleLabel,
      },
    });
  }

  for (const order of data.workOrders) {
    if (!contractIds.has(order.contractId)) continue;
    const contract = data.contracts.find((c) => c.id === order.contractId);
    const client = clientDisplay(contract);
    const partner = order.partnerId
      ? data.partners.find((p) => p.id === order.partnerId)
      : undefined;
    const taskLabel = getWorkOrderTaskLabel(data, order.taskType);

    rows.push({
      rowKey: `work-order-${order.id}`,
      kind: "work_order",
      contractId: order.contractId,
      ...client,
      counterpartyName:
        partner?.companyName ??
        (contract ? getUserName(data, contract.assignedStaffId) : "-"),
      counterpartyPhone: partner?.phone ?? "-",
      title: `${taskLabel} ${order.sequence}회차`,
      activityDate: order.dueDate,
      statusLabel: CLIENT_WORK_STAGE_LABELS[order.stage],
      detail: `마감 ${order.dueDate}${order.title ? ` · ${order.title}` : ""}`,
    });
  }

  for (const execution of data.executions) {
    if (!contractIds.has(execution.contractId)) continue;
    const contract = data.contracts.find((c) => c.id === execution.contractId);
    const client = clientDisplay(contract);
    const typeLabel = getExecutionTypeLabel(data, execution.type);

    rows.push({
      rowKey: `execution-${execution.id}`,
      kind: "execution",
      contractId: execution.contractId,
      ...client,
      counterpartyName: contract
        ? getUserName(data, contract.assignedStaffId)
        : "-",
      counterpartyPhone: "-",
      title: `${typeLabel} 실행`,
      activityDate: execution.dueDate ?? execution.completedDate ?? "",
      statusLabel: EXECUTION_STATUS_LABELS[execution.status],
      detail: `${execution.completedCount}/${execution.targetCount}건`,
    });
  }

  for (const thread of data.qaThreads ?? []) {
    if (!contractIds.has(thread.contractId)) continue;
    const contract = data.contracts.find((c) => c.id === thread.contractId);
    const client = clientDisplay(contract);

    rows.push({
      rowKey: `qa-${thread.id}`,
      kind: "qa",
      contractId: thread.contractId,
      ...client,
      counterpartyName: getUserName(data, thread.assignedStaffId),
      counterpartyPhone: "-",
      title: thread.subject,
      activityDate: thread.lastMessageAt || thread.createdAt,
      statusLabel: QA_THREAD_STATUS_LABELS[thread.status],
      detail: `문의 ${thread.createdAt.slice(0, 10)}`,
    });
  }

  for (const approval of data.extensionApprovals) {
    if (!contractIds.has(approval.contractId)) continue;
    const contract = data.contracts.find((c) => c.id === approval.contractId);
    const client = clientDisplay(contract);
    const statusLabel =
      approval.status === "pending"
        ? "승인 대기"
        : approval.status === "approved"
          ? "승인됨"
          : "반려됨";

    rows.push({
      rowKey: `extension-${approval.id}`,
      kind: "extension",
      contractId: approval.contractId,
      ...client,
      counterpartyName: contract
        ? getUserName(data, contract.assignedStaffId)
        : "-",
      counterpartyPhone: "-",
      title: "연장 전환 신청",
      activityDate: approval.createdAt.slice(0, 10),
      statusLabel,
      detail: "계약 연장 검토",
    });
  }

  if (includeExpenses) {
    for (const expense of data.expenses) {
      if (!contractIds.has(expense.contractId)) continue;
      const contract = data.contracts.find((c) => c.id === expense.contractId);
      const client = clientDisplay(contract);
      const partner = expense.partnerId
        ? data.partners.find((p) => p.id === expense.partnerId)
        : undefined;

      rows.push({
        rowKey: `expense-${expense.id}`,
        kind: "expense",
        contractId: expense.contractId,
        ...client,
        counterpartyName: partner?.companyName ?? expense.accountHolder ?? "-",
        counterpartyPhone: partner?.phone ?? "-",
        title: `${getExpenseCategoryLabel(data.expenseCategories, expense.category)} 원가`,
        activityDate:
          expense.payoutRequestedAt?.slice(0, 10) ??
          expense.paymentDueDate ??
          "",
        statusLabel: PAYOUT_LABELS[expense.payoutStatus],
        detail: expense.description,
      });
    }
  }

  return rows;
}

export function filterCompanyActivityRows(
  rows: CompanyActivityRow[],
  options: {
    periodFilter: PeriodFilterValue;
    search: string;
    kind: CompanyActivityKind | "all";
  },
): CompanyActivityRow[] {
  const q = options.search.trim().toLowerCase();

  return rows.filter((row) => {
    if (options.kind !== "all" && row.kind !== options.kind) return false;
    if (row.activityDate && !matchesPeriodDate(row.activityDate, options.periodFilter)) {
      return false;
    }
    if (!row.activityDate && options.periodFilter.mode !== "month") {
      // 날짜 없는 행은 월 필터 외에는 제외
      if (
        options.periodFilter.mode === "day" ||
        options.periodFilter.mode === "range"
      ) {
        return false;
      }
    }
    if (!q) return true;

    const haystack = [
      row.clientName,
      row.clientTradeName,
      row.title,
      row.counterpartyName,
      row.clientPhone,
      row.counterpartyPhone,
      COMPANY_ACTIVITY_KIND_LABELS[row.kind],
      row.detail,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function sortCompanyActivityRows(
  rows: CompanyActivityRow[],
  key: CompanyActivitySortKey,
  direction: CompanyActivitySortDirection,
): CompanyActivityRow[] {
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "title":
        cmp = a.title.localeCompare(b.title, "ko");
        break;
      case "client":
        cmp = a.clientName.localeCompare(b.clientName, "ko");
        break;
      case "activityDate":
        cmp = a.activityDate.localeCompare(b.activityDate);
        break;
      case "kind":
        cmp =
          COMPANY_ACTIVITY_KIND_ORDER.indexOf(a.kind) -
          COMPANY_ACTIVITY_KIND_ORDER.indexOf(b.kind);
        break;
    }
    return direction === "asc" ? cmp : -cmp;
  });
}

export function companyActivityPeriodSummary(
  rows: CompanyActivityRow[],
  periodFilter: PeriodFilterValue,
): string {
  const label = periodFilterLabel(periodFilter);
  const byKind = COMPANY_ACTIVITY_KIND_ORDER.map((kind) => {
    const count = rows.filter((r) => r.kind === kind).length;
    return count > 0 ? `${COMPANY_ACTIVITY_KIND_LABELS[kind]} ${count}` : null;
  })
    .filter(Boolean)
    .join(" · ");
  return `${label} · ${rows.length}건${byKind ? ` · ${byKind}` : ""}`;
}

export function countCompanyActivityByKind(
  rows: CompanyActivityRow[],
): Record<CompanyActivityKind, number> {
  const counts = Object.fromEntries(
    COMPANY_ACTIVITY_KIND_ORDER.map((k) => [k, 0]),
  ) as Record<CompanyActivityKind, number>;
  for (const row of rows) counts[row.kind] += 1;
  return counts;
}
