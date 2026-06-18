/** 마케팅 서비스 용어 — 내부 시트 기준 */
export interface MarketingGlossaryEntry {
  /** 약어·표기 */
  term: string;
  /** 정식 명칭 */
  officialName: string;
  description: string;
  /** 화면 라벨·채널 ID 등 매칭용 */
  aliases: string[];
}

export const MARKETING_GLOSSARY: MarketingGlossaryEntry[] = [
  {
    term: "최적블",
    officialName: "최적화 블로그",
    description:
      "네이버 블로그 상위 노출을 위해 키워드 최적화된 콘텐츠 작성 (검색 엔진 최적화 적용)",
    aliases: ["최적블로그", "optimized", "blog"],
  },
  {
    term: "인플",
    officialName: "인플루언서 마케팅",
    description:
      "소셜미디어 영향력 있는 크리에이터들을 통한 제품·서비스 홍보",
    aliases: ["인플루언서", "influencer"],
  },
  {
    term: "준최",
    officialName: "준최적화 블로그",
    description:
      "기본 키워드 최적화만 적용한 블로그 포스팅 (완전 최적화 대비 저비용)",
    aliases: ["준최적화", "준최적화블로그"],
  },
  {
    term: "체험단",
    officialName: "체험단 마케팅",
    description:
      "실제 고객이 제품·서비스를 체험 후 리뷰 작성하여 신뢰도 확보",
    aliases: ["experience", "체험단 모집"],
  },
  {
    term: "플레이스",
    officialName: "네이버 플레이스 관리",
    description:
      "네이버 지도 업체 정보 등록 및 리뷰 관리, 사진 업데이트 등",
    aliases: ["플레이스세팅", "네이버플레이스", "place"],
  },
  {
    term: "카드뉴스",
    officialName: "카드뉴스 제작",
    description:
      "SNS용 슬라이드 형식 홍보 콘텐츠 (인스타그램, 페이스북 등)",
    aliases: ["인스타카드", "insta_card"],
  },
  {
    term: "영수증리뷰",
    officialName: "영수증 인증 리뷰",
    description:
      "실제 구매 영수증을 인증하여 작성하는 진성 고객 리뷰 (신뢰도 높음)",
    aliases: ["영수증 리뷰"],
  },
  {
    term: "CPC",
    officialName: "클릭당 과금 광고",
    description:
      "Cost Per Click — 광고 클릭 시에만 비용이 발생하는 광고 방식",
    aliases: ["cpc"],
  },
  {
    term: "AI이미지",
    officialName: "AI 이미지 생성",
    description:
      "인공지능 도구로 제작한 맞춤형 홍보 이미지 (빠른 제작, 저비용)",
    aliases: ["AI 이미지"],
  },
  {
    term: "AI영상",
    officialName: "AI 영상 제작",
    description:
      "인공지능 도구로 제작한 홍보 영상 (텍스트→영상 자동 변환)",
    aliases: ["AI 영상"],
  },
  {
    term: "서비스",
    officialName: "기타 디자인 서비스",
    description:
      "배너, 메뉴판, 현수막, 리플렛 등 각종 홍보물 디자인 제작",
    aliases: ["디자인 서비스"],
  },
  {
    term: "플레이스대댓글",
    officialName: "플레이스 댓글 관리",
    description:
      "네이버 플레이스 리뷰에 업체가 직접 답글 달아 고객 소통 강화",
    aliases: ["플레이스 대댓글", "대댓글"],
  },
  {
    term: "KPI",
    officialName: "핵심성과지표",
    description:
      "Key Performance Indicator — 목표 달성도를 측정하는 핵심 지표 (방문자 수, 전환율, 매출 등)",
    aliases: ["kpi"],
  },
  {
    term: "ROI",
    officialName: "투자수익률",
    description:
      "Return On Investment — 마케팅 투자 대비 수익률 [(매출-비용)/비용×100%]",
    aliases: ["roi"],
  },
  {
    term: "CTR",
    officialName: "클릭률",
    description:
      "Click Through Rate — 광고 노출 대비 클릭 비율 [클릭 수/노출 수×100%] (광고 효율 측정)",
    aliases: ["ctr"],
  },
];

const TASK_CHANNEL_GLOSSARY_TERM: Record<string, string> = {
  blog: "최적블",
  influencer: "인플",
  experience: "체험단",
  insta_card: "카드뉴스",
};

const EXECUTION_TYPE_GLOSSARY_TERM: Record<string, string> = {
  optimized: "최적블",
  influencer: "인플",
  experience: "체험단",
};

const PARTNER_CATEGORY_GLOSSARY_TERM: Record<string, string> = {
  experience: "체험단",
  influencer: "인플",
  blog: "최적블",
};

function normalizeGlossaryKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

/** 라벨·약어·별칭으로 용어 설명 조회 */
export function lookupMarketingGlossary(
  input: string,
): MarketingGlossaryEntry | null {
  const key = normalizeGlossaryKey(input);
  if (!key) return null;

  for (const entry of MARKETING_GLOSSARY) {
    const candidates = [
      entry.term,
      entry.officialName,
      ...entry.aliases,
    ].map(normalizeGlossaryKey);

    if (candidates.some((candidate) => candidate === key)) {
      return entry;
    }
  }

  for (const entry of MARKETING_GLOSSARY) {
    const termKey = normalizeGlossaryKey(entry.term);
    if (key.includes(termKey) || termKey.includes(key)) {
      return entry;
    }
  }

  return null;
}

export function getGlossaryForTaskChannel(channel: {
  id: string;
  label: string;
}): MarketingGlossaryEntry | null {
  const mapped = TASK_CHANNEL_GLOSSARY_TERM[channel.id];
  if (mapped) {
    return lookupMarketingGlossary(mapped);
  }
  return lookupMarketingGlossary(channel.label);
}

export function getGlossaryForExecutionType(
  type: string,
): MarketingGlossaryEntry | null {
  const mapped = EXECUTION_TYPE_GLOSSARY_TERM[type];
  if (mapped) {
    return lookupMarketingGlossary(mapped);
  }
  return lookupMarketingGlossary(type);
}

export function getGlossaryForPartnerCategory(
  category: string,
): MarketingGlossaryEntry | null {
  const mapped = PARTNER_CATEGORY_GLOSSARY_TERM[category];
  if (mapped) {
    return lookupMarketingGlossary(mapped);
  }
  return lookupMarketingGlossary(category);
}
