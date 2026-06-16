import type {
  ExecutionType,
  ExpenseCategory,
  ExpenseCategoryDefinition,
  Partner,
  PartnerCategory,
  WorkOrderCostLine,
} from "./types";

export const PARTNER_CATEGORY_LABELS: Record<PartnerCategory, string> = {
  press: "기자단",
  experience: "체험단",
  influencer: "인플루언서",
  blog: "블로그",
  referral: "리셀러",
};

export const PARTNER_CATEGORIES: PartnerCategory[] = [
  "press",
  "experience",
  "influencer",
  "blog",
  "referral",
];

export function partnerHasCategory(
  partner: Partner,
  category: PartnerCategory,
): boolean {
  return partner.categories.includes(category);
}

export function filterPartnersByCategory(
  partners: Partner[],
  category: PartnerCategory | "all",
  activeOnly = true,
): Partner[] {
  return partners.filter((p) => {
    if (activeOnly && !p.isActive) return false;
    if (category === "all") return true;
    return partnerHasCategory(p, category);
  });
}

export function expenseCategoryToPartnerCategory(
  category: ExpenseCategory,
  definitions?: ExpenseCategoryDefinition[],
): PartnerCategory | null {
  if (definitions?.length) {
    const def = definitions.find((d) => d.id === category);
    if (def && "partnerCategory" in def) {
      return def.partnerCategory ?? null;
    }
  }
  switch (category) {
    case "press":
      return "press";
    case "experience":
      return "experience";
    case "influencer":
      return "influencer";
    case "other":
      return "blog";
    case "expense":
      return null;
    default:
      return null;
  }
}

export function filterPartnersForExpenseCategory(
  partners: Partner[],
  category: ExpenseCategory,
  definitions?: ExpenseCategoryDefinition[],
): Partner[] {
  const mapped = expenseCategoryToPartnerCategory(category, definitions);
  if (!mapped) return partners.filter((p) => p.isActive);
  return filterPartnersByCategory(partners, mapped);
}

export function getPartnerName(
  partners: Partner[],
  partnerId?: string,
): string {
  if (!partnerId) return "-";
  return partners.find((p) => p.id === partnerId)?.companyName ?? "-";
}

export function formatPartnerCategories(categories: PartnerCategory[]): string {
  return categories.map((c) => PARTNER_CATEGORY_LABELS[c]).join(" · ");
}

export function executionTypeToPartnerCategory(
  type: ExecutionType,
): PartnerCategory {
  if (type === "optimized") return "blog";
  return type;
}

export function getPartnerByUserId(
  partners: Partner[],
  partnerId?: string,
): Partner | undefined {
  if (!partnerId) return undefined;
  return partners.find((p) => p.id === partnerId);
}

export function isReferralPartnerUser(
  partners: Partner[],
  user?: { role?: string; partnerId?: string },
): boolean {
  if (user?.role !== "partner" || !user.partnerId) return false;
  const partner = getPartnerByUserId(partners, user.partnerId);
  return partner ? partnerHasCategory(partner, "referral") : false;
}

/** 파트너 선택 옵션 — 분야 · 참고 단가 */
export function formatPartnerSelectLabel(
  partner: Partner,
  forCategory?: PartnerCategory,
): string {
  const categoryLabel = forCategory
    ? PARTNER_CATEGORY_LABELS[forCategory]
    : formatPartnerCategories(partner.categories);
  const priceHint =
    partner.unitPrice && partner.unitPrice > 0
      ? ` · ${partner.unitPrice.toLocaleString()}원`
      : "";
  return `${partner.companyName} (${categoryLabel}${priceHint})`;
}

export function applyPartnerUnitPriceToCostLines(
  partner: Partner,
  lines: WorkOrderCostLine[],
): WorkOrderCostLine[] {
  if (!partner.unitPrice || partner.unitPrice <= 0) return lines;
  return lines.map((line, idx) =>
    idx === 0
      ? { ...line, amount: partner.unitPrice! }
      : { ...line, amount: 0 },
  );
}
