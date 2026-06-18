import { AppShell } from "@/components/layout/AppShell";
import { PartnerDetailPageClient } from "@/components/manage/PartnerDetailPageClient";

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell>
      <PartnerDetailPageClient partnerId={id} />
    </AppShell>
  );
}
