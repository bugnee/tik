"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  PendingApprovalScreen,
  RejectedApprovalScreen,
} from "./PendingApprovalScreen";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (status === "pending") {
    return <PendingApprovalScreen />;
  }

  if (status === "rejected") {
    return <RejectedApprovalScreen />;
  }

  return children;
}
