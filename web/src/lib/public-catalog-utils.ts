import type { AppData } from "@/lib/types";
import { buildPublicCatalogFromCampaigns } from "@tripitkorea/shared/public-campaign";
import type { PublicCampaignListing } from "@tripitkorea/shared/public-campaign";

/** ERP 데이터 → 공개 포털용 카탈로그 */
export function buildErpPublicCatalog(data: AppData): PublicCampaignListing[] {
  const optionsByCampaignId: Record<string, { clientName?: string }> = {};

  for (const campaign of data.experienceCampaigns ?? []) {
    const contract = data.contracts.find((c) => c.id === campaign.contractId);
    optionsByCampaignId[campaign.id] = { clientName: contract?.clientName };
  }

  return buildPublicCatalogFromCampaigns(
    data.experienceCampaigns ?? [],
    optionsByCampaignId,
  );
}

/** 공개 포털 /sync 에 붙여 넣을 JSON */
export function exportPublicCatalogJson(data: AppData): string {
  const campaigns = buildErpPublicCatalog(data);
  return JSON.stringify(
    {
      campaigns,
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

export async function copyPublicCatalogToClipboard(data: AppData): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(exportPublicCatalogJson(data));
    return true;
  } catch {
    return false;
  }
}
