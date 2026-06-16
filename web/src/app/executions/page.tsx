import { AppShell } from "@/components/layout/AppShell";
import { ExecutionProgressManager } from "@/components/work-orders/ExecutionProgressManager";

export default function ExecutionsPage() {
  return (
    <AppShell>
      <ExecutionProgressManager />
    </AppShell>
  );
}
