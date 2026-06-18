import type {
  AccountProfile,
  AppData,
  BonusPayment,
  Contract,
  ContractMemo,
  ContractRecord,
  Execution,
  ExperienceCampaign,
  Expense,
  Partner,
  PartnerReferralLead,
  PlaceCredentials,
  PostLinkEntry,
  PostLinkOpinion,
  QaMessage,
  QaThread,
  User,
  UserRole,
  WorkEvaluation,
  WorkOrder,
} from "./types";
import { DEFAULT_TASK_CHANNELS } from "./task-channel-utils";
import { DEFAULT_EXPENSE_CATEGORIES } from "./expense-category-utils";
import { DEFAULT_PARTNER_FILTERS } from "./partner-filter-utils";
import { DEFAULT_EXPERIENCE_FIELDS } from "./experience-field-utils";
import { normalizePartner, type LegacyPartnerInput } from "./partner-utils";
import { calcBonusAmounts, calcBonusClosingDeadline, calcScheduledPayDate, defaultBonusPolicy } from "./bonus-utils";
import {
  buildWorkEvaluationInput,
  computeEvaluationMetrics,
  computeAutoEvaluationScores,
  currentEvaluationPeriod,
} from "./work-evaluation-utils";
import {
  buildClientUsersFromContracts,
  buildScaledExperienceCampaigns,
  buildScaledExtensionApprovals,
  buildScaledWorkOrders,
  buildStaffUsers,
  buildYearContractRecords,
  addMonthsIso,
  resolveExecutionProgress,
} from "./seed-data-generator";
import { applyJejuOseongOperationalSample, JEJU_OSEONG_CONTRACT_ID } from "./jeju-oseong-operational-data";
import {
  buildSampleContracts,
  buildSampleSatelliteData,
} from "./sample-client-seed";

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

function buildContracts(): Contract[] {
  return buildSampleContracts(
    DEMO_TODAY,
    MONTH_START,
    MONTH_END,
    addDays,
    addMonthsIso,
  );
}

function buildContractRecords(contracts: Contract[]): ContractRecord[] {
  return buildYearContractRecords(contracts, DEMO_TODAY);
}

function buildContractMemos(contracts: Contract[]): ContractMemo[] {
  const satellite = buildSampleSatelliteData(
    contracts,
    DEMO_TODAY,
    MONTH_START,
    addDays,
  );
  return satellite.contractMemos;
}

function buildPartnerReferralLeads(contracts: Contract[]): PartnerReferralLead[] {
  const memos = [
    "지인 연결 · 초기 미팅 완료",
    "박람회 부스 문의 후 계약",
    "지역 상권 네트워크 경유",
    "온라인 커뮤니티 유입",
    "기존 고객 리셀러 연계",
    "협력 업체 리셀러 연계",
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
    const optDue = addDays(MONTH_END, -2 - (i % 5));
    const infDue = addDays(MONTH_END, -(i % 4));

    const optProgress = resolveExecutionProgress(
      i,
      "optimized",
      c.targetOptimized,
    );
    const infProgress = resolveExecutionProgress(
      i,
      "influencer",
      c.targetInfluencer,
    );

    const optCompletedDate =
      optProgress.status === "completed"
        ? addDays(workStart, c.optimizedDone * 2)
        : undefined;
    const infCompletedDate =
      infProgress.status === "completed"
        ? addDays(workStart, c.influencerDone * 2 + 3)
        : undefined;

    items.push({
      id: `ex-${i * 2 + 1}`,
      contractId: c.id,
      type: "optimized",
      taskChannelId: "blog",
      status: optProgress.status,
      completedCount: c.optimizedDone,
      targetCount: c.targetOptimized,
      dueDate: optDue,
      enteredAt:
        optProgress.status === "pending"
          ? addDays(DEMO_TODAY, -2 - (i % 3))
          : workStart,
      completedDate: optCompletedDate,
      memo:
        optProgress.status === "completed"
          ? `${DEMO_MONTH} 최적블로그 월간 목표 달성`
          : optProgress.status === "in_progress"
            ? "주 2건씩 포스팅 진행 중"
            : optProgress.status === "delayed"
              ? "마감 임박 · 추가 포스팅 필요"
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
      status: infProgress.status,
      completedCount: c.influencerDone,
      targetCount: c.targetInfluencer,
      dueDate: infDue,
      enteredAt:
        infProgress.status === "pending"
          ? addDays(DEMO_TODAY, -1 - (i % 4))
          : addDays(workStart, 2),
      completedDate: infCompletedDate,
      memo:
        infProgress.status === "completed"
          ? "인플루언서 콘텐츠 검수 완료"
          : infProgress.status === "in_progress"
            ? "2차 인플루언서 섭외 진행"
            : infProgress.status === "delayed"
              ? "섭외 지연 · 대체 후보 검토"
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
  const raw: LegacyPartnerInput[] = [
    {
      id: "p-press-1",
      companyName: "미디어랩 PR",
      categories: ["press"],
      contactName: "김기자",
      phone: "02-1234-5678",
      email: "press@medialab.kr",
      bankName: "국민은행",
      bankAccount: "110-234-567890",
      accountHolder: "미디어랩(주)",
      linkSlots: [
        {
          url: "https://blog.naver.com/medialab_pr",
          nickname: "미디어랩PR",
        },
      ],
      unitPrice: 120_000,
      internalManagerUserId: "u-staff-1",
      memo: "IT·맛집 기자단 전문",
      status: "active",
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
      internalManagerUserId: "u-leader-1",
      status: "active",
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
      internalManagerUserId: "u-staff-2",
      memo: "맛집·뷰티 체험단",
      status: "active",
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
      status: "active",
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
      internalManagerUserId: "u-staff-3",
      memo: "마이크로~매크로 인플루언서",
      status: "active",
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
      status: "active",
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
      internalManagerUserId: "u-staff-4",
      memo: "네이버 최적블로그 · 키워드 상위",
      status: "active",
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
      status: "active",
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
      internalManagerUserId: "u-leader-2",
      memo: "기자단·체험단·인플 통합 집행",
      status: "active",
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
      status: "active",
    },
    {
      id: "p-exp-3",
      companyName: "맛집체험단",
      categories: ["experience"],
      contactName: "조맛집",
      bankAccount: "333-222-333444",
      accountHolder: "맛집체험단",
      unitPrice: 72_000,
      status: "ended",
      memo: "계약 종료 · 종료파트너",
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
      internalManagerUserId: "u-staff-1",
      memo: "고객 영업 · 월 10% 수수료",
      status: "active",
    },
  ];
  return raw.map((partner, i) =>
    normalizePartner({
      ...partner,
      registeredAt: addDays(DEMO_TODAY, -240 + i * 14),
    }),
  );
}

function buildExpenses(contracts: Contract[], partners: Partner[]): Expense[] {
  const pressPartner = partners.find((p) => p.id === "p-press-1")!;
  const expPartner = partners.find((p) => p.id === "p-exp-1")!;

  return contracts
    .filter((c) => c.status === "active")
    .flatMap((c, i) => {
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

function buildSeedWorkOrders(
  contracts: Contract[],
  partners: Partner[],
): WorkOrder[] {
  return buildScaledWorkOrders(contracts, partners, MONTH_START);
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
    .slice(0, 4)
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
      const closingDeadline = calcBonusClosingDeadline(clientDepositDate);
      const scheduledPayDate = calcScheduledPayDate(clientDepositDate);

      return {
        id: `bp-${i + 1}`,
        contractId: c.id,
        period: DEMO_MONTH,
        staffId: c.assignedStaffId,
        ...amounts,
        renewalMonthAtRequest: c.renewalMonthCount,
        clientDepositDate,
        closingDeadline,
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
      email: "client@jejuoseong.kr",
      name: "제주 오성",
      status: "approved",
      role: "client",
      linkedUserId: "u-client-1",
      contractId: "c-1",
      requestedAt: DEMO_TODAY,
      approvedBy,
      approvedAt,
    },
    {
      id: "ap-client-2",
      googleId: "demo-google-client-2",
      email: "client@haeundae.kr",
      name: "부산해운대펜션",
      status: "approved",
      role: "client",
      linkedUserId: "u-client-2",
      contractId: "c-2",
      requestedAt: DEMO_TODAY,
      approvedBy,
      approvedAt,
    },
    {
      id: "ap-client-3",
      googleId: "demo-google-client-3",
      email: "client@jejuorum.kr",
      name: "제주오름카페",
      status: "approved",
      role: "client",
      linkedUserId: "u-client-3",
      contractId: "c-3",
      requestedAt: DEMO_TODAY,
      approvedBy,
      approvedAt,
    },
    {
      id: "ap-client-4",
      googleId: "demo-google-client-4",
      email: "client@beautyclinic.kr",
      name: "강남뷰티클리닉",
      status: "approved",
      role: "client",
      linkedUserId: "u-client-4",
      contractId: "c-4",
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
  const workOrders = buildSeedWorkOrders(contracts, partners);
  const clientUsers = buildClientUsersFromContracts(contracts);
  const demoQa = buildPlaceQaDemo();
  const sampleSatellite = buildSampleSatelliteData(
    contracts,
    DEMO_TODAY,
    MONTH_START,
    addDays,
  );
  const users = [
    ...buildStaffUsers(),
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
      ...clientUsers,
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
    ] satisfies User[];
  const partialData = {
    users,
    teams: [
      { id: "team-a", name: "마케팅 1팀", leaderId: "u-leader-1", executiveId: "u-exec-1" },
      { id: "team-b", name: "마케팅 2팀", leaderId: "u-leader-2", executiveId: "u-exec-1" },
      { id: "team-c", name: "마케팅 3팀", leaderId: "u-leader-2", executiveId: "u-exec-1" },
    ],
    contracts,
    executions,
    expenses,
    workOrders,
  };

  const dataWithConfig: AppData = {
    ...partialData,
    extensionApprovals: buildScaledExtensionApprovals(
      contracts,
      DEMO_TODAY,
      MONTH_START,
    ),
    bonusPayments: buildBonusPayments(contracts, bonusPolicy),
    bonusPolicy,
    fundBudget: {
      monthlyBudget: 12_000_000,
      expenseAllocated: 4_500_000,
      bonusAllocated: 850_000,
      operatingReserve: 6_650_000,
      clientDepositBankName: "국민은행",
      clientDepositAccountNumber: "737801-04-203835",
      clientDepositAccountHolder: "주식회사 트립잇코리아",
    },
    contractRecords,
    contractMemos,
    partners,
    accountProfiles: buildAccountProfiles(),
    taskChannels: [...DEFAULT_TASK_CHANNELS],
    expenseCategories: [...DEFAULT_EXPENSE_CATEGORIES],
    partnerFilterDefinitions: [...DEFAULT_PARTNER_FILTERS],
    experienceFieldDefinitions: [...DEFAULT_EXPERIENCE_FIELDS],
    partnerReferralLeads,
    experienceCampaigns: [
      ...buildDetailedExperienceCampaigns(),
      ...buildScaledExperienceCampaigns(contracts, DEMO_TODAY).filter(
        (campaign) =>
          campaign.contractId !== "c-3" &&
          campaign.contractId !== JEJU_OSEONG_CONTRACT_ID,
      ),
    ],
    experiencePartnerSlots: [],
    experienceParticipationProposals: [],
    postLinkOpinions: [
      ...buildPostLinkOpinions(),
      ...sampleSatellite.postLinkOpinions,
    ],
    workEvaluations: [],
    clientPortalActionDismissals: [],
    placeCredentials: [
      ...demoQa.placeCredentials,
      ...sampleSatellite.placeCredentials,
    ],
    qaThreads: [...demoQa.qaThreads, ...sampleSatellite.qaThreads],
    qaMessages: [...demoQa.qaMessages, ...sampleSatellite.qaMessages],
  };

  return applyJejuOseongOperationalSample({
    ...dataWithConfig,
    workEvaluations: buildWorkEvaluations(dataWithConfig),
  });
}

function buildWorkEvaluations(data: AppData): WorkEvaluation[] {
  const period = currentEvaluationPeriod(DEMO_TODAY);
  const samples: Array<{
    evaluatorId: string;
    evaluateeId: string;
    comment: string;
  }> = [
    {
      evaluatorId: "u-leader-1",
      evaluateeId: "u-staff-1",
      comment: "Q&A 대응 빠름 · 포스팅 품질 우수",
    },
    {
      evaluatorId: "u-leader-1",
      evaluateeId: "u-staff-2",
      comment: "체험단 일정 조율 안정적",
    },
    {
      evaluatorId: "u-exec-1",
      evaluateeId: "u-leader-1",
      comment: "팀 실행률 · 연장 전환 관리 우수",
    },
  ];

  return samples.map((sample, index) => {
    const evaluatee = data.users.find((user) => user.id === sample.evaluateeId)!;
    const metrics = computeEvaluationMetrics(data, evaluatee);
    const scores = computeAutoEvaluationScores(data, evaluatee, metrics);
    return {
      id: `wev-seed-${index + 1}`,
      ...buildWorkEvaluationInput({
        period,
        evaluatorId: sample.evaluatorId,
        evaluateeId: sample.evaluateeId,
        scores,
        metrics,
        comment: sample.comment,
      }),
    };
  });
}

function buildDetailedExperienceCampaigns(): ExperienceCampaign[] {
  const visitDate = addDays(MONTH_START, 12);
  return [
    {
      id: "exc-c3-1",
      contractId: "c-3",
      workOrderId: "wo-c-3-experience-1",
      title: "1차 체험단",
      sequence: 1,
      criteria: {
        targetHeadcount: 10,
        category: "맛집",
        requirements: "네이버 블로그 리뷰 · 사진 10장 이상 · 인스타 스토리",
        providedBenefit: "2인 코스 제공 + 주차 지원",
        notes: "평일 오후 선호",
      },
      schedulingStatus: "recruiting",
      proposals: [
        {
          id: "esp-1",
          proposedByUserId: "u-staff-3",
          visitDate,
          visitTime: "14:00",
          visitEndTime: "17:00",
          note: "1차 체험일 제안",
          createdAt: addDays(MONTH_START, 2),
          status: "accepted",
        },
      ],
      confirmedVisitDate: visitDate,
      confirmedVisitTime: "14:00",
      confirmedVisitEndTime: "17:00",
      participants: [
        {
          id: "exp-1",
          blogName: "맛집탐험가_kim",
          name: "김체험",
          contact: "010-1111-2222",
          experienceDate: visitDate,
          headcount: 2,
          memo: "평일 오후 가능",
          postUrl: "https://blog.naver.com/foodie_kim/review-1",
          postRegisteredAt: addDays(MONTH_START, 14),
          snsHandle: "foodie_kim",
          registeredAt: addDays(MONTH_START, 5),
          registeredByUserId: "u-staff-3",
        },
        {
          id: "exp-2",
          blogName: "review_lee",
          name: "이리뷰",
          experienceDate: visitDate,
          headcount: 1,
          memo: "인스타 스토리 예정",
          registeredAt: addDays(MONTH_START, 6),
          registeredByUserId: "u-staff-3",
        },
        {
          id: "exp-3",
          blogName: "박블로그일상",
          name: "박블로그",
          contact: "010-3333-4444",
          experienceDate: visitDate,
          headcount: 1,
          registeredAt: addDays(MONTH_START, 7),
          registeredByUserId: "u-leader-1",
        },
      ],
      sentToClientAt: addDays(MONTH_START, 1),
      confirmedAt: addDays(MONTH_START, 4),
      confirmedByUserId: "u-client-1",
      createdByUserId: "u-staff-3",
      createdAt: addDays(MONTH_START, 1),
      updatedAt: addDays(MONTH_START, 7),
    },
    {
      id: "exc-c3-2",
      contractId: "c-3",
      title: "2차 체험단",
      sequence: 2,
      criteria: {
        targetHeadcount: 8,
        category: "맛집",
        requirements: "릴스 1개 + 블로그",
        providedBenefit: "점심 코스",
        notes: "주말 가능자 우대",
      },
      schedulingStatus: "coordinating",
      proposals: [
        {
          id: "esp-2",
          proposedByUserId: "u-staff-3",
          visitDate: addDays(MONTH_START, 20),
          visitTime: "11:00",
          visitEndTime: "14:00",
          note: "2차 후보일",
          createdAt: addDays(MONTH_START, 8),
          status: "pending",
        },
      ],
      participants: [],
      sentToClientAt: addDays(MONTH_START, 8),
      createdByUserId: "u-staff-3",
      createdAt: addDays(MONTH_START, 8),
      updatedAt: addDays(MONTH_START, 8),
    },
  ];
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
        placeUrl: "https://map.naver.com/p/search/제주%20오성",
        loginId: "learning2021",
        password: "p0o9i8u7y6!",
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

let demoUsersCache: User[] | null = null;
let seedAuthCache: { users: User[]; accountProfiles: AccountProfile[] } | null =
  null;

function getDemoUsersSnapshot(): User[] {
  if (!demoUsersCache) demoUsersCache = createSeedData().users;
  return demoUsersCache;
}

/** 로그인 매칭용 시드 사용자·계정 프로필 스냅샷 */
export function getSeedAuthDirectory(): {
  users: User[];
  accountProfiles: AccountProfile[];
} {
  if (!seedAuthCache) {
    const seed = createSeedData();
    seedAuthCache = {
      users: seed.users,
      accountProfiles: seed.accountProfiles,
    };
  }
  return seedAuthCache;
}

/** 데모 역할 전환 시 시드 사용자와 일치하도록 복구 */
export function resolveDemoRoleUser(role: UserRole, users: User[]): User {
  const demoId = DEMO_USER_BY_ROLE[role as keyof typeof DEMO_USER_BY_ROLE];
  if (demoId) {
    const byId = users.find((user) => user.id === demoId);
    if (byId) return byId;
  }

  const byRole = users.find((user) => user.role === role);
  if (byRole) return byRole;

  const seedUsers = getDemoUsersSnapshot();
  if (demoId) {
    const seedById = seedUsers.find((user) => user.id === demoId);
    if (seedById) return seedById;
  }

  const seedByRole = seedUsers.find((user) => user.role === role);
  if (seedByRole) return seedByRole;

  return users[0] ?? seedUsers[0]!;
}
