import type {
  PublicCampaignChannel,
  PublicCampaignDeliveryType,
} from "./types";

export const PUBLIC_CAMPAIGN_CHANNEL_LABELS: Record<
  PublicCampaignChannel,
  string
> = {
  blog: "블로그",
  instagram: "인스타그램",
  youtube: "유튜브",
  reels: "릴스",
  youtube_shorts: "유튜브 쇼츠",
};

export const PUBLIC_CAMPAIGN_DELIVERY_LABELS: Record<
  PublicCampaignDeliveryType,
  string
> = {
  visit: "방문형",
  delivery: "배송형",
  purchase: "구매형",
};
