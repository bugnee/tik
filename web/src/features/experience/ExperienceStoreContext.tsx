"use client";

import { createContext, useContext } from "react";
import type { ExperienceStore } from "@/features/experience/create-experience-store";

const ExperienceStoreContext = createContext<ExperienceStore | null>(null);

export function ExperienceStoreProvider({
  value,
  children,
}: {
  value: ExperienceStore;
  children: React.ReactNode;
}) {
  return (
    <ExperienceStoreContext.Provider value={value}>
      {children}
    </ExperienceStoreContext.Provider>
  );
}

export function useExperienceStore(): ExperienceStore {
  const store = useContext(ExperienceStoreContext);
  if (!store) {
    throw new Error(
      "useExperienceStore는 ExperienceStoreProvider 내부에서 사용하세요.",
    );
  }
  return store;
}
