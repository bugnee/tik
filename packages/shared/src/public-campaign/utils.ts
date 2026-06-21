import type {
  PublicCampaignListing,
  PublicCampaignSection,
  PublicCampaignSectionId,
} from "./types";

const MS_PER_DAY = 86_400_000;

/** 마감까지 남은 일수 (0 = 오늘, 음수 = 마감) */
export function getDaysUntilDeadline(deadlineAt: string, now = new Date()): number {
  const deadline = new Date(deadlineAt);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDeadline = new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate(),
  );
  return Math.round(
    (startOfDeadline.getTime() - startOfToday.getTime()) / MS_PER_DAY,
  );
}

/** D-day 라벨 */
export function formatDeadlineLabel(deadlineAt: string, now = new Date()): string {
  const days = getDaysUntilDeadline(deadlineAt, now);
  if (days < 0) return "마감";
  if (days === 0) return "오늘 마감";
  return `${days}일 남음`;
}

/** 신청/모집 표시 */
export function formatApplicationRatio(campaign: PublicCampaignListing): string {
  return `신청 ${campaign.applicationCount} / ${campaign.targetHeadcount}`;
}

/** 공개 노출 가능 상태 */
export function isPubliclyVisibleCampaign(
  campaign: PublicCampaignListing,
): boolean {
  return (
    campaign.schedulingStatus === "recruiting" &&
    getDaysUntilDeadline(campaign.deadlineAt) >= 0
  );
}

export function filterPublicCampaigns(
  campaigns: PublicCampaignListing[],
): PublicCampaignListing[] {
  return campaigns.filter(isPubliclyVisibleCampaign);
}

/** 홈 섹션 분류 (MVP 휴리스틱) */
export function buildPublicCampaignSections(
  campaigns: PublicCampaignListing[],
  now = new Date(),
): PublicCampaignSection[] {
  const visible = filterPublicCampaigns(campaigns);

  const premium = visible
    .filter((c) => c.isPremium)
    .sort((a, b) => getDaysUntilDeadline(a.deadlineAt, now) - getDaysUntilDeadline(b.deadlineAt, now))
    .slice(0, 8);

  const popular = [...visible]
    .sort((a, b) => b.applicationCount - a.applicationCount)
    .slice(0, 8);

  const closingSoon = [...visible]
    .sort(
      (a, b) =>
        getDaysUntilDeadline(a.deadlineAt, now) -
        getDaysUntilDeadline(b.deadlineAt, now),
    )
    .slice(0, 8);

  const weekAgo = now.getTime() - 7 * MS_PER_DAY;
  const newest = visible
    .filter((c) => new Date(c.createdAt).getTime() >= weekAgo)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 8);

  const sections: Array<{ id: PublicCampaignSectionId; title: string; items: PublicCampaignListing[] }> =
    [
      { id: "premium", title: "프리미엄 체험단", items: premium },
      { id: "popular", title: "인기 체험단", items: popular },
      { id: "closing_soon", title: "마감 임박 체험단", items: closingSoon },
      { id: "new", title: "신규 체험단", items: newest },
    ];

  return sections
    .filter((section) => section.items.length > 0)
    .map((section) => ({
      id: section.id,
      title: section.title,
      campaigns: section.items,
    }));
}
