/** 공개 포털 — 리뷰어 신청 상태 */
export type PublicCampaignApplicationStatus =
  | "pending"
  | "selected"
  | "rejected"
  | "cancelled";

/** 리뷰어 체험단 신청 */
export interface PublicCampaignApplication {
  id: string;
  listingId: string;
  campaignId?: string;
  reviewerId: string;
  reviewerName: string;
  reviewerEmail: string;
  channelHandle?: string;
  message?: string;
  /** 희망 방문일 (YYYY-MM-DD) */
  preferredVisitDate?: string;
  status: PublicCampaignApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export type PublicCampaignApplicationInput = Omit<
  PublicCampaignApplication,
  "id" | "status" | "createdAt" | "updatedAt"
>;

/** 공개 포털 localStorage 스냅샷 */
export interface PublicPortalStore {
  version: 1;
  campaigns: import("./types").PublicCampaignListing[];
  applications: PublicCampaignApplication[];
  updatedAt: string;
}
