import { AppShell } from "@/components/layout/AppShell";
import { ContractDetailView } from "@/components/contracts/ContractDetailView";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell>
      <ContractDetailView contractId={id} />
    </AppShell>
  );
}
