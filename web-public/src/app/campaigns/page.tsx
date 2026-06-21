import { Suspense } from "react";
import CampaignsPageClient from "./CampaignsPageClient";

export default function CampaignsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-[var(--muted)]">불러오는 중…</div>
      }
    >
      <CampaignsPageClient />
    </Suspense>
  );
}
