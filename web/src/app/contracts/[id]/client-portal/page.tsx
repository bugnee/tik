import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ClientDashboard } from "@/components/dashboard/ClientDashboard";

export default async function ContractClientPortalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell>
      <div className="mb-4">
        <Link
          href={`/contracts/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          계약 상세로
        </Link>
      </div>
      <ClientDashboard contractId={id} previewMode />
    </AppShell>
  );
}
