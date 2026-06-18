"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider, useData } from "@/context/DataContext";
import { ThemeProvider } from "@/context/ThemeContext";

/** DataProvider + AuthProvider — layout 루트에서 한 번만 마운트 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <DataProvider>
        <AuthProvider>{children}</AuthProvider>
      </DataProvider>
    </ThemeProvider>
  );
}

/** 페이지 본문: 데이터 준비 후에만 렌더 (AuthGate·DataLoader 공통) */
export function AppReadyGate({
  children,
  message = "불러오는 중…",
}: {
  children: ReactNode;
  message?: string;
}) {
  const { hydrated } = useData();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-sm text-zinc-500">{message}</p>
        </div>
      </div>
    );
  }

  return children;
}
