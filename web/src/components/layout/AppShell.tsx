"use client";

import { AuthGate } from "@/components/auth/AuthGate";
import { RoleProvider } from "@/context/RoleContext";
import { AppReadyGate } from "./Providers";
import { MobileBottomNav } from "./MobileBottomNav";
import { Navbar } from "./Navbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppReadyGate>
      <AuthGate>
        <RoleProvider>
          <div className="relative min-h-screen bg-[var(--background)]">
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
              <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-emerald-600/5 blur-[120px] dark:bg-emerald-600/5" />
              <div className="absolute -right-40 top-1/3 h-[400px] w-[400px] rounded-full bg-cyan-600/5 blur-[100px]" />
              <div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/3 blur-[100px]" />
            </div>

            <Navbar />

            <main className="relative mx-auto max-w-[1600px] px-3 py-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-6 md:pb-6 lg:px-8 lg:py-8">
              {children}
            </main>

            <MobileBottomNav />
          </div>
        </RoleProvider>
      </AuthGate>
    </AppReadyGate>
  );
}
