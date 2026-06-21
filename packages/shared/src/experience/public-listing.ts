import type {
  PublicCampaignChannel,
  PublicCampaignDeliveryType,
} from "../public-campaign/types";
import type { PublicCampaignDetailContent } from "../public-campaign/detail";

/** ERP 체험단 → 공개 포털 노출 설정 */
export interface ExperiencePublicListing {
  /** 공개 포털에 노출 */
  visible: boolean;
  channel: PublicCampaignChannel;
  deliveryType: PublicCampaignDeliveryType;
  regionLabel?: string;
  /** 모집 마감 (ISO) */
  deadlineAt: string;
  points?: number;
  isPremium?: boolean;
  /** 공개용 제목 (미입력 시 ERP title + benefit 사용) */
  displayTitle?: string;
  publishedAt?: string;
  publishedByUserId?: string;
  /** 공개 상세 모집 페이지 */
  detail?: PublicCampaignDetailContent;
}
