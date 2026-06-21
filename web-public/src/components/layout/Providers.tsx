"use client";

import { PublicAuthProvider } from "@/context/PublicAuthContext";
import { PublicPortalProvider } from "@/context/PublicPortalContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PublicPortalProvider>
      <PublicAuthProvider>{children}</PublicAuthProvider>
    </PublicPortalProvider>
  );
}
