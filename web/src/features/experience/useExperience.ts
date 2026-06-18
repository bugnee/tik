"use client";

import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { useExperienceStore } from "@/features/experience/ExperienceStoreContext";
import type { ExperienceStore } from "@/features/experience/create-experience-store";

export function useExperience(): ExperienceStore & {
  experienceCampaigns: ReturnType<typeof useData>["experienceCampaigns"];
  experiencePartnerSlots: ReturnType<typeof useData>["experiencePartnerSlots"];
  experienceParticipationProposals: ReturnType<
    typeof useData
  >["experienceParticipationProposals"];
  experienceFieldDefinitions: ReturnType<
    typeof useData
  >["experienceFieldDefinitions"];
} {
  const data = useData();
  const store = useExperienceStore();
  return useMemo(
    () => ({
      experienceCampaigns: data.experienceCampaigns,
      experiencePartnerSlots: data.experiencePartnerSlots,
      experienceParticipationProposals: data.experienceParticipationProposals,
      experienceFieldDefinitions: data.experienceFieldDefinitions,
      ...store,
    }),
    [
      data.experienceCampaigns,
      data.experiencePartnerSlots,
      data.experienceParticipationProposals,
      data.experienceFieldDefinitions,
      store,
    ],
  );
}
