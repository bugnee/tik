"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  PublicCampaignApplication,
  PublicCampaignApplicationInput,
  PublicCampaignListing,
  PublicPortalStore,
} from "@tripitkorea/shared/public-campaign";
import {
  buildPublicCampaignSections,
  enrichListingApplicationCounts,
  filterPublicCampaigns,
} from "@tripitkorea/shared/public-campaign";
import {
  importCatalogFromJson,
  loadPublicPortalStore,
  savePublicPortalStore,
} from "@/lib/public-portal-storage";

interface PublicPortalContextValue {
  hydrated: boolean;
  store: PublicPortalStore;
  campaigns: PublicCampaignListing[];
  sections: ReturnType<typeof buildPublicCampaignSections>;
  applications: PublicCampaignApplication[];
  getCampaignById: (id: string) => PublicCampaignListing | undefined;
  hasApplied: (listingId: string, reviewerId: string) => boolean;
  applyToCampaign: (
    input: Omit<
      PublicCampaignApplicationInput,
      "reviewerId" | "reviewerName" | "reviewerEmail"
    > & {
      reviewerId: string;
      reviewerName: string;
      reviewerEmail: string;
    },
  ) => { ok: true } | { ok: false; reason: string };
  cancelApplication: (applicationId: string, reviewerId: string) => void;
  importCatalogJson: (json: string) => { ok: true } | { ok: false; reason: string };
}

const PublicPortalContext = createContext<PublicPortalContextValue | null>(null);

function nextApplicationId(): string {
  return `papp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function PublicPortalProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<PublicPortalStore | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadPublicPortalStore().then((loaded) => {
      if (cancelled) return;
      setStore(loaded);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !store) return;
    void savePublicPortalStore(store);
  }, [store, hydrated]);

  const campaigns = useMemo(() => {
    if (!store) return [];
    return filterPublicCampaigns(enrichListingApplicationCounts(store));
  }, [store]);

  const sections = useMemo(
    () => buildPublicCampaignSections(campaigns),
    [campaigns],
  );

  const getCampaignById = useCallback(
    (id: string) => campaigns.find((item) => item.id === id),
    [campaigns],
  );

  const hasApplied = useCallback(
    (listingId: string, reviewerId: string) => {
      if (!store) return false;
      return store.applications.some(
        (item) =>
          item.listingId === listingId &&
          item.reviewerId === reviewerId &&
          item.status !== "cancelled",
      );
    },
    [store],
  );

  const applyToCampaign = useCallback(
    (
      input: Omit<
        PublicCampaignApplicationInput,
        "reviewerId" | "reviewerName" | "reviewerEmail"
      > & {
        reviewerId: string;
        reviewerName: string;
        reviewerEmail: string;
      },
    ): { ok: true } | { ok: false; reason: string } => {
      if (!store) return { ok: false, reason: "데이터를 불러오는 중입니다." };

      const campaign = store.campaigns.find((item) => item.id === input.listingId);
      if (!campaign) return { ok: false, reason: "체험단을 찾을 수 없습니다." };

      const already = store.applications.some(
        (item) =>
          item.listingId === input.listingId &&
          item.reviewerId === input.reviewerId &&
          item.status !== "cancelled",
      );
      if (already) return { ok: false, reason: "이미 신청한 체험단입니다." };

      const now = new Date().toISOString();
      const application: PublicCampaignApplication = {
        id: nextApplicationId(),
        listingId: input.listingId,
        campaignId: input.campaignId ?? campaign.campaignId,
        reviewerId: input.reviewerId,
        reviewerName: input.reviewerName,
        reviewerEmail: input.reviewerEmail,
        channelHandle: input.channelHandle,
        message: input.message,
        preferredVisitDate: input.preferredVisitDate,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      };

      setStore((prev) =>
        prev
          ? {
              ...prev,
              applications: [application, ...prev.applications],
              updatedAt: now,
            }
          : prev,
      );

      return { ok: true };
    },
    [store],
  );

  const cancelApplication = useCallback((applicationId: string, reviewerId: string) => {
    const now = new Date().toISOString();
    setStore((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        applications: prev.applications.map((item) =>
          item.id === applicationId && item.reviewerId === reviewerId
            ? { ...item, status: "cancelled", updatedAt: now }
            : item,
        ),
        updatedAt: now,
      };
    });
  }, []);

  const importCatalogJson = useCallback((json: string) => {
    const imported = importCatalogFromJson(json);
    if (!imported) {
      return { ok: false as const, reason: "JSON 형식이 올바르지 않습니다." };
    }
    setStore((prev) =>
      prev
        ? {
            ...prev,
            campaigns: imported.campaigns,
            updatedAt: new Date().toISOString(),
          }
        : imported,
    );
    return { ok: true as const };
  }, []);

  const value = useMemo<PublicPortalContextValue | null>(() => {
    if (!store) return null;
    return {
      hydrated,
      store,
      campaigns,
      sections,
      applications: store.applications,
      getCampaignById,
      hasApplied,
      applyToCampaign,
      cancelApplication,
      importCatalogJson,
    };
  }, [
    store,
    hydrated,
    campaigns,
    sections,
    getCampaignById,
    hasApplied,
    applyToCampaign,
    cancelApplication,
    importCatalogJson,
  ]);

  if (!value) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--muted)]">
        불러오는 중…
      </div>
    );
  }

  return (
    <PublicPortalContext.Provider value={value}>
      {children}
    </PublicPortalContext.Provider>
  );
}

export function usePublicPortal() {
  const ctx = useContext(PublicPortalContext);
  if (!ctx) {
    throw new Error("usePublicPortal must be used within PublicPortalProvider");
  }
  return ctx;
}
