import { AppShell } from "@/components/layout/AppShell";
import { ExpensesManager } from "@/components/manage/ExpensesManager";

export default function ExpensesPage() {
  return (
    <AppShell>
      <ExpensesManager />
    </AppShell>
  );
}
