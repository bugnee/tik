"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/context/RoleContext";

const CLIENT_ALLOWED_PREFIXES = ["/dashboard", "/login"];

export function ClientPortalGuard({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (activeRole !== "client") return;
    const allowed = CLIENT_ALLOWED_PREFIXES.some(
      (prefix) =>
        pathname === prefix || pathname.startsWith(`${prefix}?`),
    );
    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [activeRole, pathname, router]);

  return children;
}
