import type { PublicPortalStore } from "@tripitkorea/shared/public-campaign";
import {
  PUBLIC_PORTAL_STORAGE_KEY,
  createDefaultPublicPortalStore,
} from "@tripitkorea/shared/public-campaign";

export async function loadPublicPortalStore(): Promise<PublicPortalStore> {
  if (typeof window === "undefined") {
    return createDefaultPublicPortalStore();
  }

  try {
    const raw = localStorage.getItem(PUBLIC_PORTAL_STORAGE_KEY);
    if (!raw) return createDefaultPublicPortalStore();
    const parsed = JSON.parse(raw) as PublicPortalStore;
    if (parsed.version !== 1) return createDefaultPublicPortalStore();
    return parsed;
  } catch {
    return createDefaultPublicPortalStore();
  }
}

export async function savePublicPortalStore(
  store: PublicPortalStore,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(PUBLIC_PORTAL_STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

/** ERP에서 복사한 카탈로그 JSON 가져오기 */
export function importCatalogFromJson(json: string): PublicPortalStore | null {
  try {
    const parsed = JSON.parse(json) as
      | PublicPortalStore
      | { campaigns?: PublicPortalStore["campaigns"] };

    if ("version" in parsed && parsed.version === 1) {
      return parsed as PublicPortalStore;
    }

    if (parsed.campaigns?.length) {
      const base = createDefaultPublicPortalStore();
      return {
        ...base,
        campaigns: parsed.campaigns,
        updatedAt: new Date().toISOString(),
      };
    }

    return null;
  } catch {
    return null;
  }
}
