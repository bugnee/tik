import type {
  AppData,
  Contract,
  ExperienceCampaign,
  ExperienceSchedulingStatus,
  PostLinkEntry,
  PostLinkOpinion,
} from "./types";

/** 실제 운영 중인 제주 오성 업체 샘플 (스프레드시트 기준) */
export const JEJU_OSEONG_CONTRACT_ID = "c-1";
export const JEJU_OSEONG_CLIENT_USER_ID = "u-client-1";
/** 샘플 데이터 기준일 — 이 날짜까지 발행 건을 완료로 집계 */
export const JEJU_OSEONG_DEMO_AS_OF = "2026-06-16";

/** 최적블로그 실행 변형(포스트 링크) 목표 건수 */
export const JEJU_OSEONG_POST_LINK_COUNT = 5;
/** 완료율 ~70% (5건 중 4건 완료) */
export const JEJU_OSEONG_COMPLETED_LINK_COUNT = 4;

/** 체험단 캠페인 운영 건수 · 50% 완료 */
export const JEJU_OSEONG_EXPERIENCE_CAMPAIGN_COUNT = 6;
export const JEJU_OSEONG_EXPERIENCE_COMPLETED_COUNT = 3;

export const JEJU_OSEONG_CONTRACT_TARGETS = {
  clientName: "제주 오성",
  companyName: "주식회사 제주오성",
  monthlyFee: 1_200_000,
  targetOptimized: JEJU_OSEONG_POST_LINK_COUNT,
  targetInfluencer: 5,
  targetExperience: JEJU_OSEONG_EXPERIENCE_CAMPAIGN_COUNT,
  targetInstaCard: 8,
  targetYoutube: 4,
  targetInstagram: 6,
  targetClip: 3,
  targetTiktok: 2,
  youtubeDone: 2,
  instagramDone: 4,
  clipDone: 1,
  tiktokDone: 1,
  optimizedDone: JEJU_OSEONG_COMPLETED_LINK_COUNT,
  influencerDone: 4,
  hasPlaceSetting: true,
  isExtension: true,
  renewalMonthCount: 6,
  contractStartDate: "2026-01-01",
  contractEndDate: "2026-12-31",
  businessRegistrationNumber: "123-45-67890",
  clientPhone: "064-742-8888",
  representativeName: "오성훈",
  clientEmail: "client@jejuoseong.kr",
  clientContactName: "김매니저",
  clientContactPhone: "010-5678-1234",
  placeLink: "https://map.naver.com/p/search/제주%20오성",
  instagramLink: "https://instagram.com/jeju_oseong",
  youtubeLink: "https://youtube.com/@jejuoseong",
  otherLink: "https://jeju-oseong.co.kr",
} as const;

export const JEJU_OSEONG_PLACE_CREDENTIALS = {
  placeUrl: "https://map.naver.com/p/search/제주%20오성",
  loginId: "learning2021",
  password: "p0o9i8u7y6!",
} as const;

type OperationalRow = {
  date: string;
  url: string;
  keyword: string;
  searchRank?: number;
};

/**
 * 실무 진행 현황 — 발행 링크 · 키워드 · 순위
 * (제주 오성 운영 스프레드시트 26건 + 프로그램 생성 16건)
 */
export const JEJU_OSEONG_OPERATIONAL_ROWS: OperationalRow[] = [
  {
    date: "2026-05-28",
    url: "https://blog.naver.com/omysap/224299039343",
    keyword: "제주 중문 맛집",
  },
  {
    date: "2026-05-28",
    url: "https://m.blog.naver.com/ljw218/224299082583",
    keyword: "제주 맛집 추천",
  },
  {
    date: "2026-05-28",
    url: "https://m.blog.naver.com/sw01020341/224299084040",
    keyword: "제주 중문 아침식사",
    searchRank: 5,
  },
  {
    date: "2026-05-28",
    url: "https://m.blog.naver.com/ohappy26/224299218927",
    keyword: "제주 갈치조림 맛집",
    searchRank: 3,
  },
  {
    date: "2026-06-01",
    url: "https://m.blog.naver.com/ojh3529/224302689134",
    keyword: "서귀포 갈치조림 맛집",
  },
  {
    date: "2026-06-01",
    url: "https://m.blog.naver.com/simeon49/224302687262",
    keyword: "서귀포 중문 맛집",
  },
  {
    date: "2026-06-01",
    url: "https://m.blog.naver.com/dmsql1490/224302688355",
    keyword: "제주 갈치조림 맛집",
    searchRank: 1,
  },
  {
    date: "2026-06-01",
    url: "https://m.blog.naver.com/rmagml1203/224302687569",
    keyword: "서귀포 아침식사 맛집",
    searchRank: 7,
  },
  {
    date: "2026-06-02",
    url: "https://m.blog.naver.com/sgs5611/224303688763",
    keyword: "서귀포 중문 아침식사",
  },
  {
    date: "2026-06-02",
    url: "https://m.blog.naver.com/drboxstudio/224303964026",
    keyword: "제주 중문 아침식사",
  },
  {
    date: "2026-06-04",
    url: "https://m.blog.naver.com/simeon49/224305700959",
    keyword: "제주 아침식사 맛집",
  },
  {
    date: "2026-06-04",
    url: "https://m.blog.naver.com/blueoceankim/224305703333",
    keyword: "제주 서귀포 아침식사",
    searchRank: 3,
  },
  {
    date: "2026-06-05",
    url: "https://m.blog.naver.com/midas8873/224306648640",
    keyword: "제주 아침식사 맛집",
    searchRank: 2,
  },
  {
    date: "2026-06-05",
    url: "https://m.blog.naver.com/dohyun0305/224306648212",
    keyword: "서귀포 아침식사 맛집",
  },
  {
    date: "2026-06-05",
    url: "https://m.blog.naver.com/rizzy127/224306647031",
    keyword: "서귀포 아침식사",
  },
  {
    date: "2026-06-05",
    url: "https://m.blog.naver.com/dururui/224306663130",
    keyword: "중문 아침식사",
    searchRank: 2,
  },
  {
    date: "2026-06-08",
    url: "https://m.blog.naver.com/surfingtaiji/224309285907",
    keyword: "제주 아침식사 맛집",
  },
  {
    date: "2026-06-08",
    url: "https://m.blog.naver.com/b612pink/224309439628",
    keyword: "서귀포 아침식사 맛집",
  },
  {
    date: "2026-06-09",
    url: "https://m.blog.naver.com/snapbackr/224310615834",
    keyword: "중문 아침식사",
  },
  {
    date: "2026-06-09",
    url: "https://m.blog.naver.com/ezroc4beat/224310616814",
    keyword: "서귀포 아침식사 맛집",
  },
  {
    date: "2026-06-11",
    url: "https://m.blog.naver.com/hangkook77/224312595637",
    keyword: "중문 아침식사",
    searchRank: 2,
  },
  {
    date: "2026-06-11",
    url: "https://m.blog.naver.com/saker000/224312596773",
    keyword: "서귀포 아침식사",
  },
  {
    date: "2026-06-15",
    url: "https://m.blog.naver.com/oldskill/224316414544",
    keyword: "제주 중문 아침식사",
  },
  {
    date: "2026-06-15",
    url: "https://m.blog.naver.com/ezroc4beat/224316416600",
    keyword: "제주 중문 맛집",
  },
  {
    date: "2026-06-17",
    url: "https://m.blog.naver.com/dohyun0305/224318728707",
    keyword: "제주 맛집 추천",
  },
  {
    date: "2026-06-17",
    url: "https://m.blog.naver.com/xndz/224318779216",
    keyword: "중문 맛집 추천",
  },
];

/** 실무 스프레드시트 이후 추가 생성 링크용 키워드 풀 */
const EXTRA_KEYWORD_POOL = [
  "제주 흑돼지 맛집",
  "서귀포 브런치",
  "중문 해산물",
  "제주 현지인 맛집",
  "오름 근처 맛집",
  "제주 점심 맛집",
  "서귀포 저녁 맛집",
  "중문 저녁식사",
  "제주 가족식당",
  "서귀포 현지 맛집",
  "제주 관광 맛집",
  "중문 흑돼지",
  "제주 해산물 맛집",
  "서귀포 브런치 카페",
  "제주 갈치구이",
  "중문 코스요리",
] as const;

const OPERATING_EXPERIENCE_STATUSES: ExperienceSchedulingStatus[] = [
  "recruiting",
  "coordinating",
  "confirmed",
];

function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildExtendedOperationalRows(): OperationalRow[] {
  const rows = [...JEJU_OSEONG_OPERATIONAL_ROWS];
  const need = JEJU_OSEONG_POST_LINK_COUNT - rows.length;
  if (need <= 0) return rows.slice(0, JEJU_OSEONG_POST_LINK_COUNT);

  for (let i = 0; i < need; i++) {
    const dayOffset = 18 + i * 2;
    const date = addDaysIso("2026-05-28", dayOffset);
    rows.push({
      date,
      url: `https://m.blog.naver.com/tripitkorea-oseong/${224320000000 + i}`,
      keyword: EXTRA_KEYWORD_POOL[i % EXTRA_KEYWORD_POOL.length]!,
      ...(i % 4 === 0 ? { searchRank: 1 + (i % 7) } : {}),
    });
  }

  return rows.slice(0, JEJU_OSEONG_POST_LINK_COUNT);
}

export function buildJejuOseongPostLinks(): PostLinkEntry[] {
  const rows = buildExtendedOperationalRows();

  return rows.map((row, index) => {
    const isCompleted = index < JEJU_OSEONG_COMPLETED_LINK_COUNT;
    return {
      id: `pl-oseong-${index + 1}`,
      url: row.url,
      keyword: row.keyword,
      ...(row.searchRank != null ? { searchRank: row.searchRank } : {}),
      dueDate: row.date,
      completedDate: isCompleted ? row.date : undefined,
      enteredAt: row.date,
    };
  });
}

function countCompletedPostLinks(links: PostLinkEntry[]): number {
  return links.filter((link) => Boolean(link.completedDate)).length;
}

function patchContract(contract: Contract, publishedCount: number): Contract {
  return {
    ...contract,
    ...JEJU_OSEONG_CONTRACT_TARGETS,
    optimizedDone: publishedCount,
    status: "active",
    terminationReason: undefined,
    terminatedAt: undefined,
    clientDepositStatus: "completed",
    lastClientDepositDate: "2026-06-01",
    regionProvince: "제주특별자치도",
    regionCity: "제주시",
    address: "제주특별자치도 제주시 오일장서길 67",
  };
}

/** 제주 오성 체험단 60건 — 완료 30 · 운영 중 30(모집/조율/확정) */
export function buildJejuOseongExperienceCampaigns(): ExperienceCampaign[] {
  const campaigns: ExperienceCampaign[] = [];
  const monthStarts = [
    "2026-01-01",
    "2026-02-01",
    "2026-03-01",
    "2026-04-01",
    "2026-05-01",
    "2026-06-01",
  ];

  for (let seq = 1; seq <= JEJU_OSEONG_EXPERIENCE_CAMPAIGN_COUNT; seq++) {
    const index = seq - 1;
    const isCompleted = index < JEJU_OSEONG_EXPERIENCE_COMPLETED_COUNT;
    const monthStart = monthStarts[index % monthStarts.length]!;
    const visitDay = 4 + (index % 22);
    const visitDate = addDaysIso(monthStart, visitDay);

    const schedulingStatus: ExperienceSchedulingStatus = isCompleted
      ? "completed"
      : OPERATING_EXPERIENCE_STATUSES[
          index % OPERATING_EXPERIENCE_STATUSES.length
        ]!;

    const headcount = 8 + (index % 5);
    const participantCount =
      schedulingStatus === "completed"
        ? Math.min(headcount, 4 + (index % 3))
        : schedulingStatus === "recruiting"
          ? Math.min(headcount, 2 + (index % 3))
          : schedulingStatus === "confirmed"
            ? Math.min(headcount, 1 + (index % 2))
            : 0;

    campaigns.push({
      id: `exc-oseong-${seq}`,
      contractId: JEJU_OSEONG_CONTRACT_ID,
      title: `${seq}차 체험단`,
      sequence: seq,
      criteria: {
        targetHeadcount: headcount,
        category: "맛집",
        requirements: "네이버 블로그 리뷰 · 갈치조림 사진 5장 이상",
        providedBenefit: "2인 코스 + 음료",
        notes:
          index % 3 === 0
            ? "주말 가능자 우대"
            : index % 3 === 1
              ? "평일 오후 선호"
              : "제주 오성 실제 운영 체험단",
      },
      schedulingStatus,
      proposals: [
        {
          id: `esp-oseong-${seq}`,
          proposedByUserId: "u-staff-1",
          visitDate,
          visitTime: index % 2 === 0 ? "12:00" : "14:00",
          visitEndTime: index % 2 === 0 ? "15:00" : "17:00",
          note: `${seq}차 체험일 제안`,
          createdAt: addDaysIso(monthStart, 1),
          status:
            schedulingStatus === "coordinating" ? "pending" : "accepted",
        },
      ],
      confirmedVisitDate:
        schedulingStatus !== "coordinating" ? visitDate : undefined,
      confirmedVisitTime:
        schedulingStatus !== "coordinating" ? "12:00" : undefined,
      confirmedVisitEndTime:
        schedulingStatus !== "coordinating" ? "15:00" : undefined,
      participants: Array.from({ length: participantCount }, (_, pi) => ({
        id: `exp-os-${seq}-${pi + 1}`,
        blogName: `jeju_food_${seq}_${pi + 1}`,
        name: `체험단${pi + 1}`,
        contact: `010-22${String(seq).padStart(2, "0")}-${String(1000 + pi).slice(-4)}`,
        experienceDate: visitDate,
        headcount: pi === 0 ? 2 : 1,
        ...(isCompleted && pi < 2
          ? {
              postUrl: `https://blog.naver.com/jeju_food_${seq}/review-${pi + 1}`,
              postRegisteredAt: addDaysIso(visitDate, 1 + pi),
            }
          : {}),
        registeredAt: addDaysIso(monthStart, 3 + pi),
        registeredByUserId: "u-staff-1",
      })),
      sentToClientAt: addDaysIso(monthStart, 1),
      ...(schedulingStatus !== "coordinating" && {
        confirmedAt: addDaysIso(monthStart, 4),
        confirmedByUserId: JEJU_OSEONG_CLIENT_USER_ID,
      }),
      createdByUserId: "u-staff-1",
      createdAt: addDaysIso(monthStart, 1),
      updatedAt: addDaysIso(JEJU_OSEONG_DEMO_AS_OF, -(index % 14)),
    });
  }

  return campaigns;
}

function mergeExperienceCampaigns(
  campaigns: ExperienceCampaign[],
): ExperienceCampaign[] {
  const otherContracts = campaigns.filter(
    (campaign) => campaign.contractId !== JEJU_OSEONG_CONTRACT_ID,
  );

  return [...buildJejuOseongExperienceCampaigns(), ...otherContracts];
}

function ensurePlaceCredentials(
  placeCredentials: AppData["placeCredentials"],
): AppData["placeCredentials"] {
  const list = [...(placeCredentials ?? [])];
  const index = list.findIndex(
    (item) => item.contractId === JEJU_OSEONG_CONTRACT_ID,
  );

  const next = {
    id: index >= 0 ? list[index]!.id : "pc-oseong",
    contractId: JEJU_OSEONG_CONTRACT_ID,
    placeUrl: JEJU_OSEONG_PLACE_CREDENTIALS.placeUrl,
    loginId: JEJU_OSEONG_PLACE_CREDENTIALS.loginId,
    password: JEJU_OSEONG_PLACE_CREDENTIALS.password,
    updatedAt: "2026-06-05",
    updatedByUserId: JEJU_OSEONG_CLIENT_USER_ID,
  };

  if (index >= 0) {
    list[index] = { ...list[index]!, ...next };
    return list;
  }

  return [...list, next];
}

/** 시드·저장 데이터에 제주 오성 실운영 샘플 반영 */
export function applyJejuOseongOperationalSample(data: AppData): AppData {
  const postLinks = buildJejuOseongPostLinks();
  const publishedCount = countCompletedPostLinks(postLinks);
  const experienceCampaigns = mergeExperienceCampaigns(
    data.experienceCampaigns ?? [],
  );

  const contracts = data.contracts.map((contract) =>
    contract.id === JEJU_OSEONG_CONTRACT_ID
      ? patchContract(contract, publishedCount)
      : contract,
  );

  const executions = data.executions.map((execution) => {
    if (execution.contractId !== JEJU_OSEONG_CONTRACT_ID) return execution;
    if (execution.type === "optimized") {
      return {
        ...execution,
        status: "in_progress" as const,
        completedCount: publishedCount,
        targetCount: JEJU_OSEONG_POST_LINK_COUNT,
        memo: `실무 진행 ${JEJU_OSEONG_POST_LINK_COUNT}건 · 완료 ${publishedCount}건(${Math.round((publishedCount / JEJU_OSEONG_POST_LINK_COUNT) * 100)}%) · 키워드 순위 모니터링`,
        postLinks,
      };
    }
    if (execution.type === "influencer") {
      return {
        ...execution,
        status: "in_progress" as const,
        completedCount: JEJU_OSEONG_CONTRACT_TARGETS.influencerDone,
        targetCount: JEJU_OSEONG_CONTRACT_TARGETS.targetInfluencer,
        memo: "인플루언서 5팀 중 4팀 발행 완료",
      };
    }
    return execution;
  });

  const users = data.users.map((user) =>
    user.id === JEJU_OSEONG_CLIENT_USER_ID
      ? { ...user, name: JEJU_OSEONG_CONTRACT_TARGETS.clientName }
      : user,
  );

  const accountProfiles = (data.accountProfiles ?? []).map((profile) =>
    profile.contractId === JEJU_OSEONG_CONTRACT_ID ||
    profile.linkedUserId === JEJU_OSEONG_CLIENT_USER_ID
      ? { ...profile, name: JEJU_OSEONG_CONTRACT_TARGETS.clientName }
      : profile,
  );

  const placeCredentials = ensurePlaceCredentials(data.placeCredentials);

  const qaThreads = (data.qaThreads ?? []).map((thread) => {
    if (thread.contractId !== JEJU_OSEONG_CONTRACT_ID) return thread;
    if (thread.id === "qa-1") {
      return {
        ...thread,
        subject: "플레이스 대표 사진 · 갈치조림 메뉴 등록",
      };
    }
    if (thread.id === "qa-2") {
      return {
        ...thread,
        subject: "영업시간 · 브레이크타임 플레이스 반영",
      };
    }
    return thread;
  });

  const contractMemos = (data.contractMemos ?? []).map((memo) => {
    if (memo.contractId !== JEJU_OSEONG_CONTRACT_ID) return memo;
    if (memo.id === "cm-1-1") {
      return {
        ...memo,
        body: "플레이스 계정(learning2021) 확인 · 갈치조림 키워드 1위 달성 공유",
      };
    }
    if (memo.id === "cm-1-2") {
      return {
        ...memo,
        body: `6월 실무 진행 현황 — 최적블 ${publishedCount}/${JEJU_OSEONG_POST_LINK_COUNT}건 완료 · 체험단 ${JEJU_OSEONG_EXPERIENCE_COMPLETED_COUNT}/${JEJU_OSEONG_EXPERIENCE_CAMPAIGN_COUNT}건 완료`,
      };
    }
    return memo;
  });

  const firstLink = postLinks[0];
  const postLinkOpinions: PostLinkOpinion[] = (data.postLinkOpinions ?? []).map(
    (opinion) =>
      opinion.contractId === JEJU_OSEONG_CONTRACT_ID && opinion.id === "plo-1"
        ? {
            ...opinion,
            linkId: firstLink?.id ?? opinion.linkId,
            linkUrl: firstLink?.url ?? opinion.linkUrl,
            body: "제주 중문 맛집 키워드 확인했습니다. 대표 사진 교체 요청드립니다.",
          }
        : opinion,
  );

  const recruitingCampaign = experienceCampaigns.find(
    (campaign) =>
      campaign.contractId === JEJU_OSEONG_CONTRACT_ID &&
      campaign.schedulingStatus === "recruiting",
  );

  return {
    ...data,
    contracts,
    executions,
    users,
    accountProfiles,
    placeCredentials,
    qaThreads,
    contractMemos,
    postLinkOpinions,
    experienceCampaigns,
    partners: (data.partners ?? []).map((partner) =>
      partner.id === "p-exp-1"
        ? {
            ...partner,
            regionProvince: "제주특별자치도",
            regionCity: "제주시",
            address: "제주특별자치도 제주시 연동",
          }
        : partner,
    ),
    experiencePartnerSlots: [
      ...(data.experiencePartnerSlots ?? []).filter(
        (slot) => !slot.id.startsWith("eps-oseong-"),
      ),
      {
        id: "eps-oseong-1",
        campaignId: recruitingCampaign?.id ?? "exc-oseong-4",
        contractId: JEJU_OSEONG_CONTRACT_ID,
        visitDate: recruitingCampaign?.confirmedVisitDate ?? "2026-06-20",
        visitTime: "12:00",
        visitEndTime: "15:00",
        note: "제주 오성 체험단 — 2인 코스 + 음료 제공",
        regionProvince: "제주특별자치도",
        regionCity: "제주시",
        address: "제주특별자치도 제주시 오일장서길 67",
        createdByUserId: "u-staff-1",
        createdAt: "2026-06-10",
        status: "open" as const,
      },
    ],
    experienceParticipationProposals: data.experienceParticipationProposals ?? [],
  };
}

/** 제주 오성 실운영 링크·체험단 규모가 반영됐는지 빠르게 확인 */
export function hasJejuOseongOperationalSample(data: AppData): boolean {
  const optimized = data.executions.find(
    (execution) =>
      execution.contractId === JEJU_OSEONG_CONTRACT_ID &&
      execution.type === "optimized",
  );
  if (optimized?.postLinks?.length !== JEJU_OSEONG_POST_LINK_COUNT) return false;

  const oseongCampaigns = (data.experienceCampaigns ?? []).filter(
    (campaign) => campaign.contractId === JEJU_OSEONG_CONTRACT_ID,
  );
  if (oseongCampaigns.length < JEJU_OSEONG_EXPERIENCE_CAMPAIGN_COUNT) {
    return false;
  }

  return optimized.postLinks.some((link) =>
    link.url.includes("ljw218/224299082583"),
  );
}
