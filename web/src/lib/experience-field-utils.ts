import type { AppData, ExperienceFieldDefinition } from "./types";

export const DEFAULT_EXPERIENCE_FIELDS: ExperienceFieldDefinition[] = [
  {
    id: "food",
    label: "맛집",
    executiveUserId: "u-exec-1",
    teamLeaderUserId: "u-leader-1",
    sortOrder: 1,
    isActive: true,
    isSystem: true,
  },
  {
    id: "beauty",
    label: "뷰티",
    executiveUserId: "u-exec-1",
    teamLeaderUserId: "u-leader-2",
    sortOrder: 2,
    isActive: true,
    isSystem: true,
  },
  {
    id: "travel",
    label: "여행",
    executiveUserId: "u-exec-1",
    teamLeaderUserId: "u-leader-2",
    sortOrder: 3,
    isActive: true,
    isSystem: true,
  },
  {
    id: "lifestyle",
    label: "라이프스타일",
    sortOrder: 4,
    isActive: true,
    isSystem: true,
  },
];

export function normalizeExperienceFields(
  fields?: ExperienceFieldDefinition[],
): ExperienceFieldDefinition[] {
  if (!fields?.length) return [...DEFAULT_EXPERIENCE_FIELDS];

  const merged: ExperienceFieldDefinition[] = DEFAULT_EXPERIENCE_FIELDS.map(
    (def) => {
      const saved = fields.find((f) => f.id === def.id);
      return saved ? { ...def, ...saved, isSystem: def.isSystem } : def;
    },
  );

  for (const field of fields) {
    if (!merged.some((f) => f.id === field.id)) {
      merged.push(field);
    }
  }

  return merged.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getSortedExperienceFields(
  fields: ExperienceFieldDefinition[],
): ExperienceFieldDefinition[] {
  return [...fields].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getActiveExperienceFields(
  fields: ExperienceFieldDefinition[],
): ExperienceFieldDefinition[] {
  return getSortedExperienceFields(fields).filter((f) => f.isActive);
}

export function getExperienceFieldLabel(
  fields: ExperienceFieldDefinition[],
  idOrLabel?: string | null,
): string {
  if (!idOrLabel) return "-";
  const field = resolveExperienceField(fields, idOrLabel);
  return field?.label ?? idOrLabel;
}

export function resolveExperienceField(
  fields: ExperienceFieldDefinition[],
  idOrLabel?: string | null,
): ExperienceFieldDefinition | undefined {
  if (!idOrLabel) return undefined;
  return fields.find((f) => f.id === idOrLabel || f.label === idOrLabel);
}

export function getDefaultExperienceCategoryId(
  fields: ExperienceFieldDefinition[],
): string {
  return getActiveExperienceFields(fields)[0]?.id ?? "food";
}

export function createExperienceFieldInput(
  label: string,
  fields: ExperienceFieldDefinition[],
): ExperienceFieldDefinition {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "");
  let id = base || `field-${Date.now()}`;
  let n = 1;
  while (fields.some((f) => f.id === id)) {
    id = `${base || "field"}-${n++}`;
  }
  const maxOrder = fields.reduce((m, f) => Math.max(m, f.sortOrder), 0);
  return {
    id,
    label: label.trim() || "새 분야",
    sortOrder: maxOrder + 1,
    isActive: true,
  };
}

export function formatExperienceFieldAssignees(
  data: Pick<AppData, "users">,
  field?: ExperienceFieldDefinition,
): string {
  if (!field) return "-";
  const exec = field.executiveUserId
    ? data.users.find((u) => u.id === field.executiveUserId)?.name
    : null;
  const leader = field.teamLeaderUserId
    ? data.users.find((u) => u.id === field.teamLeaderUserId)?.name
    : null;
  if (!exec && !leader) return "미지정";
  return [exec && `임원 ${exec}`, leader && `팀장 ${leader}`]
    .filter(Boolean)
    .join(" · ");
}
