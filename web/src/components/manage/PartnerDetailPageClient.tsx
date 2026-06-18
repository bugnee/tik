"use client";

import { PartnerDetailView } from "@/components/manage/PartnerDetailView";
import { useRole } from "@/context/RoleContext";

export function PartnerDetailPageClient({ partnerId }: { partnerId: string }) {
  const { activeRole, currentUser } = useRole();
  const isOwnPartnerPortal =
    activeRole === "partner" && currentUser.partnerId === partnerId;

  return (
    <PartnerDetailView
      partnerId={partnerId}
      variant={isOwnPartnerPortal ? "portal" : "admin"}
    />
  );
}
