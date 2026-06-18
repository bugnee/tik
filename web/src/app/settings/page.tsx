import { AppShell } from "@/components/layout/AppShell";
import { ExpenseCategoriesSettings } from "@/components/settings/ExpenseCategoriesSettings";
import { ExperienceFieldSettings } from "@/components/settings/ExperienceFieldSettings";
import { PartnerFilterSettings } from "@/components/settings/PartnerFilterSettings";
import { SampleDataResetPanel } from "@/components/settings/SampleDataResetPanel";
import { TaskChannelsSettings } from "@/components/settings/TaskChannelsSettings";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-10">
        <SampleDataResetPanel />
        <TaskChannelsSettings />
        <ExperienceFieldSettings />
        <PartnerFilterSettings />
        <ExpenseCategoriesSettings />
      </div>
    </AppShell>
  );
}
