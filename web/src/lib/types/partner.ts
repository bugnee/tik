import type { TaskChannelAccent } from "@/lib/types/work-order";

/** 파트너사 집행 분야 */
export type PartnerCategory = string;

export type PartnerStatus = "active" | "ended" | "blocked";

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  active: "활동파트너",
  ended: "종료파트너",
  blocked: "불가파트너",
};

/** 원가·집행 분야별 파트너사 필터 (설정에서 관리) */
export interface PartnerFilterDefinition {
  id: PartnerCategory;
  label: string;
  sortOrder: number;
  isActive: boolean;
  isSystem?: boolean;
  /** 집행 항목·파트너 목록 등 전역 배지 색상 */
  accentColor?: TaskChannelAccent;
}

export type PartnerFilterDefinitionInput = Omit<
  PartnerFilterDefinition,
  "isSystem"
>;

export interface PartnerReferralLead {
  id: string;
  partnerId: string;
  clientName: string;
  memo: string;
  introducedAt: string;
  contractId?: string;
  estimatedMonthlyFee?: number;
}

export type PartnerReferralLeadInput = Omit<PartnerReferralLead, "id">;

/** 파트너 채널 링크 · 닉네임 (최대 3세트) */
export interface PartnerLinkSlot {
  url?: string;
  nickname?: string;
}

export interface Partner {
  id: string;
  companyName: string;
  categories: PartnerCategory[];
  contactName?: string;
  phone?: string;
  email?: string;
  /** 우리 조직 담당자 (실무·팀장 등) */
  internalManagerUserId?: string;
  bankName?: string;
  bankAccount: string;
  accountHolder: string;
  /** 파트너 링크 · 닉네임 (3세트) */
  linkSlots: PartnerLinkSlot[];
  /** 기본 단가 (건당/월, 원) — 참고용 */
  unitPrice?: number;
  /** 파트너 등록일 */
  registeredAt?: string;
  memo?: string;
  /** 파트너 주소 · 지역 (참고·검색용, 업무 진행 조건 아님) */
  address?: string;
  regionProvince?: string;
  regionCity?: string;
  /** 활동 · 종료 · 불가 (원가 등록은 활동파트너만) */
  status: PartnerStatus;
}
