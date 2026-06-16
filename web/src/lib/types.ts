export type UserRole =
  | "staff"
  | "team_leader"
  | "executive"
  | "ceo"
  | "finance_manager"
  | "partner"
  | "client";

export type ExecutionType = "optimized" | "influencer" | "experience" | "press";
export type ExecutionStatus = "pending" | "in_progress" | "completed" | "delayed";
export type ExpenseCategory = string;
export type PayoutStatus =
  | "unpaid"
  | "pending_approval"
  | "pending_transfer"
  | "paid";

export type ContractStatus = "active" | "terminated";

export type TerminationReason =
  | "budget_reduction"
  | "competitor_switch"
  | "performance_issue"
  | "client_request"
  | "service_complete"
  | "other";

export type PipelineCategory =
  | "in_progress"
  | "extension_imminent"
  | "contract_ending";

export interface Team {
  id: string;
  name: string;
  leaderId?: string;
  executiveId?: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  isFinancialViewer: boolean;
  teamId?: string;
  /** partner 역할일 때 연결 파트너사 */
  partnerId?: string;
  /** client 역할일 때 연결 계약(고객사) */
  contractId?: string;
  /** Google 로그인 계정 연결 */
  googleId?: string;
  email?: string;
}

export type AccountStatus = "pending" | "approved" | "rejected";

/** Google 로그인 후 권한 승인 대상 */
export interface AccountProfile {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  status: AccountStatus;
  role?: UserRole;
  linkedUserId?: string;
  teamId?: string;
  partnerId?: string;
  contractId?: string;
  isFinancialViewer?: boolean;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
}

export interface Contract {
  id: string;
  clientName: string;
  monthlyFee: number;
  targetOptimized: number;
  targetInfluencer: number;
  targetExperience: number;
  targetInstaCard: number;
  hasPlaceSetting: boolean;
  isExtension: boolean;
  hasReferralPromo: boolean;
  /** 소개 프로모션 — 리셀러 ID */
  referrerPartnerId?: string;
  assignedStaffId: string;
  teamId: string;
  optimizedDone: number;
  influencerDone: number;
  contractStartDate: string;
  contractEndDate: string;
  status: ContractStatus;
  terminationReason?: TerminationReason;
  terminatedAt?: string;
  /** 연속 재계약(연장) 개월 수 — 4 이상이면 성과급 지급 가능 */
  renewalMonthCount: number;
  /** 담당 업체(고객) 광고비 입금일 — 성과급은 입금일 + 60일 후 지급 */
  lastClientDepositDate?: string;
  /** 연장 계약 전환 후 재무담당 입금 확인 상태 */
  clientDepositStatus?: ClientDepositStatus;
  /** 사용자 추가 집행 항목별 월 목표 (채널 ID → 건수) */
  channelTargets?: Record<string, number>;
}

/** 네이버 플레이스 접속 정보 (고객사 입력 · 당사 열람) */
export interface PlaceCredentials {
  id: string;
  contractId: string;
  placeUrl: string;
  loginId: string;
  password: string;
  updatedAt: string;
  updatedByUserId: string;
}

export type PlaceCredentialsInput = Pick<
  PlaceCredentials,
  "placeUrl" | "loginId" | "password"
>;

export type QaThreadStatus = "open" | "answered" | "closed";

/** 플레이스 · 계약 관련 질의응답 스레드 */
export interface QaThread {
  id: string;
  contractId: string;
  subject: string;
  status: QaThreadStatus;
  createdByUserId: string;
  assignedStaffId: string;
  createdAt: string;
  lastMessageAt: string;
  closedAt?: string;
  closedByUserId?: string;
}

export interface QaMessage {
  id: string;
  threadId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
}

/** 게시 · 링크 보고서에서 등록한 의견 (플레이스 · Q&A 목록에 원본 링크와 함께 표시) */
export interface PostLinkOpinion {
  id: string;
  contractId: string;
  linkId: string;
  linkUrl: string;
  channel: string;
  reportSource: string;
  taskType?: string;
  executionType?: ExecutionType;
  body: string;
  imageUrls: string[];
  authorUserId: string;
  createdAt: string;
}

export type PostLinkOpinionInput = Omit<PostLinkOpinion, "id" | "createdAt">;

/** 재무담당 업체 입금 확인 상태 */
export type ClientDepositStatus =
  | "pending"
  | "completed"
  | "overdue"
  | "other";

export interface ContractRecord {
  id: string;
  contractId: string;
  period: string;
  assignedStaffId: string;
  teamId: string;
  startedAt: string;
  endedAt?: string;
  monthlyFee: number;
  isExtension: boolean;
  terminationReason?: TerminationReason;
  note?: string;
}

/** 계약별 업무 메모 — 날짜·당시 담당자 자동 기록 */
export interface ContractMemo {
  id: string;
  contractId: string;
  body: string;
  createdAt: string;
  assignedStaffId: string;
  authorUserId: string;
}

export type ContractMemoInput = Pick<ContractMemo, "contractId" | "body">;

export interface PostLinkEntry {
  id: string;
  url: string;
  dueDate?: string;
  completedDate?: string;
  enteredAt: string;
}

export interface Execution {
  id: string;
  contractId: string;
  type: ExecutionType;
  status: ExecutionStatus;
  completedCount: number;
  targetCount: number;
  dueDate?: string;
  completedDate?: string;
  enteredAt?: string;
  memo?: string;
  postLinks: PostLinkEntry[];
  /** 계약 집행 항목 ID (blog, influencer 등) */
  taskChannelId?: WorkOrderTaskType;
}

export interface Expense {
  id: string;
  contractId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  bankAccount: string;
  accountHolder: string;
  payoutStatus: PayoutStatus;
  /** 파트너사 입금 마감일 */
  paymentDueDate: string;
  /** 입금 요청 · 결재 */
  payoutRequestedBy?: string;
  payoutRequestedAt?: string;
  payoutApprovedBy?: string;
  payoutApprovedAt?: string;
  /** 집행 파트너사 (기자단/체험단/인플루언서/블로그) */
  partnerId?: string;
}

/** 파트너사 집행 분야 */
export type PartnerCategory =
  | "press"
  | "experience"
  | "influencer"
  | "blog"
  | "referral";

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

export interface Partner {
  id: string;
  companyName: string;
  categories: PartnerCategory[];
  contactName?: string;
  phone?: string;
  email?: string;
  bankAccount: string;
  accountHolder: string;
  /** 기본 단가 (건당/월, 원) — 참고용 */
  unitPrice?: number;
  memo?: string;
  isActive: boolean;
}

export type WorkOrderTaskType = string;

export type TaskChannelKind =
  | "contract_target"
  | "referral_promo"
  | "execution_only";

/** 집행 항목 배지·진행바 구분 색 */
export type TaskChannelAccent =
  | "cyan"
  | "emerald"
  | "violet"
  | "fuchsia"
  | "amber"
  | "orange"
  | "rose"
  | "sky"
  | "lime";

/** 설정 · 집행 항목 (최적블로그, 인플루언서 등) */
export interface TaskChannelDefinition {
  id: WorkOrderTaskType;
  label: string;
  sortOrder: number;
  isActive: boolean;
  isSystem?: boolean;
  kind: TaskChannelKind;
  accentColor?: TaskChannelAccent;
  contractTargetField?:
    | "targetOptimized"
    | "targetInfluencer"
    | "targetExperience"
    | "targetInstaCard";
  contractDoneField?: "optimizedDone" | "influencerDone";
  executionType?: ExecutionType;
  partnerCategory?: PartnerCategory;
  expenseCategory?: ExpenseCategory;
  syncExecution?: boolean;
}

export type TaskChannelInput = Omit<TaskChannelDefinition, "isSystem">;

/** 원가 · 집행 분야 (기자단, 체험단, 경비 등) */
export interface ExpenseCategoryDefinition {
  id: ExpenseCategory;
  label: string;
  sortOrder: number;
  isActive: boolean;
  isSystem?: boolean;
  /** 파트너사 필터 — null이면 분야 무관(경비 등) */
  partnerCategory?: PartnerCategory | null;
}

export type ExpenseCategoryInput = Omit<ExpenseCategoryDefinition, "isSystem">;

export type WorkOrderCostType =
  | "manuscript"
  | "filming"
  | "travel"
  | "other";

export interface WorkOrderCostLine {
  type: WorkOrderCostType;
  amount: number;
}

export type WorkOrderStage =
  | "draft"
  | "pending_approval"
  | "approved"
  | "delivered"
  | "paid"
  | "order_ready"
  | "rejected";

export interface WorkOrder {
  id: string;
  contractId: string;
  taskType: WorkOrderTaskType;
  sequence: number;
  title: string;
  dueDate: string;
  partnerId?: string;
  costLines: WorkOrderCostLine[];
  stage: WorkOrderStage;
  memo?: string;
  postLinks: PostLinkEntry[];
  requestedBy?: string;
  requestedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  deliveredAt?: string;
  paidAt?: string;
  paidBy?: string;
  expenseId?: string;
  executionId?: string;
  createdAt: string;
}

export interface ExtensionApproval {
  id: string;
  contractId: string;
  requestedBy: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export type BonusPaymentStage =
  | "pending_staff"
  | "pending_team_leader"
  | "pending_executive"
  | "pending_ceo"
  | "ceo_confirmed"
  | "paid"
  | "rejected";

/** CEO→임원→팀장→담당 성과급 % 한도 (상위 한도 내에서만 하위 설정 가능) */
export interface BonusPolicySettings {
  /** CEO가 임원별로 설정하는 임원 성과급 한도 (%) */
  executiveMaxPercent: Record<string, number>;
  /** 임원이 팀장별로 설정하는 담당 배분 한도 (%) */
  teamLeaderMaxPercent: Record<string, number>;
  /** 팀장이 담당별로 설정하는 성과급 (%) */
  staffPercent: Record<string, number>;
}

export interface BonusPayment {
  id: string;
  contractId: string;
  period: string;
  staffId: string;
  staffBonusAmount: number;
  teamLeaderBonusAmount: number;
  executiveBonusAmount: number;
  staffPercentApplied: number;
  teamLeaderPercentApplied: number;
  executivePercentApplied: number;
  renewalMonthAtRequest: number;
  totalAmount: number;
  /** 성과급 산정 기준 업체 입금일 */
  clientDepositDate: string;
  /** 업체 입금일 + 60일 — 실제 지급 가능일 */
  scheduledPayDate: string;
  stage: BonusPaymentStage;
  requestedBy?: string;
  requestedAt?: string;
  teamLeaderApprovedBy?: string;
  teamLeaderApprovedAt?: string;
  executiveApprovedBy?: string;
  executiveApprovedAt?: string;
  ceoApprovedBy?: string;
  ceoApprovedAt?: string;
  paidBy?: string;
  paidAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  createdAt: string;
}

export interface FundBudget {
  monthlyBudget: number;
  expenseAllocated: number;
  bonusAllocated: number;
  operatingReserve: number;
}

export interface AppData {
  users: User[];
  teams: Team[];
  contracts: Contract[];
  executions: Execution[];
  expenses: Expense[];
  extensionApprovals: ExtensionApproval[];
  bonusPayments: BonusPayment[];
  bonusPolicy: BonusPolicySettings;
  fundBudget: FundBudget;
  contractRecords: ContractRecord[];
  contractMemos: ContractMemo[];
  partners: Partner[];
  workOrders: WorkOrder[];
  accountProfiles: AccountProfile[];
  taskChannels: TaskChannelDefinition[];
  expenseCategories: ExpenseCategoryDefinition[];
  placeCredentials: PlaceCredentials[];
  qaThreads: QaThread[];
  qaMessages: QaMessage[];
  postLinkOpinions: PostLinkOpinion[];
  partnerReferralLeads: PartnerReferralLead[];
}

export interface TeamMemberStats {
  id: string;
  name: string;
  completionRate: number;
  clientCount: number;
  extensionRate: number;
}

export interface TeamRanking {
  teamId: string;
  teamName: string;
  revenue: number;
  clientCount: number;
  completionRate: number;
}

export interface OrgNode {
  id: string;
  name: string;
  role: UserRole;
  revenue: number;
  children?: OrgNode[];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  staff: "실무 담당자",
  team_leader: "팀장",
  executive: "임원",
  ceo: "대표",
  finance_manager: "재무담당",
  partner: "파트너사",
  client: "고객사",
};

export const BONUS_STAGE_LABELS: Record<BonusPaymentStage, string> = {
  pending_staff: "담당 신청 · 팀장 결재 대기",
  pending_team_leader: "팀장 결재 대기",
  pending_executive: "임원 결재 대기",
  pending_ceo: "대표 결재 대기",
  ceo_confirmed: "지급 대기 (대표 승인 · 예정일 도래 시 지급)",
  paid: "지급 완료",
  rejected: "반려",
};

export const BONUS_ELIGIBILITY_MIN_RENEWAL_MONTHS = 4;

/** 담당 업체 입금 후 성과급 지급까지 대기 일수 */
export const BONUS_PAYMENT_DELAY_DAYS = 60;

export const BONUS_PAY_POLICY_NOTICE =
  "성과급은 담당 업체(고객) 광고비 입금 확인 후 60일이 경과한 날에 지급됩니다.";

export const PAYOUT_LABELS: Record<PayoutStatus, string> = {
  unpaid: "미지급",
  pending_approval: "입금요청",
  pending_transfer: "입금대기",
  paid: "입금완료",
};

export const CLIENT_DEPOSIT_STATUS_LABELS: Record<ClientDepositStatus, string> =
  {
    pending: "입금대기",
    completed: "입금완료",
    overdue: "연체",
    other: "기타",
  };

export const CLIENT_DEPOSIT_STATUS_VARIANT: Record<
  ClientDepositStatus,
  "default" | "warning" | "success" | "danger" | "info"
> = {
  pending: "warning",
  completed: "success",
  overdue: "danger",
  other: "info",
};

export const QA_THREAD_STATUS_LABELS: Record<QaThreadStatus, string> = {
  open: "미답변",
  answered: "답변완료",
  closed: "종료",
};

/** @deprecated — getExpenseCategoryLabel(data.expenseCategories, id) 사용 */
export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  press: "기자단",
  experience: "체험단",
  influencer: "인플루언서",
  other: "기타",
  expense: "경비",
};

export const EXECUTION_TYPE_LABELS: Record<ExecutionType, string> = {
  optimized: "최적블로그",
  influencer: "인플루언서",
  experience: "체험단",
  press: "기자단",
};

export const EXECUTION_STATUS_LABELS: Record<ExecutionStatus, string> = {
  pending: "대기",
  in_progress: "진행중",
  completed: "완료",
  delayed: "지연",
};

export const PIPELINE_CATEGORY_LABELS: Record<PipelineCategory, string> = {
  in_progress: "진행",
  extension_imminent: "연장임박",
  contract_ending: "계약종료",
};

export const TERMINATION_REASON_LABELS: Record<TerminationReason, string> = {
  budget_reduction: "예산 삭감",
  competitor_switch: "타사 이전",
  performance_issue: "성과 미달",
  client_request: "고객사 요청",
  service_complete: "서비스 종료(정상)",
  other: "기타",
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  active: "진행 중",
  terminated: "해지",
};

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  pending: "승인 대기",
  approved: "승인 완료",
  rejected: "반려",
};

export type ContractInput = Omit<Contract, "id">;
export type ExecutionInput = Omit<Execution, "id">;
export type ExpenseInput = Omit<Expense, "id">;
export type UserInput = Omit<User, "id">;
export type TeamInput = Omit<Team, "id">;
export type PartnerInput = Omit<Partner, "id">;
export type WorkOrderInput = Omit<WorkOrder, "id">;
