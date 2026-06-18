import {
  matchesPeriodDate,
  periodFilterLabel,
  type PeriodFilterValue,
} from "@/lib/date-filter-utils";
import { getClientExperienceHistoryCampaigns } from "@/lib/experience-campaign-utils";
import {
  maskNameFromUrl,
  maskPersonName,
  maskPhoneLast4,
} from "@/lib/client-privacy-utils";
import { getClientReportLinks } from "@/lib/selectors";
import type {
  AppData,
  ExecutionType,
  ExperienceParticipant,
  ExperienceSchedulingStatus,
  TaskChannelAccent,
} from "@/lib/types";

/** 고객사 활동 탭 — 마케팅 채널 구분 */
export type ClientChannelCategory =
  | "experience"
  | "power_blog"
  | "influencer"
  | "instagram"
  | "youtube"
  | "clip"
  | "tiktok";

export interface ClientChannelActivityRow {
  rowKey: string;
  category: ClientChannelCategory;
  categoryLabel: string;
  title: string;
  displayName: string;
  displayPhone: string;
  activityDate: string;
  statusLabel: string;
  detail: string;
  postUrl?: string;
  experience?: {
    campaignId: string;
    schedulingStatus: ExperienceSchedulingStatus;
    participants: ExperienceParticipant[];
  };
}

export type ClientChannelSortKey = "title" | "activityDate" | "category";
export type ClientChannelSortDirection = "asc" | "desc";

export const CLIENT_CHANNEL_ORDER: ClientChannelCategory[] = [
  "experience",
  "power_blog",
  "influencer",
  "instagram",
  "youtube",
  "clip",
  "tiktok",
];

export const CLIENT_CHANNEL_LABELS: Record<ClientChannelCategory, string> = {
  experience: "체험단",
  power_blog: "파워블로그",
  influencer: "인플루언서",
  instagram: "인스타",
  youtube: "유튜브",
  clip: "클립",
  tiktok: "틱톡",
};

export const CLIENT_CHANNEL_ACCENTS: Record<ClientChannelCategory, TaskChannelAccent> =
  {
    experience: "cyan",
    power_blog: "emerald",
    influencer: "violet",
    instagram: "fuchsia",
    youtube: "rose",
    clip: "amber",
    tiktok: "emerald",
  };

const BLOG_TASK_TYPES = new Set(["blog", "optimized"]);
const INFLUENCER_TASK_TYPES = new Set(["influencer"]);
const INSTA_TASK_TYPES = new Set(["insta_card", "instagram", "insta"]);
const YOUTUBE_TASK_TYPES = new Set(["youtube", "youtube_shorts"]);
const CLIP_TASK_TYPES = new Set(["clip", "shorts", "short", "reels"]);

function resolveCategoryFromLink(input: {
  taskType?: string;
  executionType?: ExecutionType;
  channelLabel?: string;
  url?: string;
}): ClientChannelCategory | null {
  const task = input.taskType?.toLowerCase() ?? "";
  const label = input.channelLabel?.toLowerCase() ?? "";
  const url = (input.url ?? "").toLowerCase();

  if (
    task === "experience" ||
    input.executionType === "experience" ||
    label.includes("체험")
  ) {
    return "experience";
  }
  if (
    BLOG_TASK_TYPES.has(task) ||
    input.executionType === "optimized" ||
    label.includes("블로그") ||
    label.includes("파워") ||
    url.includes("blog.naver")
  ) {
    return "power_blog";
  }
  if (
    INSTA_TASK_TYPES.has(task) ||
    label.includes("인스타") ||
    url.includes("instagram.com")
  ) {
    return "instagram";
  }
  if (
    YOUTUBE_TASK_TYPES.has(task) ||
    label.includes("유튜브") ||
    url.includes("youtube.com") ||
    url.includes("youtu.be")
  ) {
    return "youtube";
  }
  if (
    task === "tiktok" ||
    label.includes("틱톡") ||
    url.includes("tiktok.com")
  ) {
    return "tiktok";
  }
  if (
    CLIP_TASK_TYPES.has(task) ||
    label.includes("클립") ||
    label.includes("숏폼") ||
    url.includes("clips")
  ) {
    return "clip";
  }
  if (
    INFLUENCER_TASK_TYPES.has(task) ||
    input.executionType === "influencer" ||
    label.includes("인플루")
  ) {
    return "influencer";
  }

  return null;
}

/** 고객사 단일 계약 — 채널별 활동 내역 */
export function buildClientChannelActivityRows(
  data: AppData,
  contractId: string,
): ClientChannelActivityRow[] {
  const rows: ClientChannelActivityRow[] = [];

  const campaigns = getClientExperienceHistoryCampaigns(
    data.experienceCampaigns ?? [],
    contractId,
  );

  for (const campaign of campaigns) {
    if (campaign.participants.length === 0) {
      rows.push({
        rowKey: `experience-empty-${campaign.id}`,
        category: "experience",
        categoryLabel: CLIENT_CHANNEL_LABELS.experience,
        title: campaign.title,
        displayName: "-",
        displayPhone: "-",
        activityDate:
          campaign.confirmedVisitDate ?? campaign.createdAt.slice(0, 10),
        statusLabel: campaign.schedulingStatus,
        detail: `${campaign.sequence}회차 · 참가자 등록 대기`,
        experience: {
          campaignId: campaign.id,
          schedulingStatus: campaign.schedulingStatus,
          participants: campaign.participants,
        },
      });
      continue;
    }

    for (const participant of campaign.participants) {
      rows.push({
        rowKey: `experience-${campaign.id}-${participant.id}`,
        category: "experience",
        categoryLabel: CLIENT_CHANNEL_LABELS.experience,
        title: campaign.title,
        displayName: maskPersonName(participant.name),
        displayPhone: maskPhoneLast4(participant.contact),
        activityDate:
          participant.experienceDate ??
          campaign.confirmedVisitDate ??
          campaign.createdAt.slice(0, 10),
        statusLabel: campaign.schedulingStatus,
        detail:
          participant.blogName ||
          participant.snsHandle ||
          `${campaign.sequence}회차`,
        postUrl: participant.postUrl,
        experience: {
          campaignId: campaign.id,
          schedulingStatus: campaign.schedulingStatus,
          participants: [participant],
        },
      });
    }
  }

  for (const link of getClientReportLinks(data, contractId)) {
    const category = resolveCategoryFromLink({
      taskType: link.taskType,
      executionType: link.executionType,
      channelLabel: link.channel,
      url: link.url,
    });
    if (!category || category === "experience") continue;

    rows.push({
      rowKey: link.id,
      category,
      categoryLabel: CLIENT_CHANNEL_LABELS[category],
      title: link.channel,
      displayName: maskNameFromUrl(link.url),
      displayPhone: "-",
      activityDate:
        link.completedDate?.slice(0, 10) ??
        link.enteredAt?.slice(0, 10) ??
        link.dueDate?.slice(0, 10) ??
        "",
      statusLabel: link.completedDate ? "게시 완료" : "진행 중",
      detail: link.keyword
        ? `키워드 ${link.keyword}${link.searchRank ? ` · ${link.searchRank}위` : ""}`
        : link.source,
      postUrl: link.url,
    });
  }

  return rows.sort((a, b) =>
    (b.activityDate || "z").localeCompare(a.activityDate || "z"),
  );
}

export function filterClientChannelActivityRows(
  rows: ClientChannelActivityRow[],
  options: {
    periodFilter: PeriodFilterValue;
    search: string;
    category: ClientChannelCategory | "all";
  },
): ClientChannelActivityRow[] {
  const q = options.search.trim().toLowerCase();

  return rows.filter((row) => {
    if (options.category !== "all" && row.category !== options.category) {
      return false;
    }
    if (row.activityDate && !matchesPeriodDate(row.activityDate, options.periodFilter)) {
      return false;
    }
    if (!row.activityDate && options.periodFilter.mode !== "month") {
      if (
        options.periodFilter.mode === "day" ||
        options.periodFilter.mode === "range"
      ) {
        return false;
      }
    }
    if (!q) return true;

    const haystack = [
      row.title,
      row.categoryLabel,
      row.displayName,
      row.detail,
      row.statusLabel,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function sortClientChannelActivityRows(
  rows: ClientChannelActivityRow[],
  key: ClientChannelSortKey,
  direction: ClientChannelSortDirection,
): ClientChannelActivityRow[] {
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "title":
        cmp = a.title.localeCompare(b.title, "ko");
        break;
      case "activityDate":
        cmp = a.activityDate.localeCompare(b.activityDate);
        break;
      case "category":
        cmp =
          CLIENT_CHANNEL_ORDER.indexOf(a.category) -
          CLIENT_CHANNEL_ORDER.indexOf(b.category);
        break;
    }
    return direction === "asc" ? cmp : -cmp;
  });
}

export function clientChannelPeriodSummary(
  rows: ClientChannelActivityRow[],
  periodFilter: PeriodFilterValue,
): string {
  const label = periodFilterLabel(periodFilter);
  const parts = CLIENT_CHANNEL_ORDER.map((cat) => {
    const n = rows.filter((r) => r.category === cat).length;
    return n > 0 ? `${CLIENT_CHANNEL_LABELS[cat]} ${n}` : null;
  })
    .filter(Boolean)
    .join(" · ");
  return `${label} · ${rows.length}건${parts ? ` · ${parts}` : ""}`;
}

export function countClientChannelByCategory(
  rows: ClientChannelActivityRow[],
): Record<ClientChannelCategory, number> {
  const counts = Object.fromEntries(
    CLIENT_CHANNEL_ORDER.map((k) => [k, 0]),
  ) as Record<ClientChannelCategory, number>;
  for (const row of rows) counts[row.category] += 1;
  return counts;
}
