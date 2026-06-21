import type { PublicPortalStore } from "./application";
import { DEFAULT_PUBLIC_CAMPAIGNS } from "./seed";
import type { PublicCampaignListing } from "./types";
import type { PublicCampaignApplication } from "./application";

export function createDefaultPublicPortalStore(
  now = new Date(),
): PublicPortalStore {
  return {
    version: 1,
    campaigns: DEFAULT_PUBLIC_CAMPAIGNS,
    applications: [],
    updatedAt: now.toISOString(),
  };
}

/** ERP에서 내보낸 카탈로그 JSON 병합 */
export function mergePublicCatalog(
  store: PublicPortalStore,
  campaigns: PublicCampaignListing[],
  now = new Date(),
): PublicPortalStore {
  const byId = new Map(store.campaigns.map((item) => [item.id, item]));
  for (const campaign of campaigns) {
    byId.set(campaign.id, campaign);
  }
  return {
    ...store,
    campaigns: Array.from(byId.values()),
    updatedAt: now.toISOString(),
  };
}

export function countApplicationsForListing(
  applications: PublicCampaignApplication[],
  listingId: string,
): number {
  return applications.filter(
    (item) =>
      item.listingId === listingId &&
      item.status !== "cancelled" &&
      item.status !== "rejected",
  ).length;
}

export function enrichListingApplicationCounts(
  store: PublicPortalStore,
): PublicCampaignListing[] {
  return store.campaigns.map((campaign) => {
    const portalCount = countApplicationsForListing(
      store.applications,
      campaign.id,
    );
    return {
      ...campaign,
      applicationCount: Math.max(campaign.applicationCount, portalCount),
    };
  });
}
