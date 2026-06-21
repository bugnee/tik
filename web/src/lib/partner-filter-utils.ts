import type {
  PartnerCategory,
  PartnerFilterDefinition,
  TaskChannelAccent,
  TaskChannelDefinition,
} from "./types";
import {
  TASK_CHANNEL_ACCENT_LABELS,
  TASK_CHANNEL_BADGE_CLASSES,
} from "./task-channel-utils";

export const DEFAULT_PARTNER_FILTER_ACCENTS: Record<string, TaskChannelAccent> =
  {
    press: "sky",
    experience: "amber",
    influencer: "violet",
    blog: "cyan",
    youtube: "rose",
    instagram: "orange",
    clip: "lime",
    tiktok: "emerald",
    referral: "sky",
  };

export const DEFAULT_PARTNER_FILTERS: PartnerFilterDefinition[] = [
  {
    id: "press",
    label: "기자단",
    sortOrder: 1,
    isActive: true,
    isSystem: true,
    accentColor: "sky",
  },
  {
    id: "experience",
    label: "체험단",
    sortOrder: 2,
    isActive: true,
    isSystem: true,
    accentColor: "amber",
  },
  {
    id: "influencer",
    label: "인플루언서",
    sortOrder: 3,
    isActive: true,
    isSystem: true,
    accentColor: "violet",
  },
  {
    id: "blog",
    label: "블로그",
    sortOrder: 4,
    isActive: true,
    isSystem: true,
    accentColor: "cyan",
  },
  {
    id: "youtube",
    label: "유튜브",
    sortOrder: 5,
    isActive: true,
    isSystem: true,
    accentColor: "rose",
  },
  {
    id: "instagram",
    label: "인스타",
    sortOrder: 6,
    isActive: true,
    isSystem: true,
    accentColor: "orange",
  },
  {
    id: "clip",
    label: "클립",
    sortOrder: 7,
    isActive: true,
    isSystem: true,
    accentColor: "lime",
  },
  {
    id: "tiktok",
    label: "틱톡",
    sortOrder: 8,
    isActive: true,
    isSystem: true,
    accentColor: "emerald",
  },
  {
    id: "referral",
    label: "리셀러",
    sortOrder: 99,
    isActive: true,
    isSystem: true,
    accentColor: "rose",
  },
];

export function normalizePartnerFilters(
  filters?: PartnerFilterDefinition[],
): PartnerFilterDefinition[] {
  if (!filters?.length) return [...DEFAULT_PARTNER_FILTERS];

  const merged: PartnerFilterDefinition[] = DEFAULT_PARTNER_FILTERS.map(
    (def) => {
      const saved = filters.find((f) => f.id === def.id);
      return saved
        ? {
            ...def,
            ...saved,
            isSystem: def.isSystem,
            accentColor: saved.accentColor ?? def.accentColor,
          }
        : def;
    },
  );

  for (const filter of filters) {
    if (!DEFAULT_PARTNER_FILTERS.some((d) => d.id === filter.id)) {
      merged.push(filter);
    }
  }

  return merged.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getPartnerFilterAccent(
  filters: PartnerFilterDefinition[],
  id: PartnerCategory,
  taskChannels?: TaskChannelDefinition[],
): TaskChannelAccent {
  const filter = filters.find((f) => f.id === id);
  if (filter?.accentColor) return filter.accentColor;

  if (taskChannels?.length) {
    const linked = taskChannels.find(
      (c) => c.partnerCategory === id && c.isActive && c.accentColor,
    );
    if (linked?.accentColor) return linked.accentColor;
  }

  return DEFAULT_PARTNER_FILTER_ACCENTS[id] ?? "emerald";
}

export function getPartnerFilterBadgeClassName(
  filters: PartnerFilterDefinition[],
  id: PartnerCategory,
  taskChannels?: TaskChannelDefinition[],
): string {
  return TASK_CHANNEL_BADGE_CLASSES[
    getPartnerFilterAccent(filters, id, taskChannels)
  ];
}

export function getPartnerFilterAccentLabel(
  filters: PartnerFilterDefinition[],
  id: PartnerCategory,
  taskChannels?: TaskChannelDefinition[],
): string {
  return TASK_CHANNEL_ACCENT_LABELS[
    getPartnerFilterAccent(filters, id, taskChannels)
  ];
}

export function getSortedPartnerFilters(
  filters: PartnerFilterDefinition[],
): PartnerFilterDefinition[] {
  return [...filters].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getActivePartnerFilters(
  filters: PartnerFilterDefinition[],
): PartnerFilterDefinition[] {
  return getSortedPartnerFilters(filters).filter((f) => f.isActive);
}

export function getPartnerFilterLabel(
  filters: PartnerFilterDefinition[],
  id?: PartnerCategory | null,
): string {
  if (!id) return "없음";
  return (
    filters.find((f) => f.id === id)?.label ??
    DEFAULT_PARTNER_FILTERS.find((f) => f.id === id)?.label ??
    id
  );
}

export function getPartnerFilterSelectOptions(
  filters: PartnerFilterDefinition[],
  includeNone = true,
): { value: string; label: string }[] {
  const options = getActivePartnerFilters(filters).map((f) => ({
    value: f.id,
    label: f.label,
  }));
  if (includeNone) {
    return [{ value: "", label: "없음 (경비 · 직접입력)" }, ...options];
  }
  return options;
}

export function slugifyPartnerFilterId(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣_-]/g, "")
    .slice(0, 24);
  return base || `pf-${Date.now()}`;
}

export function createPartnerFilterInput(
  label: string,
  filters: PartnerFilterDefinition[],
): Omit<PartnerFilterDefinition, "isSystem"> {
  let id = slugifyPartnerFilterId(label);
  let n = 1;
  while (filters.some((f) => f.id === id)) {
    id = `${slugifyPartnerFilterId(label)}-${n++}`;
  }
  const maxOrder = filters.reduce((m, f) => Math.max(m, f.sortOrder), 0);
  return {
    id,
    label,
    sortOrder: maxOrder + 1,
    isActive: true,
    accentColor: "emerald",
  };
}

export function partnerFilterLabelsRecord(
  filters: PartnerFilterDefinition[],
): Record<string, string> {
  return Object.fromEntries(filters.map((f) => [f.id, f.label]));
}
