import type {
  Contract,
  ExecutionStatus,
  ExperienceCampaign,
  ExtensionApproval,
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

export const SEED_SCALE = 10;
export const SEED_COMPLETION_RATE = 20;

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
  const bucket = seedPercent(contractIndex, slot);
  if (bucket < SEED_COMPLETION_RATE) {
    return { status: "completed", completedCount: target };
  }
  if (bucket < 48) {
    const partial = Math.max(
      1,
      Math.min(target - 1, Math.floor((target * (bucket % 15)) / 15) + 1),
    );
    return { status: "in_progress", completedCount: partial };
  }
  if (bucket < 58) {
    const partial = Math.max(1, Math.floor(target * 0.35));
    return { status: "delayed", completedCount: partial };
  }
  return { status: "pending", completedCount: 0 };
}

export function pickWorkOrderStage(
  contractIndex: number,
  taskType: string,
  sequence: number,
): WorkOrderStage {
  const bucket = seedPercent(contractIndex, taskType, sequence);
  if (bucket < 10) return "order_ready";
  if (bucket < SEED_COMPLETION_RATE) return "paid";
  if (bucket < 34) return "pending_approval";
  if (bucket < 48) return "approved";
  if (bucket < 66) return "delivered";
  if (bucket < 80) return "draft";
  if (bucket < 86) return "rejected";
  return "pending_approval";
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
  return {};
}

function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
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
    memo: "서울맛집연구소 고객 소개 완료",
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
  const pending = contracts
    .filter(
      (contract, index) =>
        contract.status === "active" &&
        !contract.isExtension &&
        seedPercent(index, "ext-pending") < 12,
    )
    .slice(0, 24)
    .map((contract, index) => ({
      id: `ext-p-${index + 1}`,
      contractId: contract.id,
      requestedBy: contract.assignedStaffId,
      status: "pending" as const,
      createdAt: addDaysIso(demoToday, -(index % 8) - 1),
    }));

  const approved = contracts
    .filter(
      (contract, index) =>
        contract.isExtension && seedPercent(index, "ext-approved") < 8,
    )
    .slice(0, 12)
    .map((contract, index) => ({
      id: `ext-a-${index + 1}`,
      contractId: contract.id,
      requestedBy: contract.assignedStaffId,
      status: "approved" as const,
      createdAt: addDaysIso(monthStart, 4 + index),
    }));

  const rejected = contracts
    .filter(
      (contract, index) =>
        contract.status === "active" &&
        seedPercent(index, "ext-rejected") < 4,
    )
    .slice(0, 8)
    .map((contract, index) => ({
      id: `ext-r-${index + 1}`,
      contractId: contract.id,
      requestedBy: contract.assignedStaffId,
      status: "rejected" as const,
      createdAt: addDaysIso(monthStart, 10 + index),
    }));

  return [...pending, ...approved, ...rejected];
}

export function buildScaledExperienceCampaigns(
  contracts: Contract[],
  monthStart: string,
  demoToday: string,
): ExperienceCampaign[] {
  const statuses: ExperienceCampaign["schedulingStatus"][] = [
    "draft",
    "coordinating",
    "confirmed",
    "recruiting",
    "completed",
    "cancelled",
  ];

  return contracts
    .filter(
      (contract, index) =>
        contract.status === "active" &&
        contract.targetExperience > 0 &&
        seedPercent(index, "experience") < 18,
    )
    .slice(0, 36)
    .map((contract, index) => {
      const visitDate = addDaysIso(monthStart, 8 + (index % 18));
      const status = statuses[seedPercent(index, "exc-status") % statuses.length];
      const headcount = 6 + (index % 6);

      return {
        id: `exc-${contract.id}-${index + 1}`,
        contractId: contract.id,
        title: `${index % 3 === 0 ? "1차" : index % 3 === 1 ? "2차" : "프리미엄"} 체험단`,
        sequence: (index % 3) + 1,
        criteria: {
          targetHeadcount: headcount,
          category: ["맛집", "뷰티", "숙박", "카페", "문화"][index % 5],
          requirements:
            index % 2 === 0
              ? "네이버 블로그 · 사진 10장"
              : "릴스 1개 + 블로그",
          providedBenefit:
            index % 2 === 0 ? "2인 코스 제공" : "점심 코스 + 주차",
          notes: index % 4 === 0 ? "주말 가능자 우대" : "평일 오후 선호",
        },
        schedulingStatus: status,
        proposals:
          status === "draft"
            ? []
            : [
                {
                  id: `esp-${contract.id}-${index}`,
                  proposedByUserId: contract.assignedStaffId,
                  visitDate,
                  visitTime: index % 2 === 0 ? "14:00" : "11:00",
                  visitEndTime: index % 2 === 0 ? "17:00" : "14:00",
                  note: "체험일 제안",
                  createdAt: addDaysIso(monthStart, 2 + (index % 5)),
                  status:
                    status === "confirmed" || status === "recruiting"
                      ? ("accepted" as const)
                      : ("pending" as const),
                },
              ],
        confirmedVisitDate:
          status === "confirmed" || status === "recruiting" || status === "completed"
            ? visitDate
            : undefined,
        participants:
          status === "recruiting" || status === "completed"
            ? Array.from({ length: Math.min(headcount, 3) }, (_, pi) => ({
                id: `exp-${contract.id}-${index}-${pi}`,
                blogName: `reviewer_${contract.id}_${pi}`,
                name: `체험단${pi + 1}`,
                contact: `010-12${index}${pi}0-0000`,
                experienceDate: visitDate,
                headcount: pi === 0 ? 2 : 1,
                memo: pi === 0 ? "평일 가능" : undefined,
                postUrl:
                  pi === 0 && status === "completed"
                    ? `https://blog.naver.com/tripit-exp-${contract.id}-${pi}`
                    : undefined,
                postRegisteredAt:
                  pi === 0 && status === "completed"
                    ? addDaysIso(visitDate, 2)
                    : undefined,
                registeredAt: addDaysIso(monthStart, 4 + pi),
                registeredByUserId: contract.assignedStaffId,
              }))
            : [],
        sentToClientAt:
          status === "draft" ? undefined : addDaysIso(monthStart, 1 + (index % 3)),
        createdByUserId: contract.assignedStaffId,
        createdAt: addDaysIso(monthStart, 1 + (index % 4)),
        updatedAt: addDaysIso(demoToday, -(index % 5)),
      };
    });
}
