import { daysUntil, DEMO_TODAY } from "@/lib/contract-lifecycle";
import { isClientDepositBlockingWork, canRunContractWork } from "@/lib/client-deposit-utils";
import { getWorkOrderTaskLabel } from "@/lib/task-channel-utils";
import { CLIENT_WORK_STAGE_LABELS } from "@/lib/work-order-utils";
import type { ClientReportLink } from "@/lib/selectors";
import {
  getContractExtensionApproval,
  getContractRecords,
  getContractActivity,
} from "@/lib/selectors";
import type {
  AppData,
  Contract,
  ExtensionApproval,
  TaskChannelAccent,
  WorkOrderStage,
} from "./types";
import { pendingProposal } from "./experience-campaign-utils";
import { TERMINATION_REASON_LABELS } from "./types";

export type ClientPortalView =
  | "performance"
  | "collaborate"
  | "schedule"
  | "experience"
  | "contract";

export type ClientContractFocus = "extension" | "place" | "termination";

/** 고객사 포털 탭별 색상 — 성과·소통·일정·계약 구분 */
export const CLIENT_PORTAL_VIEW_ACCENTS: Record<
  ClientPortalView,
  TaskChannelAccent
> = {
  performance: "emerald",
  collaborate: "rose",
  schedule: "amber",
  experience: "cyan",
  contract: "violet",
};

export const CLIENT_PORTAL_VIEWS: {
  id: ClientPortalView;
  label: string;
  shortLabel: string;
  accent: TaskChannelAccent;
}[] = [
  { id: "performance", label: "성과", shortLabel: "성과", accent: "emerald" },
  { id: "collaborate", label: "소통", shortLabel: "소통", accent: "rose" },
  { id: "schedule", label: "일정", shortLabel: "일정", accent: "amber" },
  {
    id: "experience",
    label: "활동",
    shortLabel: "활동",
    accent: "cyan",
  },
  { id: "contract", label: "계약", shortLabel: "계약", accent: "violet" },
];

/** 탭별 서브 헤더 · 카드 테두리 */
export const CLIENT_PORTAL_VIEW_SURFACE: Record<ClientPortalView, string> = {
  performance:
    "border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-zinc-950/60 to-zinc-950",
  collaborate:
    "border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-zinc-950/60 to-zinc-950",
  schedule:
    "border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-zinc-950/60 to-zinc-950",
  experience:
    "border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-zinc-950/60 to-zinc-950",
  contract:
    "border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-zinc-950/60 to-zinc-950",
};

/** 탭별 아이콘 원형 배경 */
export const CLIENT_PORTAL_VIEW_ICON_SURFACE: Record<ClientPortalView, string> = {
  performance: "bg-emerald-500/15 text-emerald-300",
  collaborate: "bg-rose-500/15 text-rose-300",
  schedule: "bg-amber-500/15 text-amber-300",
  experience: "bg-cyan-500/15 text-cyan-300",
  contract: "bg-violet-500/15 text-violet-300",
};

/** 탭별 카드 강조 테두리 */
export const CLIENT_PORTAL_VIEW_CARD_BORDER: Record<ClientPortalView, string> = {
  performance: "border-emerald-500/25",
  collaborate: "border-rose-500/25",
  schedule: "border-amber-500/25",
  experience: "border-cyan-500/25",
  contract: "border-violet-500/25",
};

/** 계약 포커스(연장·플레이스·해지) 강조 링 */
export const CLIENT_CONTRACT_FOCUS_RING: Record<ClientContractFocus, string> = {
  extension: "ring-emerald-500/45",
  place: "ring-cyan-500/45",
  termination: "ring-rose-500/45",
};

export const CLIENT_CONTRACT_FOCUS_ICON: Record<ClientContractFocus, string> = {
  extension: "text-emerald-400/90",
  place: "text-cyan-400/90",
  termination: "text-rose-400/90",
};

export function getClientPortalViewAccent(view: ClientPortalView): TaskChannelAccent {
  return CLIENT_PORTAL_VIEW_ACCENTS[view];
}

/** 고객사 포털 탭별 알림 건수 */
export type ClientPortalBadgeCounts = Record<ClientPortalView, number>;

const EMPTY_CLIENT_PORTAL_BADGES: ClientPortalBadgeCounts = {
  performance: 0,
  collaborate: 0,
  schedule: 0,
  experience: 0,
  contract: 0,
};

/** 계약 단위 탭별 알림 집계 — Navbar·탭바 뱃지 (userId 있으면 확인한 항목 제외) */
export function getClientPortalBadgeCounts(
  data: AppData,
  contract: Contract | null,
  userId?: string,
): ClientPortalBadgeCounts {
  if (!contract) return { ...EMPTY_CLIENT_PORTAL_BADGES };

  const items = userId
    ? getActiveClientPortalActionItems(data, contract, userId)
    : getClientPortalActionItems(data, contract);

  return buildClientPortalBadgeCountsFromItems(items);
}

/** 처리 항목 → 탭별 건수 */
export function buildClientPortalBadgeCountsFromItems(
  items: ClientPortalActionItem[],
): ClientPortalBadgeCounts {
  return {
    performance: items.filter((i) => i.view === "performance").length,
    collaborate: items.filter((i) => i.view === "collaborate").length,
    schedule: items.filter((i) => i.view === "schedule").length,
    experience: items.filter((i) => i.view === "experience").length,
    contract: items.filter((i) => i.view === "contract").length,
  };
}

/** 고객사 포털 — 탭 뱃지와 동일 기준의 처리 항목 */
export type ClientPortalActionItem = {
  id: string;
  view: ClientPortalView;
  title: string;
  detail: string;
  anchorId: string;
  actionLabel?: string;
};

/** 일정 탭 뱃지·해야 할 일에 포함되는 업무 단계 */
export const CLIENT_PORTAL_SCHEDULE_ACTION_STAGES = [
  "pending_approval",
  "pending_staff_confirm",
  "approved",
] as const satisfies readonly WorkOrderStage[];

/** 계약 단위 처리 항목 — 탭 뱃지 규칙과 1:1 대응 */
export function getClientPortalActionItems(
  data: AppData,
  contract: Contract | null,
): ClientPortalActionItem[] {
  if (!contract) return [];

  const items: ClientPortalActionItem[] = [];
  const contractId = contract.id;
  const workOrders = data.workOrders.filter((o) => o.contractId === contractId);

  // 성과 — 입금 확인 후 링크 제출 완료 업무
  if (canRunContractWork(data, contractId)) {
    for (const order of workOrders.filter((o) => o.stage === "delivered")) {
      const taskLabel = getWorkOrderTaskLabel(data, order.taskType);
      const linksWithUrl = order.postLinks.filter((l) => l.url?.trim());
      const anchorId =
        linksWithUrl.length > 0
          ? `client-action-link-${order.id}-${linksWithUrl[0].id}`
          : `client-action-schedule-${order.id}`;

      items.push({
        id: `performance-${order.id}`,
        view: "performance",
        title: `${taskLabel} ${order.sequence}회차 · 결과 확인`,
        detail:
          linksWithUrl.length > 1
            ? `등록 링크 ${linksWithUrl.length}건 · 검토 및 의견을 남겨 주세요`
            : "등록된 링크를 검토하고 의견을 남겨 주세요",
        anchorId,
        actionLabel: "성과물 보기",
      });
    }
  }

  // 소통 — 담당 답변 완료, 고객 확인 대기
  for (const thread of (data.qaThreads ?? []).filter(
    (t) => t.contractId === contractId && t.status === "answered",
  )) {
    items.push({
      id: `collaborate-qa-${thread.id}`,
      view: "collaborate",
      title: thread.subject,
      detail: "담당 매니저 답변이 등록되었습니다 · 확인 후 필요 시 추가 문의해 주세요",
      anchorId: `client-action-qa-${thread.id}`,
      actionLabel: "답변 확인",
    });
  }

  // 일정 — 승인·진행 중 업무
  for (const order of workOrders.filter((o) =>
    (CLIENT_PORTAL_SCHEDULE_ACTION_STAGES as readonly WorkOrderStage[]).includes(
      o.stage,
    ),
  )) {
    const taskLabel = getWorkOrderTaskLabel(data, order.taskType);
    items.push({
      id: `schedule-${order.id}`,
      view: "schedule",
      title: `${taskLabel} ${order.sequence}회차`,
      detail: `${CLIENT_WORK_STAGE_LABELS[order.stage]} · 마감 ${order.dueDate}`,
      anchorId: `client-action-schedule-${order.id}`,
      actionLabel: "일정 확인",
    });
  }

  // 체험단 — 고객사 일정 조율·확정 대기
  for (const campaign of (data.experienceCampaigns ?? []).filter(
    (c) => c.contractId === contractId && c.schedulingStatus === "coordinating",
  )) {
    const pending = pendingProposal(campaign);
    items.push({
      id: `experience-${campaign.id}`,
      view: "experience",
      title: campaign.title,
      detail: pending
        ? "일정 제안을 확인하고 확정해 주세요"
        : "모집 조건·일정을 조율해 주세요",
      anchorId: `client-action-experience-${campaign.id}`,
      actionLabel: "체험단 진행",
    });
  }

  // 계약 — 입금 차단
  if (isClientDepositBlockingWork(contract)) {
    items.push({
      id: "contract-deposit",
      view: "contract",
      title: "광고비 입금 필요",
      detail: "입금 확인 후 집행·체험단 등 모든 업무가 시작됩니다",
      anchorId: "client-action-deposit",
      actionLabel: "입금 안내",
    });
  }

  const renewal = buildClientRenewalInsight(data, contract);
  if (
    renewal.canRequestExtension &&
    (renewal.urgency === "soon" || renewal.urgency === "imminent")
  ) {
    items.push({
      id: "contract-renewal",
      view: "contract",
      title:
        renewal.urgency === "imminent" && renewal.daysLeft != null
          ? `계약 만료 D-${Math.max(0, renewal.daysLeft)}`
          : `계약 종료 ${renewal.daysLeft ?? ""}일 전`,
      detail: renewal.headline,
      anchorId: "client-action-renewal",
      actionLabel: "재계약 검토",
    });
  }

  return items;
}

/** 고객사가 확인한 항목 제외 */
export function filterDismissedClientPortalActions(
  items: ClientPortalActionItem[],
  dismissals: AppData["clientPortalActionDismissals"],
  contractId: string,
  userId: string,
): ClientPortalActionItem[] {
  const dismissed = new Set(
    (dismissals ?? [])
      .filter((d) => d.contractId === contractId && d.userId === userId)
      .map((d) => d.actionId),
  );
  return items.filter((item) => !dismissed.has(item.id));
}

/** 확인 처리 반영된 처리 항목 */
export function getActiveClientPortalActionItems(
  data: AppData,
  contract: Contract | null,
  userId: string,
): ClientPortalActionItem[] {
  if (!contract) return [];
  return filterDismissedClientPortalActions(
    getClientPortalActionItems(data, contract),
    data.clientPortalActionDismissals,
    contract.id,
    userId,
  );
}

/** 현재 탭에 해당하는 처리 항목만 */
export function getClientPortalActionItemsForView(
  items: ClientPortalActionItem[],
  view: ClientPortalView,
): ClientPortalActionItem[] {
  return items.filter((item) => item.view === view);
}

/** Navbar href → 해당 탭 알림 수 */
export function getClientPortalBadgeCountForHref(
  counts: ClientPortalBadgeCounts,
  href: string,
): number {
  const view = getClientPortalViewFromHref(href);
  return view ? counts[view] : 0;
}

export type ClientPartnershipStats = {
  renewalMonths: number;
  totalLinks: number;
  completedWorkOrders: number;
  partnershipRecords: number;
  isExtension: boolean;
};

export type ClientRenewalInsight = {
  daysLeft: number | null;
  urgency: "none" | "soon" | "imminent" | "ended";
  extensionApproval?: ExtensionApproval;
  canRequestExtension: boolean;
  headline: string;
  subline: string;
};

export function parseClientPortalView(
  value: string | null | undefined,
): ClientPortalView {
  if (
    value === "collaborate" ||
    value === "schedule" ||
    value === "experience" ||
    value === "contract" ||
    value === "performance"
  ) {
    return value;
  }
  return "performance";
}

/** 네비 href에서 고객사 포털 뷰 추출 */
export function getClientPortalViewFromHref(href: string): ClientPortalView | null {
  if (href.includes("view=collaborate")) return "collaborate";
  if (href.includes("view=schedule")) return "schedule";
  if (href.includes("view=experience")) return "experience";
  if (href.includes("view=contract")) return "contract";
  if (href.includes("view=performance")) return "performance";
  return null;
}

export const CLIENT_CONTRACT_FOCUS_LABELS: Record<ClientContractFocus, string> =
  {
    extension: "연장 계약",
    place: "플레이스 세팅",
    termination: "해지",
  };

export const CLIENT_CONTRACT_FOCUS_SECTION_IDS: Record<
  ClientContractFocus,
  string
> = {
  extension: "client-contract-extension",
  place: "client-contract-place",
  termination: "client-contract-termination",
};

export function parseClientContractFocus(
  value: string | null | undefined,
): ClientContractFocus | null {
  if (value === "extension" || value === "place" || value === "termination") {
    return value;
  }
  return null;
}

export type ClientContractFocusItem = {
  id: string;
  date: string;
  title: string;
  detail: string;
};

export function buildClientContractFocusItems(
  data: AppData,
  contract: Contract,
  focus: ClientContractFocus,
): ClientContractFocusItem[] {
  const items: ClientContractFocusItem[] = [];
  const records = getContractRecords(data, contract.id);
  const activity = getContractActivity(data, contract.id);

  if (focus === "extension") {
    for (const item of activity.filter((a) => a.kind === "extension")) {
      items.push({
        id: item.id,
        date: item.date,
        title: item.title,
        detail: item.detail,
      });
    }
    for (const record of records.filter((r) => r.isExtension)) {
      items.push({
        id: record.id,
        date: record.startedAt,
        title: `${record.period} 회차 연장`,
        detail: record.endedAt
          ? `${record.startedAt} ~ ${record.endedAt}`
          : "진행 중",
      });
    }
    if (contract.isExtension) {
      items.push({
        id: `${contract.id}-extension-current`,
        date: contract.contractStartDate,
        title: "연장 계약 진행 중",
        detail: `재계약 ${contract.renewalMonthCount}월차 · 만료 ${contract.contractEndDate}`,
      });
    }
  }

  if (focus === "place") {
    const threads = (data.qaThreads ?? []).filter(
      (t) => t.contractId === contract.id,
    );
    for (const thread of threads.filter((t) => /플레이스|place/i.test(t.subject))) {
      items.push({
        id: thread.id,
        date: thread.createdAt,
        title: thread.subject,
        detail: thread.status === "open" ? "답변 대기" : "답변 완료",
      });
    }
    const credentials = (data.placeCredentials ?? []).find(
      (p) => p.contractId === contract.id,
    );
    if (credentials) {
      items.push({
        id: credentials.id,
        date: credentials.updatedAt,
        title: "플레이스 접속 정보 등록",
        detail: credentials.placeUrl,
      });
    }
    if (contract.hasPlaceSetting && items.length === 0) {
      items.push({
        id: `${contract.id}-place-ready`,
        date: "",
        title: "플레이스 세팅 포함",
        detail: "접속 정보 등록 및 플레이스 관련 문의를 아래에서 확인하세요",
      });
    }
    if (!contract.hasPlaceSetting) {
      items.push({
        id: `${contract.id}-place-none`,
        date: "",
        title: "플레이스 세팅 미포함",
        detail: "현재 계약에 플레이스 세팅이 포함되어 있지 않습니다",
      });
    }
  }

  if (focus === "termination") {
    if (contract.status === "terminated") {
      items.push({
        id: `${contract.id}-termination`,
        date: contract.terminatedAt ?? contract.contractEndDate,
        title: "계약 해지",
        detail: contract.terminationReason
          ? TERMINATION_REASON_LABELS[contract.terminationReason]
          : "해지 완료",
      });
    } else {
      items.push({
        id: `${contract.id}-termination-active`,
        date: contract.contractEndDate,
        title: "현재 계약 진행 중",
        detail: `만료 예정 ${contract.contractEndDate} · 해지 문의는 담당 매니저에게 연락해 주세요`,
      });
    }
    for (const record of records.filter((r) => r.terminationReason)) {
      items.push({
        id: record.id,
        date: record.endedAt ?? record.startedAt,
        title: `${record.period} 회차 해지`,
        detail: TERMINATION_REASON_LABELS[record.terminationReason!],
      });
    }
  }

  return items.sort((a, b) => (b.date || "z").localeCompare(a.date || "z"));
}

export function buildClientPartnershipStats(
  data: AppData,
  contract: Contract,
  links: ClientReportLink[],
  completedWorkOrderCount: number,
): ClientPartnershipStats {
  const records = getContractRecords(data, contract.id);
  return {
    renewalMonths: contract.renewalMonthCount,
    totalLinks: links.length,
    completedWorkOrders: completedWorkOrderCount,
    partnershipRecords: records.length,
    isExtension: contract.isExtension,
  };
}

export function buildClientRenewalInsight(
  data: AppData,
  contract: Contract,
  today = DEMO_TODAY,
): ClientRenewalInsight {
  const extensionApproval = getContractExtensionApproval(data, contract.id);
  const daysLeft =
    contract.status === "active"
      ? daysUntil(contract.contractEndDate, today)
      : null;

  let urgency: ClientRenewalInsight["urgency"] = "none";
  if (daysLeft != null) {
    if (daysLeft < 0) urgency = "ended";
    else if (daysLeft <= 14) urgency = "imminent";
    else if (daysLeft <= 45) urgency = "soon";
  }

  const canRequestExtension =
    contract.status === "active" &&
    !contract.isExtension &&
    extensionApproval?.status !== "pending" &&
    extensionApproval?.status !== "approved";

  let headline = "함께 쌓아온 마케팅 성과를 확인하세요";
  let subline = `${contract.renewalMonthCount}개월째 파트너십 · 담당팀과 실시간으로 소통하며 진행합니다`;

  if (extensionApproval?.status === "pending") {
    headline = "재계약 검토가 진행 중입니다";
    subline = `${extensionApproval.createdAt} 신청 · 담당 팀장 확인 후 안내드립니다`;
  } else if (extensionApproval?.status === "approved") {
    headline = "재계약이 완료되었습니다";
    subline = "앞으로도 함께 성장하는 마케팅을 이어갑니다";
  } else if (urgency === "imminent" && daysLeft != null) {
    headline = `계약 만료 D-${daysLeft} · 지금 재계약을 검토해 보세요`;
    subline = "이번 달 성과를 바탕으로 연장 일정을 미리 잡을 수 있습니다";
  } else if (urgency === "soon" && daysLeft != null) {
    headline = `계약 종료까지 ${daysLeft}일`;
    subline = "성과 리포트를 확인하고 다음 회차를 준비해 보세요";
  } else if (urgency === "ended") {
    headline = "계약 기간이 종료되었습니다";
    subline = "재계약 문의는 담당 매니저 또는 Q&A로 남겨 주세요";
  }

  return {
    daysLeft,
    urgency,
    extensionApproval,
    canRequestExtension,
    headline,
    subline,
  };
}

export function clientPortalProgressTone(
  percent: number,
): "excellent" | "good" | "attention" {
  if (percent >= 85) return "excellent";
  if (percent >= 60) return "good";
  return "attention";
}
