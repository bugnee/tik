import { AppShell } from "@/components/layout/AppShell";
import { UsersManager } from "@/components/manage/UsersManager";

export default function UsersPage() {
  return (
    <AppShell>
      <UsersManager />
    </AppShell>
  );
}
