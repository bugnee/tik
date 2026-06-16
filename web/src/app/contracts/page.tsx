import { AppShell } from "@/components/layout/AppShell";
import { ContractsManager } from "@/components/manage/ContractsManager";

export default function ContractsPage() {
  return (
    <AppShell>
      <ContractsManager />
    </AppShell>
  );
}
