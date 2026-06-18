import type {
  Contract,
  ContractRecord,
  ExecutionStatus,
  ExperienceCampaign,
  ExtensionApproval,
  PostLinkOpinion,
  PlaceCredentials,
  QaMessage,
  QaThread,
  User,
  WorkOrder,
  WorkOrderCostLine,
  WorkOrderStage,
} from "./types";
import { DEFAULT_TASK_CHANNELS } from "./task-channel-utils";
import {
  emptyCostLines,
  generateWorkOrdersForContract,
  buildReferralCostLines,
} from "./work-order-utils";
import type { Partner } from "./types";
import { JEJU_OSEONG_CONTRACT_ID } from "./jeju-oseong-operational-data";

/** 제주 오성 중심 단일 스케일 — 8개 샘플 클라이언트 */
export const SEED_SCALE = 1;
/** 샘플 데이터 목표 실행·달성률(%) — 제주 오성 기준 ~70% */
export const SEED_COMPLETION_RATE = 70;
export const SEED_YEAR_MONTH_COUNT = 3;

const CLIENT_NAME_SUFFIXES = [
  "",
  " ·강남",
  " ·홍대",
  " ·신규",
  " ·2호점",
  " ·프리미엄",
  " ·리뉴얼",
  " ·서브",
  " ·지점",
  " ·센터",
];

const STAFF_NAMES = [
  "김민지",
  "정하늘",
  "윤서아",
  "한지우",
  "오지훈",
  "서예린",
  "임도현",
  "배수진",
  "노태양",
  "황미래",
  "장현우",
  "문채원",
];

const TEAM_IDS = ["team-a", "team-b", "team-c"] as const;

const PARTNER_IDS_BY_PREFIX: Record<string, string[]> = {
  blog: ["p-blog-1", "p-blog-2"],
  influencer: ["p-inf-1", "p-inf-2"],
  experience: ["p-exp-1", "p-exp-2"],
  press: ["p-press-1", "p-press-2"],
  insta: ["p-inf-1", "p-multi-2"],
  referral: ["p-referral-1"],
};

export function seedHash(...parts: (string | number)[]): number {
  let hash = 2166136261;
  for (const part of parts) {
    const value = String(part);
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  }
  return hash >>> 0;
}

export function seedPercent(...parts: (string | number)[]): number {
  return seedHash(...parts) % 100;
}

export function isSeedCompleted(...parts: (string | number)[]): boolean {
  return seedPercent(...parts) < SEED_COMPLETION_RATE;
}

export function buildScaledClientNames(baseNames: readonly string[]): string[] {
  const names: string[] = [];
  for (let scale = 0; scale < SEED_SCALE; scale++) {
    for (let i = 0; i < baseNames.length; i++) {
      const suffix = CLIENT_NAME_SUFFIXES[scale] ?? ` ·${scale + 1}`;
      const label =
        scale === 0 ? baseNames[i] : `${baseNames[i]}${suffix}`;
      names.push(label);
    }
  }
  return names;
}

export function buildStaffPool(): string[] {
  return STAFF_NAMES.map((_, i) => `u-staff-${i + 1}`);
}

export function buildStaffUsers(): User[] {
  return STAFF_NAMES.map((name, i) => ({
    id: `u-staff-${i + 1}`,
    name,
    role: "staff" as const,
    isFinancialViewer: false,
    teamId: TEAM_IDS[i % TEAM_IDS.length],
    ...(i === 0 && {
      googleId: "demo-google-staff",
      email: "staff@tripit.co.kr",
    }),
  }));
}

export function staffIdForIndex(index: number): string {
  return buildStaffPool()[index % buildStaffPool().length];
}

export function teamIdForIndex(index: number): string {
  return TEAM_IDS[index % TEAM_IDS.length];
}

export function resolveExecutionProgress(
  contractIndex: number,
  slot: "optimized" | "influencer",
  target: number,
): {
  status: ExecutionStatus;
  completedCount: number;
} {
  if (target <= 0) {
    return { status: "pending", completedCount: 0 };
  }

  const bucket = seedPercent(contractIndex, slot);
  // 50~90% 구간 · 평균 약 70% 달성
  const ratioPct = 50 + (bucket % 41);
  const completedCount = Math.min(
    target,
    Math.max(1, Math.round((target * ratioPct) / 100)),
  );

  if (completedCount >= target) {
    return { status: "completed", completedCount: target };
  }
  if (ratioPct >= 74) {
    return { status: "in_progress", completedCount };
  }
  if (ratioPct >= 62) {
    return { status: "delayed", completedCount };
  }
  return {
    status: "pending",
    completedCount: Math.max(0, completedCount - 1),
  };
}

export function pickWorkOrderStage(
  contractIndex: number,
  taskType: string,
  sequence: number,
): WorkOrderStage {
  const bucket = seedPercent(contractIndex, taskType, sequence);
  // 가중 진행률 평균 ~81% (order_ready 100 · paid 90 · delivered 75 …)
  if (bucket < 15) return "order_ready";
  if (bucket < 63) return "paid";
  if (bucket < 85) return "delivered";
  if (bucket < 93) return "approved";
  if (bucket < 97) return "pending_approval";
  if (bucket < 98) return "cancelled";
  if (bucket < 99) return "on_hold";
  if (bucket < 100) return "postponed";
  return "draft";
}

function partnerPoolForTask(taskType: string): string[] {
  if (taskType.includes("blog")) return PARTNER_IDS_BY_PREFIX.blog;
  if (taskType.includes("influencer")) return PARTNER_IDS_BY_PREFIX.influencer;
  if (taskType.includes("experience")) return PARTNER_IDS_BY_PREFIX.experience;
  if (taskType.includes("press")) return PARTNER_IDS_BY_PREFIX.press;
  if (taskType.includes("insta")) return PARTNER_IDS_BY_PREFIX.insta;
  if (taskType.includes("referral")) return PARTNER_IDS_BY_PREFIX.referral;
  return PARTNER_IDS_BY_PREFIX.blog;
}

function pickPartnerId(
  taskType: string,
  contract: Contract,
  contractIndex: number,
  sequence: number,
): string | undefined {
  if (taskType.includes("referral")) {
    return contract.referrerPartnerId ?? "p-referral-1";
  }
  const pool = partnerPoolForTask(taskType);
  return pool[seedPercent(contractIndex, taskType, sequence) % pool.length];
}

function defaultCostLines(
  taskType: string,
  contract: Contract,
  partnerId: string | undefined,
  partners: Partner[],
): WorkOrderCostLine[] {
  if (taskType.includes("referral")) {
    return buildReferralCostLines(contract.monthlyFee);
  }
  const partner = partners.find((item) => item.id === partnerId);
  const unit = partner?.unitPrice ?? 50_000;
  const variant = seedPercent(contract.id, taskType) % 4;
  if (variant === 0) {
    return [
      { type: "manuscript", amount: unit },
      { type: "filming", amount: 0 },
      { type: "travel", amount: 0 },
      { type: "other", amount: 0 },
    ];
  }
  if (variant === 1) {
    return [
      { type: "manuscript", amount: 0 },
      { type: "filming", amount: Math.round(unit * 1.2) },
      { type: "travel", amount: Math.round(unit * 0.1) },
      { type: "other", amount: 0 },
    ];
  }
  if (variant === 2) {
    return [
      { type: "manuscript", amount: Math.round(unit * 0.6) },
      { type: "filming", amount: 0 },
      { type: "travel", amount: Math.round(unit * 0.15) },
      { type: "other", amount: 5_000 },
    ];
  }
  return emptyCostLines();
}

function stageTimestamps(
  stage: WorkOrderStage,
  contract: Contract,
  workStart: string,
): Partial<WorkOrder> {
  const approvedAt = addDaysIso(workStart, 2);
  const deliveredAt = addDaysIso(workStart, 5);
  const paidAt = addDaysIso(workStart, 8);

  if (stage === "draft") return {};
  if (stage === "rejected") {
    return {
      requestedBy: contract.assignedStaffId,
      requestedAt: workStart,
      rejectedReason: "견적 · 일정 재조율 필요",
    };
  }
  if (stage === "pending_approval") {
    return {
      requestedBy: contract.assignedStaffId,
      requestedAt: workStart,
    };
  }
  if (stage === "approved") {
    return {
      requestedBy: contract.assignedStaffId,
      requestedAt: workStart,
      approvedBy: "u-partner-1",
      approvedAt,
    };
  }
  if (stage === "delivered") {
    return {
      requestedBy: contract.assignedStaffId,
      requestedAt: workStart,
      approvedBy: "u-partner-1",
      approvedAt,
      deliveredAt,
      postLinks: [
        {
          id: `pl-${contract.id}-${workStart}`,
          url: `https://blog.naver.com/tripit-${contract.id}-${workStart.slice(8)}`,
          dueDate: contract.contractEndDate,
          completedDate: deliveredAt,
          enteredAt: deliveredAt,
        },
      ],
    };
  }
  if (stage === "paid" || stage === "order_ready") {
    return {
      requestedBy: contract.assignedStaffId,
      requestedAt: workStart,
      approvedBy: "u-partner-1",
      approvedAt,
      deliveredAt,
      paidAt,
      paidBy: contract.assignedStaffId,
      postLinks: [
        {
          id: `pl-done-${contract.id}-${workStart}`,
          url: `https://blog.naver.com/tripit-done-${contract.id}`,
          dueDate: contract.contractEndDate,
          completedDate: paidAt,
          enteredAt: paidAt,
        },
      ],
      memo: stage === "order_ready" ? "오더 준비 완료" : "입금 확인 · 실행 완료",
    };
  }
  if (stage === "cancelled") {
    return {
      requestedBy: contract.assignedStaffId,
      requestedAt: workStart,
      approvedBy: "u-partner-1",
      approvedAt,
      memo: "고객 요청으로 업무 취소",
    };
  }
  if (stage === "on_hold") {
    return {
      requestedBy: contract.assignedStaffId,
      requestedAt: workStart,
      approvedBy: "u-partner-1",
      approvedAt,
      previousStage: "approved" as const,
      memo: "파트너 일정 조율 · 일시 보류",
    };
  }
  if (stage === "postponed") {
    const newDue = addDaysIso(workStart, 14);
    return {
      requestedBy: contract.assignedStaffId,
      requestedAt: workStart,
      approvedBy: "u-partner-1",
      approvedAt,
      previousStage: "approved" as const,
      postponedDueDate: newDue,
      dueDate: newDue,
      memo: "고객 일정 변경 · 마감 연기",
    };
  }
  return {};
}

function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addMonthsIso(iso: string, months: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

/** 데모 기준일 포함 최근 N개월 (YYYY-MM) */
export function buildYearMonths(
  anchorDate: string,
  count = SEED_YEAR_MONTH_COUNT,
): string[] {
  const anchor = new Date(`${anchorDate}T12:00:00`);
  const months: string[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    const d = new Date(anchor);
    d.setMonth(d.getMonth() - offset);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return months;
}

function lastDayOfMonth(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const last = new Date(year, month, 0).getDate();
  return `${period}-${String(last).padStart(2, "0")}`;
}

export function clientUserIdForContract(contractId: string): string {
  return `u-client-${contractId.replace("c-", "")}`;
}

/** 로그인 데모용 고객사 포털 계정 (contract num → 이메일·googleId) */
export const CLIENT_DEMO_PORTAL_ACCOUNTS: Record<
  string,
  { email: string; googleId: string }
> = {
  "1": { email: "client@jejuoseong.kr", googleId: "demo-google-client" },
  "2": { email: "client@haeundae.kr", googleId: "demo-google-client-2" },
  "3": { email: "client@jejuorum.kr", googleId: "demo-google-client-3" },
  "4": { email: "client@beautyclinic.kr", googleId: "demo-google-client-4" },
};

/** 고객사 포털 계정 — 대부분 계약에 1:1 매핑 */
export function buildClientUsersFromContracts(contracts: Contract[]): User[] {
  return contracts
    .filter((c) => c.status === "active")
    .map((c) => {
      const num = c.id.replace("c-", "");
      const demo = CLIENT_DEMO_PORTAL_ACCOUNTS[num];
      return {
        id: clientUserIdForContract(c.id),
        name: c.clientName,
        role: "client" as const,
        isFinancialViewer: false,
        contractId: c.id,
        email: demo?.email ?? `portal-${num}@demo.tripit.kr`,
        ...(demo?.googleId && { googleId: demo.googleId }),
      };
    });
}

export function buildYearContractRecords(
  contracts: Contract[],
  demoToday: string,
): ContractRecord[] {
  const months = buildYearMonths(demoToday);
  const staffIds = buildStaffPool();
  const records: ContractRecord[] = [];

  contracts.forEach((c, i) => {
    months.forEach((period, mi) => {
      const startedAt = `${period}-01`;
      const endedAt = lastDayOfMonth(period);

      if (c.contractStartDate > endedAt) return;
      if (c.status === "terminated" && c.terminatedAt && c.terminatedAt < startedAt) {
        return;
      }

      const staffIndex = (i + mi) % staffIds.length;
      const feeDelta = (mi % 4) * 25_000 - 25_000;
      const isExtensionMonth =
        c.isExtension && mi >= months.length - (3 + (i % 4));

      records.push({
        id: `cr-${c.id}-${period}`,
        contractId: c.id,
        period,
        assignedStaffId: staffIds[staffIndex],
        teamId: c.teamId,
        startedAt,
        endedAt:
          c.status === "terminated" &&
          c.terminatedAt &&
          c.terminatedAt.startsWith(period)
            ? c.terminatedAt
            : undefined,
        monthlyFee: Math.max(400_000, c.monthlyFee + feeDelta),
        isExtension: isExtensionMonth,
        ...(c.status === "terminated" &&
          c.terminatedAt?.startsWith(period) && {
            terminationReason: c.terminationReason,
            note: "계약 해지",
          }),
        ...(!c.terminatedAt?.startsWith(period) && {
          note:
            mi === months.length - 1
              ? "현재 진행 회차"
              : mi % 5 === 0
                ? "담당자 변경"
                : mi % 7 === 0
                  ? "재계약 조건 반영"
                  : undefined,
        }),
      });
    });
  });

  return records;
}

const EXPERIENCE_CATEGORIES = ["food", "beauty", "travel", "lifestyle"] as const;
const EXPERIENCE_CATEGORY_LABELS: Record<string, string> = {
  food: "맛집",
  beauty: "뷰티",
  travel: "여행",
  lifestyle: "라이프스타일",
};
const EXPERIENCE_TITLES = ["1차", "2차", "3차", "프리미엄", "스페셜", "재모집"] as const;

const QA_SUBJECTS = [
  "플레이스 대표 사진 변경 요청",
  "영업시간 수정 문의",
  "메뉴 사진 등록 방법",
  "예약 버튼 노출 문의",
  "리뷰 답글 등록 요청",
  "체험단 일정 확인",
  "월간 리포트 수신 확인",
  "키워드 노출 순위 문의",
  "신규 메뉴 반영 요청",
  "주차 안내 수정",
  "블로그 포스팅 검수 의견",
  "인스타 연동 문의",
  "할인 이벤트 배너 등록",
  "플레이스 카테고리 변경",
  "해시태그 추천 요청",
];

const QA_CLIENT_MESSAGES = [
  "확인 부탁드립니다. 가능한 빠른 시일 내 반영해 주세요.",
  "첨부한 이미지로 교체 가능할까요?",
  "다음 주 월요일까지 처리 가능한지 알려주세요.",
  "고객 문의가 많아서 급합니다. 답변 부탁드려요.",
  "지난번 요청과 동일한 내용인데 아직 반영이 안 된 것 같습니다.",
  "모바일에서만 안 보이는 것 같아요. 확인해 주세요.",
  "감사합니다. 추가로 영업시간도 함께 수정해 주시면 좋겠습니다.",
  "체험단 방문 인원 2명으로 변경 가능한가요?",
  "포스팅 링크 확인해 주시고 피드백 주세요.",
  "네이버 예약 연동 상태를 다시 점검해 주세요.",
];

const QA_STAFF_REPLIES = [
  "확인했습니다. 내일 오전 중 반영 예정입니다.",
  "플레이스 관리자 권한으로 수정 진행하겠습니다.",
  "체험단 일정은 고객사 확인 후 확정 안내드리겠습니다.",
  "검수 완료했습니다. 수정 사항 반영했습니다.",
  "담당 파트너와 조율 중이며 금주 내 완료 예정입니다.",
  "요청하신 키워드로 재등록했습니다. 확인 부탁드립니다.",
];

export function buildYearPlaceQa(
  _contracts: Contract[],
  _demoToday: string,
): {
  qaThreads: QaThread[];
  qaMessages: QaMessage[];
} {
  // sample-client-seed + buildPlaceQaDemo가 QA를 담당
  return { qaThreads: [], qaMessages: [] };
}

export function buildYearPlaceCredentials(
  _contracts: Contract[],
  _demoToday: string,
): PlaceCredentials[] {
  // sample-client-seed + buildPlaceQaDemo가 플레이스 계정 담당
  return [];
}

export function buildYearPostLinkOpinions(
  _contracts: Contract[],
  _demoToday: string,
): PostLinkOpinion[] {
  // sample-client-seed + buildPostLinkOpinions가 의견 담당
  return [];
}

export function buildScaledExperienceCampaigns(
  contracts: Contract[],
  demoToday: string,
): ExperienceCampaign[] {
  const months = buildYearMonths(demoToday);
  const statuses: ExperienceCampaign["schedulingStatus"][] = [
    "draft",
    "coordinating",
    "confirmed",
    "recruiting",
    "completed",
    "cancelled",
  ];

  const campaigns: ExperienceCampaign[] = [];
  let globalSeq = 0;

  contracts.forEach((contract, contractIndex) => {
    if (contract.id === JEJU_OSEONG_CONTRACT_ID) return;
    if (contract.id === "c-3") return;
    if (contract.status !== "active" || contract.targetExperience <= 0) return;

    const campaignCount = 1;
    const clientId = clientUserIdForContract(contract.id);

    for (let seq = 0; seq < campaignCount; seq++) {
      globalSeq += 1;
      const monthPeriod = months[(contractIndex + seq * 2) % months.length];
      const monthStart = `${monthPeriod}-01`;
      const visitDay = 5 + (seedPercent(contractIndex, seq, "visit") % 20);
      const visitDate = addDaysIso(monthStart, visitDay);

      const status =
        statuses[seedPercent(contractIndex, seq, "exc-status") % statuses.length];
      const headcount = 4 + (seedPercent(contractIndex, seq) % 9);
      const categoryKey =
        EXPERIENCE_CATEGORIES[
          seedPercent(contractIndex, seq, "cat") % EXPERIENCE_CATEGORIES.length
        ];
      const title =
        EXPERIENCE_TITLES[
          seedPercent(contractIndex, seq, "title") % EXPERIENCE_TITLES.length
        ];

      const hasClientResponse =
        status !== "draft" && seedPercent(contractIndex, seq, "client") < 88;
      const proposalCount = status === "draft" ? 0 : 1 + (seq % 2);
      const proposals = Array.from({ length: proposalCount }, (_, pi) => {
        const propVisit = addDaysIso(visitDate, pi * 3);
        const propStatusBucket = seedPercent(contractIndex, seq, pi, "prop");
        let propStatus: "pending" | "accepted" | "rejected" = "pending";
        if (status === "confirmed" || status === "recruiting" || status === "completed") {
          propStatus = pi === 0 ? "accepted" : propStatusBucket < 40 ? "rejected" : "pending";
        } else if (status === "cancelled") {
          propStatus = "rejected";
        }
        return {
          id: `esp-${contract.id}-${globalSeq}-${pi}`,
          proposedByUserId: contract.assignedStaffId,
          visitDate: propVisit,
          visitTime: pi % 2 === 0 ? "14:00" : "11:00",
          visitEndTime: pi % 2 === 0 ? "17:00" : "14:00",
          note:
            pi === 0
              ? "체험일 1차 제안"
              : "대체 일정 제안 (고객사 검토)",
          createdAt: addDaysIso(monthStart, 1 + pi),
          status: propStatus,
        };
      });

      const participantCount =
        status === "recruiting" || status === "completed"
          ? Math.min(headcount, 3 + (seq % 4))
          : 0;

      campaigns.push({
        id: `exc-${contract.id}-${seq + 1}`,
        contractId: contract.id,
        title: `${title} 체험단`,
        sequence: seq + 1,
        criteria: {
          targetHeadcount: headcount,
          category: EXPERIENCE_CATEGORY_LABELS[categoryKey] ?? categoryKey,
          requirements:
            seq % 3 === 0
              ? "네이버 블로그 · 사진 10장 이상"
              : seq % 3 === 1
                ? "릴스 1개 + 블로그"
                : "인스타 피드 + 스토리",
          providedBenefit:
            seq % 2 === 0 ? "2인 코스 제공 + 주차" : "점심 코스 · 음료 포함",
          notes:
            seq % 4 === 0
              ? "주말 가능자 우대"
              : seq % 4 === 1
                ? "평일 오후 선호"
                : "알러지 정보 사전 공유",
        },
        schedulingStatus: status,
        proposals,
        confirmedVisitDate:
          status === "confirmed" ||
          status === "recruiting" ||
          status === "completed"
            ? visitDate
            : undefined,
        confirmedVisitTime: status !== "draft" && status !== "cancelled" ? "14:00" : undefined,
        confirmedVisitEndTime:
          status !== "draft" && status !== "cancelled" ? "17:00" : undefined,
        participants: Array.from({ length: participantCount }, (_, pi) => ({
          id: `exp-${contract.id}-${globalSeq}-${pi}`,
          blogName: `reviewer_${contract.id}_${pi}`,
          name: `체험단${pi + 1}`,
          contact: `010-${String(1000 + contractIndex).slice(-4)}-${String(2000 + pi).slice(-4)}`,
          experienceDate: visitDate,
          headcount: pi === 0 ? 2 : 1,
          memo: pi % 2 === 0 ? "평일 가능" : "주말 가능",
          postUrl:
            status === "completed" && pi < 2
              ? `https://blog.naver.com/tripit-exp-${contract.id}-${pi}`
              : undefined,
          postRegisteredAt:
            status === "completed" && pi < 2
              ? addDaysIso(visitDate, 2 + pi)
              : undefined,
          registeredAt: addDaysIso(monthStart, 3 + pi),
          registeredByUserId: contract.assignedStaffId,
        })),
        sentToClientAt:
          status === "draft" ? undefined : addDaysIso(monthStart, 1),
        ...(hasClientResponse &&
          (status === "confirmed" ||
            status === "recruiting" ||
            status === "completed") && {
            confirmedAt: addDaysIso(monthStart, 4),
            confirmedByUserId: clientId,
          }),
        createdByUserId: contract.assignedStaffId,
        createdAt: addDaysIso(monthStart, 1),
        updatedAt: addDaysIso(demoToday, -(globalSeq % 30)),
      });
    }
  });

  return campaigns;
}

export function buildScaledWorkOrders(
  contracts: Contract[],
  partners: Partner[],
  monthStart: string,
): WorkOrder[] {
  const orders: WorkOrder[] = [];

  contracts.forEach((contract, contractIndex) => {
    if (contract.status !== "active") return;

    const generated = generateWorkOrdersForContract(
      contract,
      orders,
      DEFAULT_TASK_CHANNELS,
    );

    for (const item of generated) {
      const stage = pickWorkOrderStage(
        contractIndex,
        item.taskType,
        item.sequence,
      );
      const partnerId = pickPartnerId(
        item.taskType,
        contract,
        contractIndex,
        item.sequence,
      );
      const workStart = addDaysIso(monthStart, (contractIndex % 14) + 1);
      const costLines =
        item.costLines.length > 0
          ? item.costLines
          : defaultCostLines(item.taskType, contract, partnerId, partners);

      orders.push({
        ...item,
        id: `wo-${contract.id}-${item.taskType}-${item.sequence}`,
        stage,
        partnerId,
        costLines,
        postLinks: item.postLinks ?? [],
        memo: item.memo || undefined,
        ...stageTimestamps(stage, contract, workStart),
      });
    }
  });

  return applyDemoWorkOrderOverrides(orders, contracts, monthStart);
}

function applyDemoWorkOrderOverrides(
  orders: WorkOrder[],
  contracts: Contract[],
  monthStart: string,
): WorkOrder[] {
  const byId = new Map(orders.map((order) => [order.id, order]));
  const patch = (id: string, next: Partial<WorkOrder>) => {
    const current = byId.get(id);
    if (current) byId.set(id, { ...current, ...next });
  };

  patch("wo-c-1-blog-1", {
    partnerId: "p-blog-1",
    stage: "pending_approval",
    costLines: [
      { type: "manuscript", amount: 45_000 },
      { type: "filming", amount: 0 },
      { type: "travel", amount: 0 },
      { type: "other", amount: 5_000 },
    ],
    requestedBy: "u-staff-1",
    requestedAt: addDaysIso(monthStart, 4),
  });
  patch("wo-c-1-influencer-1", {
    partnerId: "p-inf-1",
    stage: "approved",
    costLines: [
      { type: "manuscript", amount: 0 },
      { type: "filming", amount: 280_000 },
      { type: "travel", amount: 30_000 },
      { type: "other", amount: 0 },
    ],
    approvedBy: "u-partner-3",
    approvedAt: addDaysIso(monthStart, 6),
    requestedBy: "u-staff-1",
    requestedAt: addDaysIso(monthStart, 5),
  });
  patch("wo-c-1-referral-1", {
    partnerId: "p-referral-1",
    stage: "pending_approval",
    memo: "서울맛집연구소 리셀러 고객 등록 완료",
    requestedBy: "u-staff-1",
    requestedAt: addDaysIso(monthStart, 2),
  });
  patch("wo-c-2-blog-1", {
    partnerId: "p-blog-1",
    stage: "delivered",
    deliveredAt: addDaysIso(monthStart, 8),
    requestedBy: "u-staff-2",
    requestedAt: addDaysIso(monthStart, 3),
    approvedBy: "u-partner-2",
    approvedAt: addDaysIso(monthStart, 5),
  });
  patch("wo-c-3-experience-1", {
    partnerId: "p-exp-1",
    stage: "order_ready",
    paidAt: addDaysIso(monthStart, 12),
    paidBy: "u-staff-3",
    deliveredAt: addDaysIso(monthStart, 11),
    memo: "체험단 10명 모집 완료",
  });

  return Array.from(byId.values());
}

export function buildScaledExtensionApprovals(
  contracts: Contract[],
  demoToday: string,
  monthStart: string,
): ExtensionApproval[] {
  const c6 = contracts.find((c) => c.id === "c-6");
  const c7 = contracts.find((c) => c.id === "c-7");

  const pending: ExtensionApproval[] = c6
    ? [
        {
          id: "ext-p-1",
          contractId: "c-6",
          requestedBy: c6.assignedStaffId,
          status: "pending" as const,
          createdAt: addDaysIso(demoToday, -3),
        },
        {
          id: "ext-p-2",
          contractId: "c-6",
          requestedBy: c6.assignedStaffId,
          status: "pending" as const,
          createdAt: addDaysIso(demoToday, -1),
        },
      ]
    : [];

  const approved: ExtensionApproval[] = c7
    ? [
        {
          id: "ext-a-1",
          contractId: "c-7",
          requestedBy: c7.assignedStaffId,
          status: "approved" as const,
          createdAt: addDaysIso(monthStart, 4),
        },
        {
          id: "ext-a-2",
          contractId: "c-7",
          requestedBy: c7.assignedStaffId,
          status: "approved" as const,
          createdAt: addDaysIso(monthStart, 8),
        },
      ]
    : [];

  const rejected: ExtensionApproval[] = contracts
    .filter(
      (contract) =>
        contract.status === "active" &&
        contract.id !== "c-6" &&
        contract.id !== "c-7" &&
        !contract.isExtension,
    )
    .slice(0, 1)
    .map((contract, index) => ({
      id: `ext-r-${index + 1}`,
      contractId: contract.id,
      requestedBy: contract.assignedStaffId,
      status: "rejected" as const,
      createdAt: addDaysIso(monthStart, 10 + index),
    }));

  return [...pending, ...approved, ...rejected];
}
