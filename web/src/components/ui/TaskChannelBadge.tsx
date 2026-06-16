"use client";

import { cn } from "@/lib/cn";
import type { AppData, ExecutionType } from "@/lib/types";
import {
  getExecutionTypeBadgeClassName,
  getExecutionTypeLabel,
  getTaskChannelBadgeClassName,
  getWorkOrderTaskLabel,
} from "@/lib/task-channel-utils";

export function TaskChannelBadge({
  data,
  taskType,
  executionType,
  label,
  className,
}: {
  data: AppData;
  taskType?: string;
  executionType?: ExecutionType;
  label?: string;
  className?: string;
}) {
  const resolvedLabel =
    label ??
    (taskType
      ? getWorkOrderTaskLabel(data, taskType)
      : executionType
        ? getExecutionTypeLabel(data, executionType)
        : "-");

  const badgeClass = taskType
    ? getTaskChannelBadgeClassName(data.taskChannels, taskType)
    : executionType
      ? getExecutionTypeBadgeClassName(data.taskChannels, executionType)
      : getTaskChannelBadgeClassName(data.taskChannels, "blog");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeClass,
        className,
      )}
    >
      {resolvedLabel}
    </span>
  );
}
