"use client";

import { useData } from "@/context/DataContext";

export function DataLoader({ children }: { children: React.ReactNode }) {
  const { hydrated } = useData();

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-zinc-500">데이터 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
