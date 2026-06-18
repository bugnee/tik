import type {
  ExecutionType,
  ExpenseCategory,
  ExpenseCategoryDefinition,
  Partner,
  PartnerCategory,
  PartnerFilterDefinition,
  PartnerLinkSlot,
  PartnerStatus,
  WorkOrderCostLine,
} from "./types";
import { PARTNER_STATUS_LABELS } from "./types";
import { getPartnerFilterLabel } from "./partner-filter-utils";

export { PARTNER_STATUS_LABELS };

export const PARTNER_LINK_SLOT_COUNT = 3;

export function normalizePartnerLinkSlots(
  slots?: PartnerLinkSlot[],
): PartnerLinkSlot[] {
  return Array.from({ length: PARTNER_LINK_SLOT_COUNT }, (_, i) => {
    const url = slots?.[i]?.url?.trim();
    const nickname = slots?.[i]?.nickname?.trim();
    return {
      url: url || undefined,
      nickname: nickname || undefined,
    };
  });
}

export type LegacyPartnerInput = Omit<Partner, "status" | "linkSlots"> & {
  status?: PartnerStatus;
  isActive?: boolean;
  linkSlots?: PartnerLinkSlot[];
};

export function normalizePartner(raw: LegacyPartnerInput): Partner {
  const status: PartnerStatus =
    raw.status ?? (raw.isActive === false ? "ended" : "active");
  const { isActive: _removed, ...rest } = raw;
  return {
    ...rest,
    status,
    registeredAt: raw.registeredAt ?? undefined,
    bankName: raw.bankName?.trim() || undefined,
    linkSlots: normalizePartnerLinkSlots(raw.linkSlots),
  };
}

export function normalizePartners(partners: LegacyPartnerInput[]): Partner[] {
  return partners.map(normalizePartner);
}

export function isPartnerExpenseSelectable(partner: Partner): boolean {
  return partner.status === "active";
}

export function getPartnerStatusLabel(status: PartnerStatus): string {
  return PARTNER_STATUS_LABELS[status];
}

export function getPartnerStatusBadgeVariant(
  status: PartnerStatus,
): "success" | "warning" | "danger" | "default" {
  switch (status) {
    case "active":
      return "success";
    case "ended":
      return "warning";
    case "blocked":
      return "danger";
    default:
      return "default";
  }
}

export const PARTNER_CATEGORY_LABELS: Record<string, string> = {
  press: "기자단",
  experience: "체험단",
  influencer: "인플루언서",
  blog: "블로그",
  youtube: "유튜브",
  instagram: "인스타",
  clip: "클립",
  tiktok: "틱톡",
  referral: "리셀러",
};

export const PARTNER_CATEGORIES: PartnerCategory[] = [
  "press",
  "experience",
  "influencer",
  "blog",
  "youtube",
  "instagram",
  "clip",
  "tiktok",
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
    if (activeOnly && !isPartnerExpenseSelectable(p)) return false;
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
    case "youtube":
      return "youtube";
    case "instagram":
      return "instagram";
    case "clip":
      return "clip";
    case "tiktok":
      return "tiktok";
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
  if (!mapped) return partners.filter(isPartnerExpenseSelectable);
  return filterPartnersByCategory(partners, mapped);
}

export function getPartnerName(
  partners: Partner[],
  partnerId?: string,
): string {
  if (!partnerId) return "-";
  return partners.find((p) => p.id === partnerId)?.companyName ?? "-";
}

export function formatPartnerCategories(
  categories: PartnerCategory[],
  filters?: PartnerFilterDefinition[],
): string {
  return categories
    .map((c) =>
      filters?.length
        ? getPartnerFilterLabel(filters, c)
        : (PARTNER_CATEGORY_LABELS[c] ?? c),
    )
    .join(" · ");
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
  filters?: PartnerFilterDefinition[],
): string {
  const categoryLabel = forCategory
    ? filters?.length
      ? getPartnerFilterLabel(filters, forCategory)
      : (PARTNER_CATEGORY_LABELS[forCategory] ?? forCategory)
    : formatPartnerCategories(partner.categories, filters);
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
