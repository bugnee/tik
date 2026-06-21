import type { PublicCampaignApplication } from "@tripitkorea/shared/public-campaign";

export const REVIEWER_PROFILE_STORAGE_KEY = "tripitkorea-reviewer-profile-v1";

export type ReviewerSnsPlatform = "blog" | "instagram" | "youtube" | "tiktok";

export interface ReviewerSnsLink {
  label: string;
  registered: boolean;
}

export interface ReviewerProfile {
  nickname?: string;
  activityRegion?: string;
  activityTopic?: string;
  sns: Record<ReviewerSnsPlatform, ReviewerSnsLink>;
}

export interface ReviewerProfileStats {
  visitCount: number;
  cancellationCount: number;
  heartCount: number;
  sponsorshipCount: number;
  penaltyCount: number;
  evaluationCount: number;
}

const EMPTY_SNS: ReviewerProfile["sns"] = {
  blog: { label: "", registered: false },
  instagram: { label: "", registered: false },
  youtube: { label: "", registered: false },
  tiktok: { label: "", registered: false },
};

export function createDefaultReviewerProfile(): ReviewerProfile {
  return {
    sns: { ...EMPTY_SNS },
  };
}

function profileKey(reviewerId: string) {
  return `${REVIEWER_PROFILE_STORAGE_KEY}:${reviewerId}`;
}

export function readReviewerProfile(reviewerId: string): ReviewerProfile {
  if (typeof window === "undefined") return createDefaultReviewerProfile();
  try {
    const raw = localStorage.getItem(profileKey(reviewerId));
    if (!raw) return createDefaultReviewerProfile();
    const parsed = JSON.parse(raw) as ReviewerProfile;
    return {
      ...createDefaultReviewerProfile(),
      ...parsed,
      sns: { ...EMPTY_SNS, ...parsed.sns },
    };
  } catch {
    return createDefaultReviewerProfile();
  }
}

export function writeReviewerProfile(reviewerId: string, profile: ReviewerProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(profileKey(reviewerId), JSON.stringify(profile));
}

/** 신청 내역 → 마이페이지 통계 */
export function buildReviewerStats(
  applications: PublicCampaignApplication[],
): ReviewerProfileStats {
  const active = applications.filter((a) => a.status !== "cancelled");
  return {
    visitCount: active.filter((a) => a.status === "selected").length,
    cancellationCount: applications.filter((a) => a.status === "cancelled").length,
    heartCount: 0,
    sponsorshipCount: active.filter((a) => a.status === "selected").length,
    penaltyCount: 0,
    evaluationCount: 0,
  };
}

export const REVIEWER_SNS_LABELS: Record<ReviewerSnsPlatform, string> = {
  blog: "블로그",
  instagram: "인스타그램",
  youtube: "유튜브",
  tiktok: "틱톡",
};
