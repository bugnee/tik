import { AppShell } from "@/components/layout/AppShell";
import { ExpenseCategoriesSettings } from "@/components/settings/ExpenseCategoriesSettings";
import { TaskChannelsSettings } from "@/components/settings/TaskChannelsSettings";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-10">
        <TaskChannelsSettings />
        <ExpenseCategoriesSettings />
      </div>
    </AppShell>
  );
}
