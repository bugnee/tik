import type { ExperienceSchedulingStatus } from "../experience/types";
import type { PublicCampaignDetailContent } from "./detail";

/** 공개 포털 — 리뷰 채널 */
export type PublicCampaignChannel =
  | "blog"
  | "instagram"
  | "youtube"
  | "reels"
  | "youtube_shorts";

/** 공개 포털 — 체험 유형 */
export type PublicCampaignDeliveryType = "visit" | "delivery" | "purchase";

/** 공개 홈·목록에 노출되는 체험단 카드 */
export interface PublicCampaignListing {
  id: string;
  /** ERP ExperienceCampaign.id 와 연결 (API 연동 시) */
  campaignId?: string;
  title: string;
  benefitSummary: string;
  channel: PublicCampaignChannel;
  deliveryType: PublicCampaignDeliveryType;
  /** 예: [제주/제주시] */
  regionLabel?: string;
  applicationCount: number;
  targetHeadcount: number;
  /** 모집 마감 시각 (ISO) */
  deadlineAt: string;
  /** 포인트 보상 (선택) */
  points?: number;
  isPremium?: boolean;
  schedulingStatus: ExperienceSchedulingStatus;
  createdAt: string;
  /** 공개 상세 페이지 콘텐츠 */
  detail?: PublicCampaignDetailContent;
}

export type PublicCampaignSectionId =
  | "premium"
  | "popular"
  | "closing_soon"
  | "new";

export interface PublicCampaignSection {
  id: PublicCampaignSectionId;
  title: string;
  campaigns: PublicCampaignListing[];
}
