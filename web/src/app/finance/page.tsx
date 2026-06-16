import { AppShell } from "@/components/layout/AppShell";
import { FinancePage } from "@/components/finance/FinancePage";

export default function FinanceRoute() {
  return (
    <AppShell>
      <FinancePage />
    </AppShell>
  );
}
