"use client";

import {
  CLIENT_CONTRACT_FOCUS_RING,
  type ClientContractFocus,
} from "@/lib/client-portal-utils";
import { cn } from "@/lib/cn";

export function ClientContractFocusSection({
  id,
  focused,
  focus,
  children,
}: {
  id: string;
  focused: boolean;
  focus: ClientContractFocus;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className={cn(
        "scroll-mt-28 rounded-2xl transition-[box-shadow,ring] duration-500",
        focused &&
          cn(
            "ring-2 ring-offset-2 ring-offset-zinc-950",
            CLIENT_CONTRACT_FOCUS_RING[focus],
          ),
      )}
    >
      {children}
    </div>
  );
}
