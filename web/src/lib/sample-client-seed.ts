import type {
  ClientDepositStatus,
  Contract,
  ContractMemo,
  PlaceCredentials,
  PostLinkOpinion,
  QaMessage,
  QaThread,
  TerminationReason,
} from "./types";
import { buildDemoClientLinks } from "./client-links-utils";
import {
  clientUserIdForContract,
  resolveExecutionProgress,
  staffIdForIndex,
  teamIdForIndex,
} from "./seed-data-generator";

/** 샘플 시드에 포함되는 8개 큐레이션 고객사 ID */
export const SAMPLE_CLIENT_IDS = [
  "c-1",
  "c-2",
  "c-3",
  "c-4",
  "c-5",
  "c-6",
  "c-7",
  "c-8",
] as const;

/** 샘플 고객사 시나리오 정의 (인덱스 = resolveExecutionProgress용) */
interface SampleClientScenario {
  id: string;
  name: string;
  index: number;
  monthlyFee: number;
  targetOptimized: number;
  targetInfluencer: number;
  targetExperience: number;
  targetInstaCard: number;
  hasPlaceSetting: boolean;
  isExtension: boolean;
  hasReferralPromo: boolean;
  referrerPartnerId?: string;
  assignedStaffId?: string;
  teamId?: string;
  status: "active" | "terminated";
  /** 계약 종료일 — 함수면 demoToday 기준 계산 */
  contractEndDate: string | ((demoToday: string, monthEnd: string) => string);
  contractStartMonthsAgo: number;
  renewalMonthCount: number;
  clientDepositStatus?: ClientDepositStatus;
  lastClientDepositDate?: string | ((monthStart: string) => string);
  terminationReason?: TerminationReason;
}

const SAMPLE_SCENARIOS: SampleClientScenario[] = [
  {
    // c-1: 제주 오성 — 메인 데모 (jeju-oseong-operational-data 오버레이)
    id: "c-1",
    name: "제주 오성",
    index: 0,
    monthlyFee: 1_200_000,
    targetOptimized: 10,
    targetInfluencer: 5,
    targetExperience: 6,
    targetInstaCard: 8,
    hasPlaceSetting: true,
    isExtension: true,
    hasReferralPromo: false,
    status: "active",
    contractEndDate: "2026-12-31",
    contractStartMonthsAgo: 5,
    renewalMonthCount: 6,
    clientDepositStatus: "completed",
    lastClientDepositDate: "2026-06-01",
  },
  {
    // c-2: 부산해운대펜션 — 입금 완료 · 양호 진행 · delivered WO 데모
    id: "c-2",
    name: "부산해운대펜션",
    index: 1,
    monthlyFee: 775_000,
    targetOptimized: 7,
    targetInfluencer: 4,
    targetExperience: 5,
    targetInstaCard: 3,
    hasPlaceSetting: true,
    isExtension: false,
    hasReferralPromo: false,
    status: "active",
    contractEndDate: (_demoToday, monthEnd) => monthEnd,
    contractStartMonthsAgo: 3,
    renewalMonthCount: 2,
    clientDepositStatus: "completed",
    lastClientDepositDate: (monthStart) => monthStart,
  },
  {
    // c-3: 제주오름카페 — 체험단 중심 (buildDetailedExperienceCampaigns 연동)
    id: "c-3",
    name: "제주오름카페",
    index: 2,
    monthlyFee: 700_000,
    targetOptimized: 6,
    targetInfluencer: 3,
    targetExperience: 10,
    targetInstaCard: 4,
    hasPlaceSetting: true,
    isExtension: false,
    hasReferralPromo: false,
    status: "active",
    contractEndDate: (_demoToday, monthEnd) => monthEnd,
    contractStartMonthsAgo: 4,
    renewalMonthCount: 2,
    clientDepositStatus: "completed",
    lastClientDepositDate: (monthStart) => monthStart,
  },
  {
    // c-4: 강남뷰티클리닉 — Q&A 오픈 · 플레이스 계정 · 입금 완료
    id: "c-4",
    name: "강남뷰티클리닉",
    index: 3,
    monthlyFee: 900_000,
    targetOptimized: 8,
    targetInfluencer: 5,
    targetExperience: 6,
    targetInstaCard: 3,
    hasPlaceSetting: true,
    isExtension: false,
    hasReferralPromo: false,
    status: "active",
    contractEndDate: (_demoToday, monthEnd) => monthEnd,
    contractStartMonthsAgo: 2,
    renewalMonthCount: 1,
    clientDepositStatus: "completed",
    lastClientDepositDate: (monthStart) => monthStart,
  },
  {
    // c-5: 홍대공연장 — 리셀러 프로모션
    id: "c-5",
    name: "홍대공연장",
    index: 4,
    monthlyFee: 850_000,
    targetOptimized: 9,
    targetInfluencer: 4,
    targetExperience: 5,
    targetInstaCard: 2,
    hasPlaceSetting: false,
    isExtension: false,
    hasReferralPromo: true,
    referrerPartnerId: "p-referral-1",
    status: "active",
    contractEndDate: (_demoToday, monthEnd) => monthEnd,
    contractStartMonthsAgo: 1,
    renewalMonthCount: 1,
    lastClientDepositDate: (monthStart) => monthStart,
  },
  {
    // c-6: 속초설악리조트 — 연장 계약 · 입금 대기/연체
    id: "c-6",
    name: "속초설악리조트",
    index: 5,
    monthlyFee: 950_000,
    targetOptimized: 8,
    targetInfluencer: 4,
    targetExperience: 6,
    targetInstaCard: 3,
    hasPlaceSetting: true,
    isExtension: true,
    hasReferralPromo: false,
    status: "active",
    contractEndDate: (_demoToday, monthEnd) => monthEnd,
    contractStartMonthsAgo: 8,
    renewalMonthCount: 3,
    clientDepositStatus: "overdue",
  },
  {
    // c-7: 가평쁘띠프랑스 — 곧 종료 · 연장 · 성과급 대상(4개월+)
    id: "c-7",
    name: "가평쁘띠프랑스",
    index: 6,
    monthlyFee: 725_000,
    targetOptimized: 7,
    targetInfluencer: 3,
    targetExperience: 4,
    targetInstaCard: 2,
    hasPlaceSetting: true,
    isExtension: true,
    hasReferralPromo: false,
    status: "active",
    contractEndDate: (demoToday) => addDays(demoToday, 5),
    contractStartMonthsAgo: 10,
    renewalMonthCount: 5,
    clientDepositStatus: "completed",
    lastClientDepositDate: (monthStart) => monthStart,
  },
  {
    // c-8: 경주한옥스테이 — 해지(과거 이력)
    id: "c-8",
    name: "경주한옥스테이",
    index: 7,
    monthlyFee: 650_000,
    targetOptimized: 6,
    targetInfluencer: 3,
    targetExperience: 4,
    targetInstaCard: 2,
    hasPlaceSetting: false,
    isExtension: false,
    hasReferralPromo: false,
    status: "terminated",
    contractEndDate: (demoToday) => addDays(demoToday, -14),
    contractStartMonthsAgo: 14,
    renewalMonthCount: 3,
    terminationReason: "service_complete",
  },
];

/**
 * 8개 큐레이션 샘플 계약 생성
 * — resolveExecutionProgress로 실행 진행률 산출
 */
export function buildSampleContracts(
  demoToday: string,
  monthStart: string,
  monthEnd: string,
  addDaysFn: (iso: string, days: number) => string,
  addMonthsIsoFn: (iso: string, months: number) => string,
): Contract[] {
  return SAMPLE_SCENARIOS.map((scenario) => {
    const optProgress = resolveExecutionProgress(
      scenario.index,
      "optimized",
      scenario.targetOptimized,
    );
    const infProgress = resolveExecutionProgress(
      scenario.index,
      "influencer",
      scenario.targetInfluencer,
    );

    const targetYoutube = 2 + (scenario.index % 4);
    const targetInstagram = 3 + (scenario.index % 5);
    const targetClip = 1 + (scenario.index % 3);
    const targetTiktok = 1 + (scenario.index % 2);
    const ytProgress = resolveExecutionProgress(
      scenario.index + 2,
      "influencer",
      targetYoutube,
    );
    const igProgress = resolveExecutionProgress(
      scenario.index + 3,
      "influencer",
      targetInstagram,
    );
    const clipProgress = resolveExecutionProgress(
      scenario.index + 4,
      "influencer",
      targetClip,
    );
    const tiktokProgress = resolveExecutionProgress(
      scenario.index + 5,
      "influencer",
      targetTiktok,
    );

    const contractEndDate =
      typeof scenario.contractEndDate === "function"
        ? scenario.contractEndDate(demoToday, monthEnd)
        : scenario.contractEndDate;

    const lastDeposit =
      scenario.lastClientDepositDate == null
        ? undefined
        : typeof scenario.lastClientDepositDate === "function"
          ? scenario.lastClientDepositDate(monthStart)
          : scenario.lastClientDepositDate;

    const assignedStaffId =
      scenario.assignedStaffId ?? staffIdForIndex(scenario.index);
    const teamId = scenario.teamId ?? teamIdForIndex(scenario.index);

    return {
      id: scenario.id,
      clientName: scenario.name,
      monthlyFee: scenario.monthlyFee,
      targetOptimized: scenario.targetOptimized,
      targetInfluencer: scenario.targetInfluencer,
      targetExperience: scenario.targetExperience,
      targetInstaCard: scenario.targetInstaCard,
      targetYoutube,
      targetInstagram,
      targetClip,
      targetTiktok,
      hasPlaceSetting: scenario.hasPlaceSetting,
      isExtension: scenario.isExtension,
      hasReferralPromo: scenario.hasReferralPromo,
      ...(scenario.referrerPartnerId && {
        referrerPartnerId: scenario.referrerPartnerId,
      }),
      assignedStaffId,
      teamId,
      optimizedDone: optProgress.completedCount,
      influencerDone: infProgress.completedCount,
      youtubeDone: ytProgress.completedCount,
      instagramDone: igProgress.completedCount,
      clipDone: clipProgress.completedCount,
      tiktokDone: tiktokProgress.completedCount,
      contractStartDate: addMonthsIsoFn(
        demoToday,
        -scenario.contractStartMonthsAgo,
      ),
      contractEndDate,
      status: scenario.status,
      renewalMonthCount: scenario.renewalMonthCount,
      ...(scenario.clientDepositStatus && {
        clientDepositStatus: scenario.clientDepositStatus,
      }),
      ...(lastDeposit && { lastClientDepositDate: lastDeposit }),
      ...(scenario.status === "terminated" && {
        terminationReason: scenario.terminationReason ?? "other",
        terminatedAt: contractEndDate,
      }),
      ...buildDemoClientLinks(scenario.name, scenario.index),
    };
  });
}

/** QA·플레이스·포스팅 의견·메모 등 위성 데이터 (데모 QA와 중복 최소화) */
export function buildSampleSatelliteData(
  contracts: Contract[],
  demoToday: string,
  monthStart: string,
  addDaysFn: (iso: string, days: number) => string,
): {
  qaThreads: QaThread[];
  qaMessages: QaMessage[];
  placeCredentials: PlaceCredentials[];
  postLinkOpinions: PostLinkOpinion[];
  contractMemos: ContractMemo[];
} {
  const qaThreads: QaThread[] = [];
  const qaMessages: QaMessage[] = [];
  const placeCredentials: PlaceCredentials[] = [];
  const postLinkOpinions: PostLinkOpinion[] = [];
  const contractMemos: ContractMemo[] = [];

  // c-1 전용 메모 2건 (jeju 오버레이가 본문 패치)
  const c1 = contracts.find((c) => c.id === "c-1");
  if (c1) {
    contractMemos.push(
      {
        id: "cm-1-1",
        contractId: "c-1",
        body: "고객사 미팅 — 플레이스 세팅 일정 6/20 확정, 블로그 키워드 공유 완료",
        createdAt: "2026-06-10",
        assignedStaffId: c1.assignedStaffId,
        authorUserId: c1.assignedStaffId,
      },
      {
        id: "cm-1-2",
        contractId: "c-1",
        body: "월간 리포트 발송 후 추가 인플루언서 1건 요청 — 다음 주 견적 전달 예정",
        createdAt: "2026-06-14",
        assignedStaffId: c1.assignedStaffId,
        authorUserId: "u-leader-1",
      },
    );
  }

  // c-7 연장 협의 메모
  const c7 = contracts.find((c) => c.id === "c-7");
  if (c7) {
    contractMemos.push({
      id: "cm-7-1",
      contractId: "c-7",
      body: "계약 만료 5일 전 — 3개월 연장 협의 진행 중, 예산 유지 조건 검토",
      createdAt: addDaysFn(demoToday, -2),
      assignedStaffId: c7.assignedStaffId,
      authorUserId: c7.assignedStaffId,
    });
  }

  let qaSeq = 10;
  let qmSeq = 10;
  let ploSeq = 2;

  contracts.forEach((contract) => {
    if (contract.status !== "active") return;

    const clientId = clientUserIdForContract(contract.id);
    const contractNum = contract.id.replace("c-", "");

    // buildPlaceQaDemo가 c-1, c-2, c-4 QA를 담당 — 나머지 활성 고객만 추가
    const demoQaCovered = new Set(["c-1", "c-2", "c-4"]);
    if (!demoQaCovered.has(contract.id)) {
      const threadDefs: Array<{
        status: QaThread["status"];
        subject: string;
        clientBody: string;
        staffReply?: string;
      }> =
        contract.id === "c-3"
          ? [
              {
                status: "answered",
                subject: "체험단 일정 확정 확인",
                clientBody: "1차 체험단 6/12 일정 확정해 주셔서 감사합니다. 2차 일정도 빠르게 잡아주세요.",
                staffReply: "2차 체험일 후보 6/20·6/22 제안드렸습니다. 검토 부탁드립니다.",
              },
            ]
          : contract.id === "c-5"
            ? [
                {
                  status: "open",
                  subject: "공연 일정 플레이스 반영",
                  clientBody: "6월 공연 일정을 플레이스 이벤트에 등록해 주실 수 있을까요?",
                },
                {
                  status: "closed",
                  subject: "인스타 연동 문의",
                  clientBody: "인스타그램 피드 연동 방법을 알려주세요.",
                  staffReply: "연동 가이드 PDF 발송 완료했습니다.",
                },
              ]
            : contract.id === "c-6"
              ? [
                  {
                    status: "open",
                    subject: "리조트 시즌 요금 안내 수정",
                    clientBody: "여름 시즌 요금표가 플레이스에 반영되지 않았습니다. 확인 부탁드립니다.",
                  },
                ]
              : contract.id === "c-7"
                ? [
                    {
                      status: "answered",
                      subject: "연장 계약 키워드 전략",
                      clientBody: "연장 시 키워드를 '가평 프랑스마을 맛집'으로 변경 가능한지 문의드립니다.",
                      staffReply: "키워드 변경 가능합니다. 다음 주부터 반영하겠습니다.",
                    },
                  ]
                : [];

      for (const def of threadDefs) {
        qaSeq += 1;
        const threadId = `qa-s-${qaSeq}`;
        const createdAt = addDaysFn(demoToday, -(qaSeq % 5) - 1);

        qaThreads.push({
          id: threadId,
          contractId: contract.id,
          subject: def.subject,
          status: def.status,
          createdByUserId: clientId,
          assignedStaffId: contract.assignedStaffId,
          createdAt,
          lastMessageAt: createdAt,
          ...(def.status === "closed" && {
            closedAt: addDaysFn(createdAt, 2),
            closedByUserId: contract.assignedStaffId,
          }),
        });

        qmSeq += 1;
        qaMessages.push({
          id: `qm-s-${qmSeq}`,
          threadId,
          authorUserId: clientId,
          body: def.clientBody,
          createdAt,
        });

        if (def.staffReply) {
          qmSeq += 1;
          const replyAt = addDaysFn(createdAt, 1);
          qaMessages.push({
            id: `qm-s-${qmSeq}`,
            threadId,
            authorUserId: contract.assignedStaffId,
            body: def.staffReply,
            createdAt: replyAt,
          });
          const thread = qaThreads[qaThreads.length - 1]!;
          thread.lastMessageAt = replyAt;
        }
      }
    }

    // 플레이스 계정 — c-1은 buildPlaceQaDemo·jeju 오버레이가 담당
    if (contract.hasPlaceSetting && contract.id !== "c-1") {
      placeCredentials.push({
        id: `pc-${contract.id}`,
        contractId: contract.id,
        placeUrl: `https://map.naver.com/p/search/${encodeURIComponent(contract.clientName)}`,
        loginId: `admin_${contractNum}`,
        password: `demo-place-${contractNum}`,
        updatedAt: addDaysFn(monthStart, 3 + Number(contractNum)),
        updatedByUserId: clientId,
      });
    }

    // 포스팅 링크 의견 — c-1은 buildPostLinkOpinions가 담당
    if (contract.id !== "c-1") {
      ploSeq += 1;
      postLinkOpinions.push({
        id: `plo-s-${ploSeq}`,
        contractId: contract.id,
        linkId: `pl-c${contractNum}-opt-1`,
        linkUrl: `https://blog.naver.com/tripit-${contractNum}-optimized-1`,
        channel: "최적블로그",
        reportSource: "실행 진행",
        executionType: "optimized",
        body:
          contract.id === "c-2"
            ? "펜션 전경 사진이 잘 나왔습니다. 객실 내부 사진 1장 추가 부탁드립니다."
            : contract.id === "c-3"
              ? "카페 시그니처 메뉴 사진이 돋보입니다. 해시태그에 #제주오름 추가해 주세요."
              : contract.id === "c-4"
                ? "시술 전후 사진 구성 좋습니다. 예약 링크를 본문 상단에 배치해 주세요."
                : contract.id === "c-5"
                  ? "공연 홍보 영상 퀄리티 우수합니다. 공연 일시를 자막에 더 크게 넣어주세요."
                  : contract.id === "c-6"
                    ? "리조트 수영장 사진이 인상적입니다. 주차 안내 문구 추가 부탁드립니다."
                    : "키워드 배치 양호합니다. 대표 사진 교체 요청드립니다.",
        imageUrls: [],
        authorUserId: clientId,
        createdAt: addDaysFn(demoToday, -(ploSeq % 4) - 1),
      });
    }
  });

  return {
    qaThreads,
    qaMessages,
    placeCredentials,
    postLinkOpinions,
    contractMemos,
  };
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
