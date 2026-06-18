"use client";

import { cn } from "@/lib/cn";
import { LEADER_MANAGED_CONTRACT_NOTE } from "@/lib/contract-access-utils";

export function LeaderManagedContractNotice({
  className,
}: {
  className?: string;
}) {
  return (
    <p
      className={cn(
        "rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-200/80",
        className,
      )}
    >
      {LEADER_MANAGED_CONTRACT_NOTE}
    </p>
  );
}
