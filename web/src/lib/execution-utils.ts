import type { Execution, ExecutionInput, PostLinkEntry } from "./types";

export type DeadlineStage = "safe" | "warning" | "urgent" | "overdue";

export const DEADLINE_STAGE_LABELS: Record<DeadlineStage, string> = {
  safe: "여유",
  warning: "주의",
  urgent: "임박",
  overdue: "지연",
};

export const DEADLINE_STAGE_DESC: Record<DeadlineStage, string> = {
  safe: "마감 8일 이상",
  warning: "마감 4~7일",
  urgent: "마감 3일 이내",
  overdue: "마감 경과",
};

export type DeadlineStageFilter = DeadlineStage | "completed" | "all";

export const DEADLINE_STAGE_STYLES: Record<
  DeadlineStage | "completed",
  { border: string; bg: string; text: string }
> = {
  safe: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
  },
  warning: {
    border: "border-amber-500/40",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
  },
  urgent: {
    border: "border-orange-500/40",
    bg: "bg-orange-500/10",
    text: "text-orange-400",
  },
  overdue: {
    border: "border-rose-500/40",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
  },
  completed: {
    border: "border-cyan-500/40",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
  },
};

export function getDeadlineStageLabel(
  stage: DeadlineStage | "completed",
): string {
  if (stage === "completed") return "완료";
  return DEADLINE_STAGE_LABELS[stage];
}

export function getDeadlineStageBadgeVariant(
  stage: DeadlineStage | "completed",
): "success" | "warning" | "danger" | "info" {
  if (stage === "completed") return "info";
  if (stage === "safe") return "success";
  if (stage === "overdue") return "danger";
  return "warning";
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function newLinkId(): string {
  return `pl-${crypto.randomUUID().slice(0, 8)}`;
}

export function createEmptyPostLink(dueDate?: string): PostLinkEntry {
  return {
    id: newLinkId(),
    url: "",
    dueDate: dueDate ?? "",
    completedDate: "",
    enteredAt: todayISO(),
  };
}

/** legacy string[] → PostLinkEntry[] */
export function migratePostLinks(
  links: string[] | PostLinkEntry[] | unknown,
  fallbackDueDate?: string,
): PostLinkEntry[] {
  if (links == null) return [];

  const list = Array.isArray(links) ? links : [links];
  if (list.length === 0) return [];

  const result: PostLinkEntry[] = [];

  for (const entry of list) {
    if (entry == null) continue;

    if (typeof entry === "string") {
      const url = entry.trim();
      if (!url) continue;
      result.push({
        id: newLinkId(),
        url,
        dueDate: fallbackDueDate ?? "",
        completedDate: todayISO(),
        enteredAt: todayISO(),
      });
      continue;
    }

    if (typeof entry !== "object") continue;

    result.push({
      id: entry.id || newLinkId(),
      url: String(entry.url ?? "").trim(),
      dueDate: entry.dueDate ?? fallbackDueDate ?? "",
      completedDate: entry.completedDate ?? "",
      enteredAt: entry.enteredAt || todayISO(),
    });
  }

  return result;
}

export function normalizePostLinkEntries(
  links: PostLinkEntry[] | undefined,
  fallbackDueDate?: string,
): PostLinkEntry[] {
  const items =
    links && links.length > 0 ? links : [createEmptyPostLink(fallbackDueDate)];

  return items.map((link) => {
    const url = (link.url ?? "").trim();
    const enteredAt = link.enteredAt || todayISO();
    let completedDate = link.completedDate ?? "";

    if (url && !completedDate) {
      completedDate = todayISO();
    }
    if (!url) {
      completedDate = "";
    }

    return {
      ...link,
      url,
      dueDate: link.dueDate || fallbackDueDate || "",
      enteredAt,
      completedDate,
    };
  });
}

export function getValidPostLinks(
  links: string[] | PostLinkEntry[] | unknown,
  fallbackDueDate?: string,
): PostLinkEntry[] {
  return migratePostLinks(links, fallbackDueDate).filter((l) =>
    (l.url ?? "").trim(),
  );
}

export function getDeadlineStage(
  dueDate?: string,
  completedDate?: string,
  status?: Execution["status"],
  today = new Date(),
): DeadlineStage | "completed" {
  if (status === "completed" || completedDate) return "completed";
  if (!dueDate) return "safe";

  const due = new Date(`${dueDate}T00:00:00`);
  const now = new Date(today.toISOString().slice(0, 10) + "T00:00:00");
  const diffDays = Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "urgent";
  if (diffDays <= 7) return "warning";
  return "safe";
}

export function countByDeadlineStage(executions: Execution[]) {
  const counts: Record<DeadlineStage | "completed", number> = {
    safe: 0,
    warning: 0,
    urgent: 0,
    overdue: 0,
    completed: 0,
  };

  executions.forEach((e) => {
    const stage = getDeadlineStage(e.dueDate, e.completedDate, e.status);
    counts[stage]++;
  });

  return counts;
}

export function filterByDeadlineStage(
  executions: Execution[],
  stage: DeadlineStage | "completed" | "all",
): Execution[] {
  if (stage === "all") return executions;
  return executions.filter(
    (e) => getDeadlineStage(e.dueDate, e.completedDate, e.status) === stage,
  );
}

export function getExecutionCompletionRate(executions: Execution[]): number {
  if (executions.length === 0) return 0;
  const done = executions.reduce((s, e) => s + e.completedCount, 0);
  const target = executions.reduce((s, e) => s + e.targetCount, 0);
  if (target === 0) return 0;
  return Math.min(100, (done / target) * 100);
}

export function prepareExecutionInput(input: ExecutionInput): ExecutionInput {
  const migrated = migratePostLinks(
    input.postLinks as string[] | PostLinkEntry[] | undefined,
    input.dueDate,
  );
  const postLinks = normalizePostLinkEntries(migrated, input.dueDate);
  const validLinks = getValidPostLinks(postLinks);
  const enteredAt = input.enteredAt || todayISO();

  let completedDate = input.completedDate ?? "";
  if (
    input.status === "completed" ||
    (validLinks.length > 0 &&
      validLinks.length >= input.targetCount &&
      input.targetCount > 0)
  ) {
    completedDate = completedDate || todayISO();
  }

  return {
    ...input,
    postLinks,
    enteredAt,
    completedDate,
    completedCount:
      validLinks.length > 0 ? validLinks.length : input.completedCount,
    status:
      validLinks.length >= input.targetCount && input.targetCount > 0
        ? "completed"
        : validLinks.length > 0
          ? "in_progress"
          : input.status,
  };
}
