/** 공개 체험단 상세 — 모집 페이지 콘텐츠 */

export interface PublicCampaignMissionItem {
  id: string;
  label: string;
}

/** 체험 미션 (사진·글자수·지도·키워드 등) */
export interface PublicCampaignMissionSpec {
  minPhotos?: number;
  minWords?: number;
  requireMapLink?: boolean;
  requireSponsorshipNote?: boolean;
  requireKeywords?: boolean;
  /** 세부 미션 (매장·음식·메뉴판 촬영 등) */
  items?: PublicCampaignMissionItem[];
}

/** ERP 입력 → 공개 상세 페이지 */
export interface PublicCampaignDetailContent {
  /** 진행자(업주) */
  hostName?: string;
  /** 제공 서비스/제품 상세 */
  providedService?: string;
  /** 혜택 금액 표시 (예: 50,000원) */
  benefitAmountLabel?: string;
  /** 썸네일 URL */
  thumbnailUrl?: string;
  /** 주소 */
  address?: string;
  /** 지도 임베드 URL (네이버·카카오 등) */
  mapEmbedUrl?: string;
  /** 방문·예약 안내 (불릿) */
  visitReservationLines?: string[];
  /** 키워드 안내 */
  keywords?: string[];
  /** 참여 방법 (상단 안내 박스) */
  participationSteps?: string[];
  /** 체험 미션 */
  mission?: PublicCampaignMissionSpec;
  /** 필수 확인 사항 */
  checklist?: string[];
  /** 신청 가능 방문일 (YYYY-MM-DD) */
  availableVisitDates?: string[];
}

export function createDefaultPublicCampaignDetail(): PublicCampaignDetailContent {
  return {
    participationSteps: [
      "STEP 1. 체험단 조건·미션을 확인하세요.",
      "STEP 2. 방문 가능 일정을 선택하세요.",
      "STEP 3. 신청하기 버튼으로 지원하세요.",
    ],
    mission: {
      minPhotos: 8,
      minWords: 300,
      requireMapLink: true,
      requireSponsorshipNote: true,
      requireKeywords: true,
      items: [
        { id: "interior", label: "매장 내부 사진" },
        { id: "food", label: "음식 사진" },
        { id: "menu", label: "메뉴판 사진" },
      ],
    },
    checklist: [
      "선정 후 무단 취소 불가",
      "리뷰 게시 후 6개월 이상 유지",
      "협찬/체험단 문구 필수 표기",
    ],
  };
}

/** 데모 상세 — 탐라육해 인계점 */
export const SAMPLE_TAMRA_YUKHAE_DETAIL: PublicCampaignDetailContent = {
  hostName: "탐라육해 인계점",
  providedService: "5만원 상당 식사권 (2인 기준 코스 메뉴)",
  benefitAmountLabel: "50,000원",
  thumbnailUrl:
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop",
  address: "경기도 수원시 팔달구 인계동 1234-5",
  visitReservationLines: [
    "방문 가능: 화~금 17:00~24:00, 토·일 12:00~22:00",
    "예약 필수 · 당일 17:00 이전 전화 예약",
    "2인 방문 기준 · 추가 인원 시 사전 협의",
  ],
  keywords: ["인계동 맛집", "수원 맛집", "수원 고기집", "인계동 고기집"],
  participationSteps: [
    "STEP 1. 체험단 조건·미션·키워드를 확인하세요.",
    "STEP 2. 오른쪽 달력에서 방문 가능 일정을 선택하세요.",
    "STEP 3. 신청하기를 눌러 지원을 완료하세요.",
  ],
  mission: {
    minPhotos: 8,
    minWords: 300,
    requireMapLink: true,
    requireSponsorshipNote: true,
    requireKeywords: true,
    items: [
      { id: "interior", label: "매장 내부 사진" },
      { id: "food", label: "음식 사진" },
      { id: "menu", label: "메뉴판 사진" },
      { id: "review", label: "상세 후기 작성" },
    ],
  },
  checklist: [
    "선정 후 일정 변경·취소 불가",
    "리뷰는 게시 후 6개월 이상 유지",
    "체험단·협찬 문구 필수 표기",
    "타인에게 양도·재판매 불가",
  ],
  availableVisitDates: [
    "2026-06-22",
    "2026-06-23",
    "2026-06-24",
    "2026-06-25",
    "2026-06-26",
    "2026-06-27",
    "2026-06-28",
  ],
};
