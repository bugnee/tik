import { AppShell } from "@/components/layout/AppShell";
import { DashboardByRole } from "@/components/dashboard/DashboardByRole";

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardByRole />
    </AppShell>
  );
}
