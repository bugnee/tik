"use client";

import { cn } from "@/lib/cn";
import {
  getPartnerFilterBadgeClassName,
  getPartnerFilterLabel,
} from "@/lib/partner-filter-utils";
import type {
  PartnerCategory,
  PartnerFilterDefinition,
  TaskChannelDefinition,
} from "@/lib/types";

export function PartnerFilterBadge({
  filters,
  categoryId,
  taskChannels,
  className,
  label,
}: {
  filters: PartnerFilterDefinition[];
  categoryId: PartnerCategory;
  taskChannels?: TaskChannelDefinition[];
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        getPartnerFilterBadgeClassName(filters, categoryId, taskChannels),
        className,
      )}
    >
      {label ?? getPartnerFilterLabel(filters, categoryId)}
    </span>
  );
}
