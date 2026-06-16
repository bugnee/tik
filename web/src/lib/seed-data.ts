import type {
  AccountProfile,
  AppData,
  BonusPayment,
  ClientDepositStatus,
  Contract,
  ContractMemo,
  ContractRecord,
  Execution,
  Expense,
  Partner,
  PartnerReferralLead,
  PlaceCredentials,
  PostLinkEntry,
  PostLinkOpinion,
  QaMessage,
  QaThread,
  TerminationReason,
  WorkOrder,
} from "./types";
import {
  emptyCostLines,
  generateWorkOrdersForContract,
} from "./work-order-utils";
import { DEFAULT_TASK_CHANNELS } from "./task-channel-utils";
import { DEFAULT_EXPENSE_CATEGORIES } from "./expense-category-utils";
import { calcBonusAmounts, defaultBonusPolicy } from "./bonus-utils";

/** 데모 기준일: 2026-06-16 (6월 업무 진행 중) */
const DEMO_TODAY = "2026-06-16";
const DEMO_MONTH = "2026-06";
const MONTH_START = "2026-06-01";
const MONTH_END = "2026-06-30";

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildPostLinks(
  count: number,
  contractIndex: number,
  type: "optimized" | "influencer",
  execDueDate: string,
  workStart: string,
): PostLinkEntry[] {
  const links: PostLinkEntry[] = [];
  for (let j = 0; j < count; j++) {
    const enteredAt = addDays(workStart, j * 2 + 1);
    const linkDue = addDays(execDueDate, -5 + (j % 4));
    links.push({
      id: `pl-c${contractIndex + 1}-${type.slice(0, 3)}-${j + 1}`,
      url: `https://blog.naver.com/tripit-${contractIndex + 1}-${type}-${j + 1}`,
      dueDate: linkDue > execDueDate ? execDueDate : linkDue,
      completedDate: enteredAt <= DEMO_TODAY ? enteredAt : "",
      enteredAt,
    });
  }
  return links;
}

const CLIENT_NAMES = [
  "서울맛집연구소", "부산해운대펜션", "제주오름카페", "강남뷰티클리닉", "홍대공연장",
  "경주한옥스테이", "대구패션몰", "인천공항호텔", "수원왕갈비", "전주비빔밥",
  "여수밤바다", "춘천닭갈비", "속초설악리조트", "포항철강박물관", "울산자동차",
  "창원마산어시장", "광주비엔날레", "대전과학관", "세종정부청사", "청주공항",
  "원주치킨", "충주사과농장", "천안호두과자", "아산온천", "평택항만물류",
  "안산공단", "시흥갯벌", "용인에버랜드", "성남IT밸리", "하남스타필드",
  "고양플랜트", "파주출판단지", "김포공항몰", "의정부부대찌개", "남양주카페거리",
  "양평물맑은", "가평쁘띠프랑스", "포천아트밸리", "동두천캠프", "안양범계",
  "군포산본", "과천과학관", "오산공군기지",
];

const TERMINATION_REASONS: TerminationReason[] = [
  "budget_reduction",
  "competitor_switch",
  "performance_issue",
  "client_request",
  "service_complete",
  "other",
];

function buildContracts(): Contract[] {
  const teams = ["team-a", "team-b", "team-c"];
  const staffIds = ["u-staff-1", "u-staff-2", "u-staff-3", "u-staff-4"];

  return CLIENT_NAMES.map((name, i) => {
    const monthlyFee = 800_000 + (i % 7) * 150_000;
    const targetOpt = 8 + (i % 5);
    const targetInf = 4 + (i % 3);
    const optDone = Math.min(
      targetOpt,
      Math.floor(targetOpt * (0.55 + (i % 10) * 0.04)),
    );
    const infDone = Math.min(
      targetInf,
      Math.floor(targetInf * (0.5 + (i % 8) * 0.05)),
    );

    const isTerminated = i % 11 === 0;
    let contractEndDate: string;
    if (isTerminated) {
      contractEndDate = addDays(DEMO_TODAY, -3);
    } else if (i % 5 === 1) {
      contractEndDate = addDays(DEMO_TODAY, 5);
    } else if (i % 5 === 2) {
      contractEndDate = addDays(DEMO_TODAY, 12);
    } else {
      contractEndDate = MONTH_END;
    }

    const isExtension = i % 5 === 0 && !isTerminated;
    const isLeaderDirect = i === 40 || i === 41;

    let clientDepositStatus: ClientDepositStatus | undefined;
    if ((isExtension || isLeaderDirect) && !isTerminated) {
      if (i % 12 === 0) clientDepositStatus = "overdue";
      else if (i % 10 === 0) clientDepositStatus = "other";
      else if (i % 4 === 0) clientDepositStatus = "pending";
      else clientDepositStatus = "completed";
    }

    return {
      id: `c-${i + 1}`,
      clientName: name,
      monthlyFee,
      targetOptimized: targetOpt,
      targetInfluencer: targetInf,
      targetExperience: 5 + (i % 4),
      targetInstaCard: 3 + (i % 3),
      hasPlaceSetting: i % 2 === 0,
      isExtension: isLeaderDirect ? true : isExtension,
      hasReferralPromo: i % 8 === 0,
      ...(i % 8 === 0 && { referrerPartnerId: "p-referral-1" }),
      assignedStaffId: isLeaderDirect ? "u-leader-1" : staffIds[i % 4],
      teamId: isLeaderDirect ? "team-a" : teams[i % 3],
      optimizedDone: optDone,
      influencerDone: infDone,
      contractStartDate: MONTH_START,
      contractEndDate,
      status: isTerminated ? "terminated" : "active",
      ...(isTerminated && {
        terminationReason: TERMINATION_REASONS[i % TERMINATION_REASONS.length],
        terminatedAt: addDays(DEMO_TODAY, -3),
      }),
      renewalMonthCount: isTerminated
        ? 3
        : isLeaderDirect
          ? 5
          : isExtension
            ? 4 + (i % 3)
            : 1,
      ...(clientDepositStatus && { clientDepositStatus }),
      ...(!isTerminated &&
        clientDepositStatus === "completed" && {
          lastClientDepositDate: addDays(
            MONTH_START,
            -15 - (i % 6) * 12,
          ),
        }),
      ...(!isTerminated &&
        !isExtension && {
          lastClientDepositDate: addDays(
            MONTH_START,
            -15 - (i % 6) * 12,
          ),
        }),
    };
  });
}

function buildContractRecords(contracts: Contract[]): ContractRecord[] {
  const staffIds = ["u-staff-1", "u-staff-2", "u-staff-3", "u-staff-4"];
  const records: ContractRecord[] = [];

  contracts.forEach((c, i) => {
    if (i < 15) {
      const prevStaff = staffIds[(i + 1) % 4];
      records.push({
        id: `cr-${i}-1`,
        contractId: c.id,
        period: "2026-04",
        assignedStaffId: prevStaff,
        teamId: c.teamId,
        startedAt: "2026-04-01",
        endedAt: "2026-04-30",
        monthlyFee: c.monthlyFee - 50_000,
        isExtension: false,
        note: "초기 계약",
      });
      records.push({
        id: `cr-${i}-2`,
        contractId: c.id,
        period: "2026-05",
        assignedStaffId: staffIds[(i + 2) % 4],
        teamId: c.teamId,
        startedAt: "2026-05-01",
        endedAt: "2026-05-31",
        monthlyFee: c.monthlyFee - 30_000,
        isExtension: i % 3 === 0,
        note: "담당자 변경",
      });
    }

    records.push({
      id: `cr-${i}-cur`,
      contractId: c.id,
      period: DEMO_MONTH,
      assignedStaffId: c.assignedStaffId,
      teamId: c.teamId,
      startedAt: MONTH_START,
      endedAt: c.status === "terminated" ? c.terminatedAt : undefined,
      monthlyFee: c.monthlyFee,
      isExtension: c.isExtension,
      terminationReason: c.terminationReason,
      note: c.status === "terminated" ? "계약 해지" : "현재 진행 회차",
    });
  });

  return records;
}

function buildContractMemos(contracts: Contract[]): ContractMemo[] {
  const memos: ContractMemo[] = [];
  contracts.slice(0, 8).forEach((c, i) => {
    if (i === 0) {
      memos.push(
        {
          id: "cm-1-1",
          contractId: c.id,
          body: "고객사 미팅 — 플레이스 세팅 일정 6/20 확정, 블로그 키워드 공유 완료",
          createdAt: "2026-06-10",
          assignedStaffId: c.assignedStaffId,
          authorUserId: c.assignedStaffId,
        },
        {
          id: "cm-1-2",
          contractId: c.id,
          body: "월간 리포트 발송 후 추가 인플루언서 1건 요청 — 다음 주 견적 전달 예정",
          createdAt: "2026-06-14",
          assignedStaffId: c.assignedStaffId,
          authorUserId: "u-leader-1",
        },
      );
    } else if (i % 4 === 0) {
      memos.push({
        id: `cm-${i}`,
        contractId: c.id,
        body: "연장 협의 진행 중 — 예산 유지 조건으로 3개월 연장 검토",
        createdAt: addDays(DEMO_TODAY, -2 - (i % 5)),
        assignedStaffId: c.assignedStaffId,
        authorUserId: c.assignedStaffId,
      });
    }
  });
  return memos;
}

function buildPartnerReferralLeads(contracts: Contract[]): PartnerReferralLead[] {
  const memos = [
    "지인 소개 · 초기 미팅 완료",
    "박람회 부스 문의 후 계약",
    "지역 상권 네트워크 소개",
    "온라인 커뮤니티 유입",
    "기존 고객 재소개",
    "협력 업체 연계 소개",
  ];
  const referralContracts = contracts.filter(
    (c) => c.hasReferralPromo && c.referrerPartnerId === "p-referral-1",
  );

  const leads: PartnerReferralLead[] = referralContracts.map((c, i) => ({
    id: `pr-${i + 1}`,
    partnerId: "p-referral-1",
    clientName: c.clientName,
    memo: memos[i % memos.length],
    introducedAt: addDays(c.contractStartDate, -12 - (i % 5) * 3),
    contractId: c.id,
    estimatedMonthlyFee: c.monthlyFee,
  }));

  leads.push({
    id: "pr-pending-1",
    partnerId: "p-referral-1",
    clientName: "홍대신규펍",
    memo: "6/15 현장 미팅 · 계약 협의 중",
    introducedAt: addDays(DEMO_TODAY, -1),
    estimatedMonthlyFee: 900_000,
  });

  return leads;
}

function buildExecutions(contracts: Contract[]): Execution[] {
  const items: Execution[] = [];

  contracts.forEach((c, i) => {
    const workStart = addDays(MONTH_START, (i % 6) + 1);
    const optDue = addDays(MONTH_END, -2 - (i % 3));
    const infDue = MONTH_END;

    const optStatus =
      c.optimizedDone >= c.targetOptimized
        ? "completed"
        : c.optimizedDone > 0
          ? "in_progress"
          : "pending";
    const infStatus =
      c.influencerDone >= c.targetInfluencer
        ? "completed"
        : c.influencerDone > 0
          ? "in_progress"
          : "pending";

    const optCompletedDate =
      optStatus === "completed"
        ? addDays(workStart, c.optimizedDone * 2)
        : undefined;
    const infCompletedDate =
      infStatus === "completed"
        ? addDays(workStart, c.influencerDone * 2 + 3)
        : undefined;

    items.push({
      id: `ex-${i * 2 + 1}`,
      contractId: c.id,
      type: "optimized",
      taskChannelId: "blog",
      status: optStatus,
      completedCount: c.optimizedDone,
      targetCount: c.targetOptimized,
      dueDate: optDue,
      enteredAt: optStatus === "pending" ? addDays(DEMO_TODAY, -2) : workStart,
      completedDate: optCompletedDate,
      memo:
        optStatus === "completed"
          ? `${DEMO_MONTH} 최적블로그 월간 목표 달성`
          : optStatus === "in_progress"
            ? "주 2건씩 포스팅 진행 중"
            : undefined,
      postLinks: buildPostLinks(
        c.optimizedDone,
        i,
        "optimized",
        optDue,
        workStart,
      ),
    });

    items.push({
      id: `ex-${i * 2 + 2}`,
      contractId: c.id,
      type: "influencer",
      taskChannelId: "influencer",
      status: infStatus,
      completedCount: c.influencerDone,
      targetCount: c.targetInfluencer,
      dueDate: infDue,
      enteredAt: infStatus === "pending" ? addDays(DEMO_TODAY, -1) : addDays(workStart, 2),
      completedDate: infCompletedDate,
      memo:
        infStatus === "completed"
          ? "인플루언서 콘텐츠 검수 완료"
          : infStatus === "in_progress"
            ? "2차 인플루언서 섭외 진행"
            : undefined,
      postLinks: buildPostLinks(
        c.influencerDone,
        i,
        "influencer",
        infDue,
        addDays(workStart, 2),
      ),
    });
  });

  return items;
}

function buildPartners(): Partner[] {
  return [
    {
      id: "p-press-1",
      companyName: "미디어랩 PR",
      categories: ["press"],
      contactName: "김기자",
      phone: "02-1234-5678",
      email: "press@medialab.kr",
      bankAccount: "110-234-567890",
      accountHolder: "미디어랩(주)",
      unitPrice: 120_000,
      memo: "IT·맛집 기자단 전문",
      isActive: true,
    },
    {
      id: "p-press-2",
      companyName: "뉴스브릿지",
      categories: ["press"],
      contactName: "이보도",
      phone: "02-9876-5432",
      email: "contact@newsbridge.co.kr",
      bankAccount: "333-111-222333",
      accountHolder: "뉴스브릿지",
      unitPrice: 95_000,
      isActive: true,
    },
    {
      id: "p-exp-1",
      companyName: "체험단킹",
      categories: ["experience"],
      contactName: "박체험",
      phone: "010-2345-6789",
      email: "king@experience.kr",
      bankAccount: "1002-345-678901",
      accountHolder: "체험단킹",
      unitPrice: 85_000,
      memo: "맛집·뷰티 체험단",
      isActive: true,
    },
    {
      id: "p-exp-2",
      companyName: "리뷰파워",
      categories: ["experience"],
      contactName: "최리뷰",
      phone: "010-8765-4321",
      bankAccount: "110-456-789012",
      accountHolder: "리뷰파워(주)",
      unitPrice: 78_000,
      isActive: true,
    },
    {
      id: "p-inf-1",
      companyName: "인플루언서허브",
      categories: ["influencer"],
      contactName: "정인플",
      phone: "02-5555-1234",
      email: "hub@influencer.kr",
      bankAccount: "333-444-555666",
      accountHolder: "인플허브",
      unitPrice: 350_000,
      memo: "마이크로~매크로 인플루언서",
      isActive: true,
    },
    {
      id: "p-inf-2",
      companyName: "크리에이터즈",
      categories: ["influencer"],
      contactName: "한크리",
      phone: "010-1111-2222",
      bankAccount: "1002-777-888999",
      accountHolder: "크리에이터즈",
      unitPrice: 280_000,
      isActive: true,
    },
    {
      id: "p-blog-1",
      companyName: "블로그팩토리",
      categories: ["blog"],
      contactName: "윤블로그",
      phone: "02-3333-4444",
      email: "factory@blog.kr",
      bankAccount: "110-567-890123",
      accountHolder: "블로그팩토리",
      unitPrice: 45_000,
      memo: "네이버 최적블로그 · 키워드 상위",
      isActive: true,
    },
    {
      id: "p-blog-2",
      companyName: "네이버SEO랩",
      categories: ["blog"],
      contactName: "송SEO",
      phone: "010-9999-8888",
      bankAccount: "333-777-888999",
      accountHolder: "네이버SEO랩",
      unitPrice: 52_000,
      isActive: true,
    },
    {
      id: "p-multi-1",
      companyName: "트립미디어",
      categories: ["press", "experience", "influencer"],
      contactName: "강통합",
      phone: "02-7777-8888",
      email: "all@tripmedia.kr",
      bankAccount: "1002-999-000111",
      accountHolder: "트립미디어(주)",
      unitPrice: 150_000,
      memo: "기자단·체험단·인플 통합 집행",
      isActive: true,
    },
    {
      id: "p-multi-2",
      companyName: "콘텐츠올",
      categories: ["blog", "influencer"],
      contactName: "오콘텐츠",
      phone: "010-5555-6666",
      bankAccount: "110-888-999000",
      accountHolder: "콘텐츠올",
      unitPrice: 65_000,
      isActive: true,
    },
    {
      id: "p-exp-3",
      companyName: "맛집체험단",
      categories: ["experience"],
      contactName: "조맛집",
      bankAccount: "333-222-333444",
      accountHolder: "맛집체험단",
      unitPrice: 72_000,
      isActive: false,
      memo: "계약 종료 · 비활성",
    },
    {
      id: "p-referral-1",
      companyName: "비즈리셀러망",
      categories: ["referral"],
      contactName: "임리셀",
      phone: "010-3333-7777",
      email: "intro@bizintro.kr",
      bankAccount: "1002-333-444555",
      accountHolder: "비즈리셀러망(주)",
      unitPrice: 0,
      memo: "고객 영업 · 월 10% 수수료",
      isActive: true,
    },
  ];
}

function buildExpenses(contracts: Contract[], partners: Partner[]): Expense[] {
  const pressPartner = partners.find((p) => p.id === "p-press-1")!;
  const expPartner = partners.find((p) => p.id === "p-exp-1")!;

  return contracts.slice(0, 20).flatMap((c, i) => {
    const requestDay = addDays(MONTH_START, 3 + (i % 10));
    const expRequestDay = addDays(MONTH_START, 5 + (i % 8));
    const statusCycle = i % 5;
    const pressStatus =
      statusCycle === 0
        ? "unpaid"
        : statusCycle === 1
          ? "pending_approval"
          : statusCycle === 2
            ? "pending_transfer"
            : "paid";
    const expStatus = i % 4 === 0 ? "unpaid" : "paid";

    return [
      {
        id: `e-${i * 2 + 1}`,
        contractId: c.id,
        category: "press" as const,
        description: `기자단 2차 모집 (${requestDay.slice(5)} 신청)`,
        amount: 120_000 + i * 10_000,
        bankAccount: pressPartner.bankAccount,
        accountHolder: pressPartner.accountHolder,
        partnerId: pressPartner.id,
        paymentDueDate: addDays(requestDay, 10),
        payoutStatus: pressStatus as Expense["payoutStatus"],
        ...(pressStatus === "pending_approval"
          ? {
              payoutRequestedBy: c.assignedStaffId,
              payoutRequestedAt: addDays(requestDay, 2),
            }
          : {}),
        ...(pressStatus === "pending_transfer" || pressStatus === "paid"
          ? {
              payoutRequestedBy: c.assignedStaffId,
              payoutRequestedAt: addDays(requestDay, 2),
              payoutApprovedBy: "u-exec-1",
              payoutApprovedAt: addDays(requestDay, 4),
            }
          : {}),
      },
      {
        id: `e-${i * 2 + 2}`,
        contractId: c.id,
        category: "experience" as const,
        description: `체험단 원고비 (${expRequestDay.slice(5)} 집행)`,
        amount: 85_000 + i * 5_000,
        bankAccount: expPartner.bankAccount,
        accountHolder: expPartner.accountHolder,
        partnerId: expPartner.id,
        paymentDueDate: addDays(expRequestDay, 7),
        payoutStatus: expStatus as Expense["payoutStatus"],
      },
    ];
  });
}

function buildSeedWorkOrders(contracts: Contract[]): WorkOrder[] {
  const orders: WorkOrder[] = [];
  for (const contractId of ["c-1", "c-2", "c-3", "c-5"]) {
    const contract = contracts.find((c) => c.id === contractId);
    if (!contract) continue;
    const generated = generateWorkOrdersForContract(
      contract,
      orders,
      DEFAULT_TASK_CHANNELS,
    );
    for (const g of generated) {
      orders.push({
        ...g,
        id: `wo-${contractId}-${g.taskType}-${g.sequence}`,
        costLines: g.costLines.length > 0 ? g.costLines : emptyCostLines(),
        postLinks: g.postLinks ?? [],
        memo: g.memo ?? "",
      });
    }
  }

  return orders.map((o) => {
    if (o.id === "wo-c-1-blog-1") {
      return {
        ...o,
        partnerId: "p-blog-1",
        stage: "pending_approval" as const,
        costLines: [
          { type: "manuscript" as const, amount: 45_000 },
          { type: "filming" as const, amount: 0 },
          { type: "travel" as const, amount: 0 },
          { type: "other" as const, amount: 5_000 },
        ],
        requestedBy: "u-staff-1",
        requestedAt: addDays(MONTH_START, 4),
      };
    }
    if (o.id === "wo-c-1-influencer-1") {
      return {
        ...o,
        partnerId: "p-inf-1",
        stage: "approved" as const,
        costLines: [
          { type: "manuscript" as const, amount: 0 },
          { type: "filming" as const, amount: 280_000 },
          { type: "travel" as const, amount: 30_000 },
          { type: "other" as const, amount: 0 },
        ],
        approvedBy: "u-partner-3",
        approvedAt: addDays(MONTH_START, 6),
        requestedBy: "u-staff-1",
        requestedAt: addDays(MONTH_START, 5),
      };
    }
    if (o.id === "wo-c-1-referral-1") {
      const contract = contracts.find((c) => c.id === "c-1");
      const referralAmount = contract
        ? Math.round(contract.monthlyFee * 0.1)
        : 0;
      return {
        ...o,
        partnerId: "p-referral-1",
        stage: "pending_approval" as const,
        costLines: [
          { type: "manuscript" as const, amount: 0 },
          { type: "filming" as const, amount: 0 },
          { type: "travel" as const, amount: 0 },
          { type: "other" as const, amount: referralAmount },
        ],
        memo: "서울맛집연구소 고객 소개 완료",
        requestedBy: "u-staff-1",
        requestedAt: addDays(MONTH_START, 2),
      };
    }
    if (o.id === "wo-c-2-blog-1") {
      return {
        ...o,
        partnerId: "p-blog-1",
        stage: "delivered" as const,
        costLines: [
          { type: "manuscript" as const, amount: 52_000 },
          { type: "filming" as const, amount: 0 },
          { type: "travel" as const, amount: 0 },
          { type: "other" as const, amount: 0 },
        ],
        postLinks: [
          {
            id: "pl-demo-1",
            url: "https://blog.naver.com/tripit-demo-1",
            completedDate: addDays(MONTH_START, 8),
            enteredAt: addDays(MONTH_START, 8),
          },
        ],
        memo: "키워드 상위 반영 완료",
        deliveredAt: addDays(MONTH_START, 8),
        requestedBy: "u-staff-2",
        requestedAt: addDays(MONTH_START, 3),
        approvedBy: "u-partner-2",
        approvedAt: addDays(MONTH_START, 5),
      };
    }
    if (o.id === "wo-c-3-experience-1") {
      return {
        ...o,
        partnerId: "p-exp-1",
        stage: "order_ready" as const,
        costLines: [
          { type: "manuscript" as const, amount: 85_000 },
          { type: "filming" as const, amount: 0 },
          { type: "travel" as const, amount: 15_000 },
          { type: "other" as const, amount: 0 },
        ],
        postLinks: [
          {
            id: "pl-demo-2",
            url: "https://blog.naver.com/tripit-exp-1",
            completedDate: addDays(MONTH_START, 10),
            enteredAt: addDays(MONTH_START, 10),
          },
        ],
        memo: "체험단 10명 모집 완료",
        paidAt: addDays(MONTH_START, 12),
        paidBy: "u-staff-3",
        expenseId: "e-seed-wo-1",
        deliveredAt: addDays(MONTH_START, 11),
      };
    }
    return o;
  });
}

function buildBonusPayments(
  contracts: Contract[],
  policy: ReturnType<typeof defaultBonusPolicy>,
): BonusPayment[] {
  const seedTeams = [
    { id: "team-a", name: "마케팅 1팀", leaderId: "u-leader-1", executiveId: "u-exec-1" },
    { id: "team-b", name: "마케팅 2팀", leaderId: "u-leader-2", executiveId: "u-exec-1" },
    { id: "team-c", name: "마케팅 3팀", leaderId: "u-leader-2", executiveId: "u-exec-1" },
  ];
  const calcCtx = { teams: seedTeams };

  return contracts
    .filter((c) => c.isExtension && c.renewalMonthCount >= 4)
    .slice(0, 8)
    .map((c, i) => {
      const amounts = calcBonusAmounts(c, policy, calcCtx);
      const stages: BonusPayment["stage"][] = [
        "pending_team_leader",
        "pending_executive",
        "pending_ceo",
        "ceo_confirmed",
        "paid",
      ];
      const stage = stages[i % stages.length];

      const createdAt = addDays(MONTH_START, 2 + i);
      const teamLeaderAt = addDays(createdAt, 2);
      const executiveAt = addDays(teamLeaderAt, 2);
      const ceoAt = addDays(executiveAt, 2);
      const paidAt = addDays(ceoAt, 2);
      const clientDepositDate =
        c.lastClientDepositDate ?? addDays(MONTH_START, -30);
      const scheduledPayDate = addDays(clientDepositDate, 60);

      return {
        id: `bp-${i + 1}`,
        contractId: c.id,
        period: DEMO_MONTH,
        staffId: c.assignedStaffId,
        ...amounts,
        renewalMonthAtRequest: c.renewalMonthCount,
        clientDepositDate,
        scheduledPayDate,
        stage,
        requestedBy: c.assignedStaffId,
        requestedAt: createdAt,
        createdAt,
        ...(stage !== "pending_team_leader" && {
          teamLeaderApprovedBy: "u-leader-1",
          teamLeaderApprovedAt: teamLeaderAt,
        }),
        ...(stage === "pending_ceo" ||
        stage === "ceo_confirmed" ||
        stage === "paid"
          ? {
              executiveApprovedBy: "u-exec-1",
              executiveApprovedAt: executiveAt,
            }
          : {}),
        ...(stage === "ceo_confirmed" || stage === "paid"
          ? {
              ceoApprovedBy: "u-ceo-1",
              ceoApprovedAt: ceoAt,
            }
          : {}),
        ...(stage === "paid"
          ? { paidBy: "u-finance-1", paidAt }
          : {}),
      };
    });
}

function buildAccountProfiles(): AccountProfile[] {
  const approvedBy = "u-ceo-1";
  const approvedAt = DEMO_TODAY;

  return [
    {
      id: "ap-ceo",
      googleId: "demo-google-ceo",
      email: "ceo@tripit.co.kr",
      name: "최대표",
      status: "approved",
      role: "ceo",
      linkedUserId: "u-ceo-1",
      isFinancialViewer: true,
      requestedAt: DEMO_TODAY,
      approvedBy,
      approvedAt,
    },
    {
      id: "ap-exec",
      googleId: "demo-google-exec",
      email: "exec@tripit.co.kr",
      name: "이서연",
      status: "approved",
      role: "executive",
      linkedUserId: "u-exec-1",
      isFinancialViewer: true,
      requestedAt: DEMO_TODAY,
      approvedBy,
      approvedAt,
    },
    {
      id: "ap-finance",
      googleId: "demo-google-finance",
      email: "finance@tripit.co.kr",
      name: "강재무",
      status: "approved",
      role: "finance_manager",
      linkedUserId: "u-finance-1",
      isFinancialViewer: true,
      requestedAt: DEMO_TODAY,
      approvedBy,
      approvedAt,
    },
    {
      id: "ap-leader",
      googleId: "demo-google-leader",
      email: "leader@tripit.co.kr",
      name: "박준호",
      status: "approved",
      role: "team_leader",
      linkedUserId: "u-leader-1",
      teamId: "team-a",
      requestedAt: DEMO_TODAY,
      approvedBy,
      approvedAt,
    },
    {
      id: "ap-staff",
      googleId: "demo-google-staff",
      email: "staff@tripit.co.kr",
      name: "김민지",
      status: "approved",
      role: "staff",
      linkedUserId: "u-staff-1",
      teamId: "team-a",
      requestedAt: DEMO_TODAY,
      approvedBy,
      approvedAt,
    },
    {
      id: "ap-partner",
      googleId: "demo-google-partner",
      email: "press@medialab.kr",
      name: "김기자",
      status: "approved",
      role: "partner",
      linkedUserId: "u-partner-1",
      partnerId: "p-press-1",
      requestedAt: DEMO_TODAY,
      approvedBy,
      approvedAt,
    },
    {
      id: "ap-vendor",
      googleId: "demo-google-vendor",
      email: "king@experience.kr",
      name: "박체험",
      status: "approved",
      role: "partner",
      linkedUserId: "u-vendor-1",
      partnerId: "p-exp-1",
      requestedAt: DEMO_TODAY,
      approvedBy,
      approvedAt,
    },
    {
      id: "ap-referral",
      googleId: "demo-google-referral",
      email: "intro@bizintro.kr",
      name: "임리셀",
      status: "approved",
      role: "partner",
      linkedUserId: "u-referral-1",
      partnerId: "p-referral-1",
      requestedAt: DEMO_TODAY,
      approvedBy,
      approvedAt,
    },
    {
      id: "ap-client",
      googleId: "demo-google-client",
      email: "client@seoulfood.kr",
      name: "서울맛집연구소",
      status: "approved",
      role: "client",
      linkedUserId: "u-client-1",
      contractId: "c-1",
      requestedAt: DEMO_TODAY,
      approvedBy,
      approvedAt,
    },
    {
      id: "ap-pending",
      googleId: "demo-google-pending",
      email: "newbie@gmail.com",
      name: "오신규",
      status: "pending",
      requestedAt: DEMO_TODAY,
    },
  ];
}

export function createSeedData(): AppData {
  const contracts = buildContracts();
  const partners = buildPartners();
  const executions = buildExecutions(contracts);
  const expenses = buildExpenses(contracts, partners);
  const contractRecords = buildContractRecords(contracts);
  const contractMemos = buildContractMemos(contracts);
  const partnerReferralLeads = buildPartnerReferralLeads(contracts);
  const bonusPolicy = defaultBonusPolicy();
  const workOrders = buildSeedWorkOrders(contracts);

  return {
    users: [
      {
        id: "u-staff-1",
        name: "김민지",
        role: "staff",
        isFinancialViewer: false,
        teamId: "team-a",
        googleId: "demo-google-staff",
        email: "staff@tripit.co.kr",
      },
      { id: "u-staff-2", name: "정하늘", role: "staff", isFinancialViewer: false, teamId: "team-a" },
      { id: "u-staff-3", name: "윤서아", role: "staff", isFinancialViewer: false, teamId: "team-b" },
      { id: "u-staff-4", name: "한지우", role: "staff", isFinancialViewer: false, teamId: "team-c" },
      {
        id: "u-leader-1",
        name: "박준호",
        role: "team_leader",
        isFinancialViewer: false,
        teamId: "team-a",
        googleId: "demo-google-leader",
        email: "leader@tripit.co.kr",
      },
      { id: "u-leader-2", name: "송지원", role: "team_leader", isFinancialViewer: false, teamId: "team-b" },
      {
        id: "u-exec-1",
        name: "이서연",
        role: "executive",
        isFinancialViewer: true,
        googleId: "demo-google-exec",
        email: "exec@tripit.co.kr",
      },
      {
        id: "u-ceo-1",
        name: "최대표",
        role: "ceo",
        isFinancialViewer: true,
        googleId: "demo-google-ceo",
        email: "ceo@tripit.co.kr",
      },
      {
        id: "u-finance-1",
        name: "강재무",
        role: "finance_manager",
        isFinancialViewer: true,
        googleId: "demo-google-finance",
        email: "finance@tripit.co.kr",
      },
      {
        id: "u-partner-1",
        name: "김기자",
        role: "partner",
        isFinancialViewer: false,
        partnerId: "p-press-1",
        googleId: "demo-google-partner",
        email: "press@medialab.kr",
      },
      {
        id: "u-vendor-1",
        name: "박체험",
        role: "partner",
        isFinancialViewer: false,
        partnerId: "p-exp-1",
        googleId: "demo-google-vendor",
        email: "king@experience.kr",
      },
      {
        id: "u-referral-1",
        name: "임리셀",
        role: "partner",
        isFinancialViewer: false,
        partnerId: "p-referral-1",
        googleId: "demo-google-referral",
        email: "intro@bizintro.kr",
      },
      {
        id: "u-client-1",
        name: "서울맛집연구소",
        role: "client",
        isFinancialViewer: false,
        contractId: "c-1",
        googleId: "demo-google-client",
        email: "client@seoulfood.kr",
      },
      {
        id: "u-client-2",
        name: "부산해운대펜션",
        role: "client",
        isFinancialViewer: false,
        contractId: "c-2",
        email: "client@haeundae.kr",
      },
      {
        id: "u-client-4",
        name: "강남뷰티클리닉",
        role: "client",
        isFinancialViewer: false,
        contractId: "c-4",
        email: "client@beautyclinic.kr",
      },
      {
        id: "u-partner-2",
        name: "윤블로그",
        role: "partner",
        isFinancialViewer: false,
        partnerId: "p-blog-1",
      },
      {
        id: "u-partner-3",
        name: "정인플",
        role: "partner",
        isFinancialViewer: false,
        partnerId: "p-inf-1",
      },
    ],
    teams: [
      { id: "team-a", name: "마케팅 1팀", leaderId: "u-leader-1", executiveId: "u-exec-1" },
      { id: "team-b", name: "마케팅 2팀", leaderId: "u-leader-2", executiveId: "u-exec-1" },
      { id: "team-c", name: "마케팅 3팀", leaderId: "u-leader-2", executiveId: "u-exec-1" },
    ],
    contracts,
    executions,
    expenses,
    extensionApprovals: [
      {
        id: "ext-1",
        contractId: "c-3",
        requestedBy: "u-staff-1",
        status: "pending",
        createdAt: addDays(DEMO_TODAY, -6),
      },
      {
        id: "ext-2",
        contractId: "c-4",
        requestedBy: "u-staff-2",
        status: "pending",
        createdAt: addDays(DEMO_TODAY, -4),
      },
      {
        id: "ext-3",
        contractId: "c-11",
        requestedBy: "u-staff-3",
        status: "pending",
        createdAt: addDays(DEMO_TODAY, -2),
      },
      {
        id: "ext-4",
        contractId: "c-6",
        requestedBy: "u-staff-1",
        status: "approved",
        createdAt: addDays(MONTH_START, 8),
      },
      {
        id: "ext-5",
        contractId: "c-18",
        requestedBy: "u-staff-4",
        status: "rejected",
        createdAt: addDays(MONTH_START, 12),
      },
    ],
    bonusPayments: buildBonusPayments(contracts, bonusPolicy),
    bonusPolicy,
    fundBudget: {
      monthlyBudget: 120_000_000,
      expenseAllocated: 45_000_000,
      bonusAllocated: 8_500_000,
      operatingReserve: 66_500_000,
    },
    contractRecords,
    contractMemos,
    partners,
    workOrders,
    accountProfiles: buildAccountProfiles(),
    taskChannels: [...DEFAULT_TASK_CHANNELS],
    expenseCategories: [...DEFAULT_EXPENSE_CATEGORIES],
    partnerReferralLeads,
    postLinkOpinions: buildPostLinkOpinions(),
    ...buildPlaceQaDemo(),
  };
}

function buildPostLinkOpinions(): PostLinkOpinion[] {
  return [
    {
      id: "plo-1",
      contractId: "c-1",
      linkId: "pl-c1-opt-1",
      linkUrl: "https://blog.naver.com/tripit-1-optimized-1",
      channel: "최적블로그",
      reportSource: "실행 진행",
      executionType: "optimized",
      body: "키워드 배치가 잘 되었습니다. 대표 사진만 교체해 주시면 좋겠어요.",
      imageUrls: [],
      authorUserId: "u-client-1",
      createdAt: addDays(DEMO_TODAY, -1),
    },
  ];
}

function buildPlaceQaDemo(): {
  placeCredentials: PlaceCredentials[];
  qaThreads: QaThread[];
  qaMessages: QaMessage[];
} {
  return {
    placeCredentials: [
      {
        id: "pc-1",
        contractId: "c-1",
        placeUrl: "https://map.naver.com/p/search/서울맛집연구소",
        loginId: "seoulfood_admin",
        password: "demo-place-2026",
        updatedAt: addDays(MONTH_START, 3),
        updatedByUserId: "u-client-1",
      },
    ],
    qaThreads: [
      {
        id: "qa-1",
        contractId: "c-1",
        subject: "플레이스 대표 사진 변경 요청",
        status: "open",
        createdByUserId: "u-client-1",
        assignedStaffId: "u-staff-1",
        createdAt: addDays(DEMO_TODAY, -2),
        lastMessageAt: addDays(DEMO_TODAY, -2),
      },
      {
        id: "qa-2",
        contractId: "c-1",
        subject: "영업시간 수정 문의",
        status: "answered",
        createdByUserId: "u-client-1",
        assignedStaffId: "u-staff-1",
        createdAt: addDays(DEMO_TODAY, -5),
        lastMessageAt: addDays(DEMO_TODAY, -4),
      },
      {
        id: "qa-3",
        contractId: "c-2",
        subject: "메뉴 사진 등록 방법",
        status: "open",
        createdByUserId: "u-client-2",
        assignedStaffId: "u-staff-2",
        createdAt: addDays(DEMO_TODAY, -1),
        lastMessageAt: addDays(DEMO_TODAY, -1),
      },
      {
        id: "qa-4",
        contractId: "c-4",
        subject: "예약 버튼 노출 문의",
        status: "open",
        createdByUserId: "u-client-4",
        assignedStaffId: "u-staff-4",
        createdAt: addDays(DEMO_TODAY, -1),
        lastMessageAt: addDays(DEMO_TODAY, -1),
      },
    ],
    qaMessages: [
      {
        id: "qm-1",
        threadId: "qa-1",
        authorUserId: "u-client-1",
        body: "대표 사진을 새로 촬영한 이미지로 교체해 주실 수 있을까요?",
        createdAt: addDays(DEMO_TODAY, -2),
      },
      {
        id: "qm-2",
        threadId: "qa-2",
        authorUserId: "u-client-1",
        body: "여름 시즌 영업시간으로 변경 부탁드립니다.",
        createdAt: addDays(DEMO_TODAY, -5),
      },
      {
        id: "qm-3",
        threadId: "qa-2",
        authorUserId: "u-staff-1",
        body: "확인했습니다. 내일 오전 중 반영 예정입니다.",
        createdAt: addDays(DEMO_TODAY, -4),
      },
      {
        id: "qm-4",
        threadId: "qa-3",
        authorUserId: "u-client-2",
        body: "신규 메뉴 사진을 플레이스에 등록하는 방법을 알려주세요.",
        createdAt: addDays(DEMO_TODAY, -1),
      },
      {
        id: "qm-5",
        threadId: "qa-4",
        authorUserId: "u-client-4",
        body: "네이버 플레이스에 예약 버튼이 보이지 않습니다. 확인 부탁드립니다.",
        createdAt: addDays(DEMO_TODAY, -1),
      },
    ],
  };
}

export const DEMO_USER_BY_ROLE = {
  staff: "u-staff-1",
  team_leader: "u-leader-1",
  executive: "u-exec-1",
  ceo: "u-ceo-1",
  finance_manager: "u-finance-1",
  partner: "u-partner-2",
  client: "u-client-1",
} as const;
