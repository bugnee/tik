import type {
  ExpenseCategory,
  ExpenseCategoryDefinition,
  ExpenseCategoryInput,
  PartnerCategory,
} from "./types";

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryDefinition[] = [
  {
    id: "press",
    label: "기자단",
    sortOrder: 1,
    isActive: true,
    isSystem: true,
    partnerCategory: "press",
  },
  {
    id: "experience",
    label: "체험단",
    sortOrder: 2,
    isActive: true,
    isSystem: true,
    partnerCategory: "experience",
  },
  {
    id: "influencer",
    label: "인플루언서",
    sortOrder: 3,
    isActive: true,
    isSystem: true,
    partnerCategory: "influencer",
  },
  {
    id: "youtube",
    label: "유튜브",
    sortOrder: 4,
    isActive: true,
    isSystem: true,
    partnerCategory: "youtube",
  },
  {
    id: "instagram",
    label: "인스타",
    sortOrder: 5,
    isActive: true,
    isSystem: true,
    partnerCategory: "instagram",
  },
  {
    id: "clip",
    label: "클립",
    sortOrder: 6,
    isActive: true,
    isSystem: true,
    partnerCategory: "clip",
  },
  {
    id: "tiktok",
    label: "틱톡",
    sortOrder: 7,
    isActive: true,
    isSystem: true,
    partnerCategory: "tiktok",
  },
  {
    id: "other",
    label: "기타",
    sortOrder: 8,
    isActive: true,
    isSystem: true,
    partnerCategory: "blog",
  },
  {
    id: "expense",
    label: "경비",
    sortOrder: 99,
    isActive: true,
    partnerCategory: null,
  },
];

const LEGACY_PARTNER_MAP: Record<string, PartnerCategory | null> = {
  press: "press",
  experience: "experience",
  influencer: "influencer",
  youtube: "youtube",
  instagram: "instagram",
  clip: "clip",
  tiktok: "tiktok",
  other: "blog",
  expense: null,
};

export function normalizeExpenseCategories(
  categories?: ExpenseCategoryDefinition[],
): ExpenseCategoryDefinition[] {
  if (!categories?.length) return [...DEFAULT_EXPENSE_CATEGORIES];

  const merged: ExpenseCategoryDefinition[] = DEFAULT_EXPENSE_CATEGORIES.map(
    (def) => {
      const saved = categories.find((c) => c.id === def.id);
      return saved ? { ...def, ...saved, isSystem: def.isSystem } : def;
    },
  );

  for (const cat of categories) {
    if (!DEFAULT_EXPENSE_CATEGORIES.some((d) => d.id === cat.id)) {
      merged.push(cat);
    }
  }

  return merged.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getSortedExpenseCategories(
  categories: ExpenseCategoryDefinition[],
): ExpenseCategoryDefinition[] {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getActiveExpenseCategories(
  categories: ExpenseCategoryDefinition[],
): ExpenseCategoryDefinition[] {
  return getSortedExpenseCategories(categories).filter((c) => c.isActive);
}

export function getExpenseCategoryLabel(
  categories: ExpenseCategoryDefinition[],
  id: ExpenseCategory,
): string {
  return (
    categories.find((c) => c.id === id)?.label ??
    DEFAULT_EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ??
    id
  );
}

export function getExpenseCategoryPartnerCategory(
  categories: ExpenseCategoryDefinition[],
  id: ExpenseCategory,
): PartnerCategory | null {
  const def = categories.find((c) => c.id === id);
  if (def && "partnerCategory" in def) {
    return def.partnerCategory ?? null;
  }
  return LEGACY_PARTNER_MAP[id] ?? null;
}

export function slugifyExpenseCategoryId(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣_-]/g, "")
    .slice(0, 24);
  return base || `exp-${Date.now()}`;
}

export function createExpenseCategoryInput(
  label: string,
  categories: ExpenseCategoryDefinition[],
): ExpenseCategoryInput {
  let id = slugifyExpenseCategoryId(label);
  let n = 1;
  while (categories.some((c) => c.id === id)) {
    id = `${slugifyExpenseCategoryId(label)}-${n++}`;
  }
  const maxOrder = categories.reduce((m, c) => Math.max(m, c.sortOrder), 0);
  return {
    id,
    label,
    sortOrder: maxOrder + 1,
    isActive: true,
    partnerCategory: null,
  };
}
