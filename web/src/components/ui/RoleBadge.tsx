import { cn } from "@/lib/cn";
import { ROLE_BADGE_CLASSES } from "@/lib/role-utils";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

export function RoleBadge({
  role,
  className,
}: {
  role: UserRole;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        ROLE_BADGE_CLASSES[role],
        className,
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
