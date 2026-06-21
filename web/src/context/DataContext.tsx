"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createSeedData } from "@/lib/seed-data";
import { DEMO_TODAY } from "@/lib/contract-lifecycle";
import { applyJejuOseongOperationalSample } from "@/lib/jeju-oseong-operational-data";
import {
  addDays,
  calcBonusAmounts,
  calcBonusClosingDeadline,
  calcScheduledPayDate,
} from "@/lib/bonus-utils";
import { migratePostLinks } from "@/lib/execution-utils";
import {
  ensureAllContractExecutions,
  ensureExecutionsForContract,
  executionSnapshotEqual,
} from "@/lib/execution-generation-utils";
import { syncAllContractProgress } from "@/lib/selectors";
import {
  buildWorkEvaluationInput,
  computeAutoEvaluationScores,
  computeEvaluationMetrics,
} from "@/lib/work-evaluation-utils";
import type {
  AppData,
  BonusPolicySettings,
  BonusPayment,
  Contract,
  ContractInput,
  ContractMemo,
  ContractRecord,
  Execution,
  ExecutionInput,
  Expense,
  ExpenseInput,
  ExtensionApproval,
  ContractTermsApproval,
  FundBudget,
  Partner,
  PartnerInput,
  PartnerReferralLead,
  PartnerReferralLeadInput,
  PostLinkEntry,
  TerminationReason,
  Team,
  TeamInput,
  User,
  UserInput,
  WorkOrder,
  WorkOrderInput,
  WorkEvaluationInput,
  AccountProfile,
  UserRole,
  ClientDepositStatus,
  PlaceCredentials,
  PlaceCredentialsInput,
  PostLinkOpinion,
  PostLinkOpinionInput,
  QaMessage,
  QaMessageAttachment,
  QaThread,
  ExperienceCampaign,
  ExperiencePartnerSlot,
  ExperiencePartnerSlotInput,
  ExperienceParticipationProposal,
  ExperienceParticipationProposalInput,
  ExperienceParticipantInput,
  ExperienceParticipantUpdate,
  ExperienceScheduleProposalInput,
} from "@/lib/types";
import type { AuthSessionUser } from "@/lib/auth-utils";
import { findAuthMatchedUser } from "@/lib/auth-utils";
import type { ContractTermsChangeMode } from "@/lib/contract-terms-utils";
import { normalizeExpenseCategories } from "@/lib/expense-category-utils";
import {
  normalizeExperienceCampaigns,
} from "@/lib/experience-campaign-utils";
import { normalizePartnerFilters } from "@/lib/partner-filter-utils";
import { normalizeExperienceFields } from "@/lib/experience-field-utils";
import { normalizePartner, normalizePartners } from "@/lib/partner-utils";
import {
  getContractTargetChannels,
  normalizeTaskChannels,
} from "@/lib/task-channel-utils";
import type {
  ExpenseCategoryDefinition,
  ExpenseCategoryInput,
  PartnerFilterDefinition,
  PartnerFilterDefinitionInput,
  ExperienceFieldDefinition,
  ExperienceFieldDefinitionInput,
  TaskChannelDefinition,
  TaskChannelInput,
} from "@/lib/types";
import {
  type LocationProfileInput,
} from "@/lib/location-profile-utils";
import {
  normalizeContractClientLinks,
  type ClientLinksInput,
} from "@/lib/client-links-utils";
import {
  APP_STORAGE_KEY,
  clearAppStorage,
  loadAppData,
  saveAppData,
} from "@/lib/app-storage";
import {
  applyFullContractSync,
  commitAppData,
} from "@/core/domain/commit-app-data";
import { purgePartnerFromAppData } from "@/core/domain/cascade-delete";
import { newId } from "@/core/data/new-id";
import { todayISO } from "@/core/data/date";
import { createContractStore } from "@/features/contracts/create-contract-store";
import { ContractStoreProvider } from "@/features/contracts/ContractStoreContext";
import { createFinanceStore } from "@/features/finance/create-finance-store";
import { FinanceStoreProvider } from "@/features/finance/FinanceStoreContext";
import { createWorkOrderStore } from "@/features/work-orders/create-work-order-store";
import { WorkOrderStoreProvider } from "@/features/work-orders/WorkOrderStoreContext";
import { createBonusStore } from "@/features/bonus/create-bonus-store";
import { BonusStoreProvider } from "@/features/bonus/BonusStoreContext";
import { createQaStore } from "@/features/place-qa/create-qa-store";
import { QaStoreProvider } from "@/features/place-qa/QaStoreContext";
import { createExperienceStore } from "@/features/experience/create-experience-store";
import { ExperienceStoreProvider } from "@/features/experience/ExperienceStoreContext";

/** normalizeContract에서 매번 시드 전체를 만들지 않도록 고정 기본값 사용 */
const DEFAULT_CONTRACT_START = "2026-06-01";
const DEFAULT_CONTRACT_END = "2026-06-30";

let seedFallbackCache: AppData | null = null;

function getSeedFallback(): AppData {
  if (!seedFallbackCache) seedFallbackCache = createSeedData();
  return seedFallbackCache;
}

interface DataContextValue extends AppData {
  hydrated: boolean;
  contracts: Contract[];
  addContract: (input: ContractInput) => Contract;
  updateContract: (
    id: string,
    input: Partial<ContractInput>,
    options?: { mode?: ContractTermsChangeMode },
  ) => void;
  deleteContract: (id: string) => void;
  addExecution: (input: ExecutionInput) => Execution;
  updateExecution: (id: string, input: Partial<ExecutionInput>) => void;
  deleteExecution: (id: string) => void;
  addExpense: (input: ExpenseInput) => Expense;
  updateExpense: (id: string, input: Partial<ExpenseInput>) => void;
  deleteExpense: (id: string) => void;
  addUser: (input: UserInput) => User;
  updateUser: (id: string, input: Partial<UserInput>) => void;
  deleteUser: (id: string) => void;
  addTeam: (input: TeamInput) => Team;
  updateTeam: (id: string, input: Partial<TeamInput>) => void;
  deleteTeam: (id: string) => void;
  addPartner: (input: PartnerInput) => Partner;
  updatePartner: (id: string, input: Partial<PartnerInput>) => void;
  deletePartner: (id: string) => void;
  addPartnerReferralLead: (input: PartnerReferralLeadInput) => PartnerReferralLead;
  updateWorkOrder: (id: string, input: Partial<WorkOrderInput>) => void;
  submitWorkOrder: (id: string, requestedBy: string) => boolean;
  approveWorkOrder: (
    id: string,
    partnerUserId: string,
    approvalNote?: string,
  ) => boolean;
  rejectWorkOrder: (id: string, reason: string) => void;
  confirmWorkOrderByStaff: (id: string, staffUserId: string) => boolean;
  rejectWorkOrderByStaff: (id: string, staffUserId: string, reason: string) => boolean;
  deliverWorkOrder: (
    id: string,
    postLinks: WorkOrder["postLinks"],
    memo: string,
  ) => boolean;
  confirmWorkOrderPayment: (id: string, paidBy: string) => boolean;
  ensureContractWorkOrders: (contractId: string) => void;
  cancelWorkOrder: (id: string, reason?: string) => boolean;
  holdWorkOrder: (id: string, reason?: string) => boolean;
  postponeWorkOrder: (
    id: string,
    newDueDate: string,
    reason?: string,
  ) => boolean;
  resumeWorkOrder: (id: string) => boolean;
  ensureContractExecutions: (contractId: string) => void;
  upsertAccountFromAuth: (auth: AuthSessionUser) => AccountProfile;
  approveAccountProfile: (
    profileId: string,
    input: {
      role: UserRole;
      teamId?: string;
      partnerId?: string;
      contractId?: string;
      isFinancialViewer?: boolean;
    },
    approverUserId: string,
  ) => boolean;
  rejectAccountProfile: (
    profileId: string,
    reason: string,
    approverUserId: string,
  ) => void;
  approveExtension: (approvalId: string) => void;
  rejectExtension: (approvalId: string) => void;
  requestExtension: (contractId: string, requestedBy: string) => boolean;
  requestContractTermsApproval: (
    contractId: string,
    requestedBy: string,
    mode: import("@/lib/contract-terms-utils").ContractTermsChangeMode,
    proposedValues: import("@/lib/contract-terms-utils").ContractTermsFormValues,
  ) => boolean;
  approveContractTermsApproval: (approvalId: string, reviewerId: string) => void;
  rejectContractTermsApproval: (approvalId: string, reviewerId: string) => void;
  requestExpensePayout: (expenseId: string, requestedBy: string) => boolean;
  approveExpensePayout: (expenseId: string, approverId: string) => boolean;
  rejectExpensePayout: (expenseId: string, approverId: string) => boolean;
  markExpensesPaid: (ids: string[]) => void;
  approveBonusTeamLeader: (paymentId: string, approverId: string) => void;
  approveBonusExecutive: (paymentId: string, approverId: string) => void;
  approveBonusCeo: (paymentId: string, approverId: string) => void;
  rejectBonus: (paymentId: string, rejectedBy: string) => void;
  payBonus: (paymentId: string, paidBy: string) => boolean;
  setExecutiveBonusLimit: (executiveId: string, percent: number) => boolean;
  setTeamLeaderBonusLimit: (leaderId: string, percent: number) => boolean;
  setStaffBonusPercent: (staffId: string, percent: number) => boolean;
  requestBonusPayment: (contractId: string, requestedBy: string) => boolean;
  updateFundBudget: (input: Partial<FundBudget>) => void;
  terminateContract: (
    contractId: string,
    reason: TerminationReason,
  ) => void;
  updateClientDepositStatus: (
    contractId: string,
    status: ClientDepositStatus,
    depositDate?: string,
  ) => void;
  addTaskChannel: (input: TaskChannelInput) => TaskChannelDefinition;
  updateTaskChannel: (id: string, input: Partial<TaskChannelInput>) => void;
  deleteTaskChannel: (id: string) => boolean;
  addExpenseCategory: (input: ExpenseCategoryInput) => ExpenseCategoryDefinition;
  updateExpenseCategory: (
    id: string,
    input: Partial<ExpenseCategoryInput>,
  ) => void;
  deleteExpenseCategory: (id: string) => boolean;
  addPartnerFilterDefinition: (
    input: PartnerFilterDefinitionInput,
  ) => PartnerFilterDefinition;
  updatePartnerFilterDefinition: (
    id: string,
    input: Partial<PartnerFilterDefinitionInput>,
  ) => void;
  deletePartnerFilterDefinition: (id: string) => boolean;
  addExperienceFieldDefinition: (
    input: ExperienceFieldDefinitionInput,
  ) => ExperienceFieldDefinition;
  updateExperienceFieldDefinition: (
    id: string,
    input: Partial<ExperienceFieldDefinitionInput>,
  ) => void;
  deleteExperienceFieldDefinition: (id: string) => boolean;
  upsertPlaceCredentials: (
    contractId: string,
    input: PlaceCredentialsInput,
    userId: string,
  ) => PlaceCredentials;
  createQaThread: (
    contractId: string,
    subject: string,
    body: string,
    userId: string,
    attachments?: QaMessageAttachment[],
  ) => QaThread;
  replyQaThread: (
    threadId: string,
    body: string,
    userId: string,
    attachments?: QaMessageAttachment[],
  ) => QaMessage;
  closeQaThread: (threadId: string, userId: string) => void;
  addPostLinkOpinion: (input: PostLinkOpinionInput) => PostLinkOpinion;
  addExperienceCampaign: (
    contractId: string,
    createdByUserId: string,
  ) => ExperienceCampaign;
  updateExperienceCampaign: (
    id: string,
    input: Partial<
      Pick<
        ExperienceCampaign,
        | "criteria"
        | "schedulingStatus"
        | "title"
        | "workOrderId"
        | "confirmedVisitDate"
        | "confirmedVisitTime"
        | "confirmedVisitEndTime"
      >
    >,
  ) => void;
  sendExperienceCampaignToClient: (id: string) => void;
  proposeExperienceSchedule: (
    campaignId: string,
    userId: string,
    input: ExperienceScheduleProposalInput,
  ) => void;
  acceptExperienceProposal: (
    campaignId: string,
    proposalId: string,
    userId: string,
  ) => void;
  addExperienceParticipant: (
    campaignId: string,
    userId: string,
    input: ExperienceParticipantInput,
  ) => void;
  removeExperienceParticipant: (
    campaignId: string,
    participantId: string,
  ) => void;
  updateExperienceParticipant: (
    campaignId: string,
    participantId: string,
    input: ExperienceParticipantUpdate,
  ) => void;
  updateContractLocation: (
    contractId: string,
    input: LocationProfileInput,
  ) => void;
  updateContractClientLinks: (
    contractId: string,
    input: ClientLinksInput,
  ) => void;
  updatePartnerLocation: (partnerId: string, input: LocationProfileInput) => void;
  publishExperiencePartnerSlot: (
    input: ExperiencePartnerSlotInput,
  ) => ExperiencePartnerSlot;
  claimExperiencePartnerSlot: (
    slotId: string,
    partnerId: string,
    userId: string,
    claimNote?: string,
  ) => boolean;
  cancelExperiencePartnerSlot: (slotId: string) => void;
  submitExperienceParticipationProposal: (
    input: ExperienceParticipationProposalInput,
  ) => ExperienceParticipationProposal | null;
  acceptExperienceParticipationProposal: (
    proposalId: string,
    staffUserId: string,
    staffReviewMemo?: string,
  ) => boolean;
  rejectExperienceParticipationProposal: (
    proposalId: string,
    staffUserId: string,
    staffReviewMemo?: string,
  ) => boolean;
  addContractMemo: (contractId: string, body: string, authorUserId: string) => ContractMemo | null;
  deleteContractMemo: (id: string) => void;
  upsertWorkEvaluation: (input: WorkEvaluationInput) => void;
  /** 고객사 포털 — 해야 할 일 확인(목록·뱃지에서 제외) */
  dismissClientPortalAction: (
    contractId: string,
    userId: string,
    actionId: string,
  ) => void;
  resetData: (options?: { reload?: boolean }) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

function normalizeExecution(execution: Execution): Execution {
  return {
    ...execution,
    postLinks: migratePostLinks(
      execution.postLinks as string[] | PostLinkEntry[] | undefined,
      execution.dueDate,
    ),
    memo: execution.memo ?? "",
  };
}

function normalizeContract(contract: Contract): Contract {
  const start = contract.contractStartDate ?? DEFAULT_CONTRACT_START;
  const channelTargets = contract.channelTargets;
  return {
    ...contract,
    targetExperience: contract.targetExperience ?? 0,
    targetInstaCard: contract.targetInstaCard ?? 0,
    targetYoutube: contract.targetYoutube ?? channelTargets?.youtube ?? 0,
    targetInstagram: contract.targetInstagram ?? channelTargets?.instagram ?? 0,
    targetClip: contract.targetClip ?? channelTargets?.clip ?? 0,
    targetTiktok: contract.targetTiktok ?? channelTargets?.tiktok ?? 0,
    youtubeDone: contract.youtubeDone ?? 0,
    instagramDone: contract.instagramDone ?? 0,
    clipDone: contract.clipDone ?? 0,
    tiktokDone: contract.tiktokDone ?? 0,
    hasPlaceSetting: contract.hasPlaceSetting ?? false,
    contractStartDate: start,
    contractEndDate: contract.contractEndDate ?? DEFAULT_CONTRACT_END,
    status: contract.status ?? "active",
    renewalMonthCount: contract.renewalMonthCount ?? 1,
    lastClientDepositDate:
      contract.lastClientDepositDate ??
      (contract.status === "active" ? start : undefined),
    clientDepositStatus: contract.clientDepositStatus,
    ...normalizeContractClientLinks(contract),
  };
}

function normalizeBonusPayment(
  payment: BonusPayment,
  contracts: Contract[],
  policy: BonusPolicySettings,
  teams: AppData["teams"],
  users: AppData["users"],
): BonusPayment {
  const contract = contracts.find((c) => c.id === payment.contractId);
  const clientDepositDate =
    payment.clientDepositDate ??
    contract?.lastClientDepositDate ??
    payment.requestedAt ??
    payment.createdAt;
  const base: BonusPayment = {
    ...payment,
    clientDepositDate,
    closingDeadline:
      payment.closingDeadline ?? calcBonusClosingDeadline(clientDepositDate),
    scheduledPayDate:
      payment.scheduledPayDate ?? calcScheduledPayDate(clientDepositDate),
  };
  if (!contract) return base;
  return { ...base, ...calcBonusAmounts(contract, policy, { teams, users }) };
}

function normalizeExpense(expense: Expense, index: number): Expense {
  return {
    ...expense,
    paymentDueDate:
      expense.paymentDueDate ??
      addDays(DEFAULT_CONTRACT_START, 7 + (index % 28)),
  };
}

function ensureDemoClientPortalData(data: AppData): AppData {
  const seed = getSeedFallback();
  let users = [...data.users];
  let accountProfiles = [...(data.accountProfiles ?? [])];

  // 데모 고객사 계정 — 이름·계약 연결이 localStorage에서 틀어져도 시드 기준으로 복구
  for (const seedUser of seed.users.filter((u) => u.role === "client")) {
    const idx = users.findIndex(
      (u) =>
        u.id === seedUser.id ||
        (seedUser.googleId && u.googleId === seedUser.googleId),
    );
    if (idx === -1) {
      users.push(seedUser);
      continue;
    }
    users[idx] = {
      ...users[idx],
      name: seedUser.name,
      role: "client",
      contractId: seedUser.contractId,
      email: seedUser.email ?? users[idx].email,
      googleId: seedUser.googleId ?? users[idx].googleId,
      isFinancialViewer: false,
    };
  }

  for (const seedProfile of seed.accountProfiles.filter(
    (p) => p.role === "client" && p.status === "approved",
  )) {
    const existing = accountProfiles.find(
      (p) =>
        p.googleId === seedProfile.googleId ||
        p.linkedUserId === seedProfile.linkedUserId ||
        (seedProfile.email && p.email === seedProfile.email),
    );
    if (!existing) {
      accountProfiles.push(seedProfile);
      continue;
    }
    accountProfiles = accountProfiles.map((p) =>
      p.id === existing.id
        ? {
            ...p,
            name: seedProfile.name,
            role: "client",
            linkedUserId: seedProfile.linkedUserId,
            contractId: seedProfile.contractId,
            email: seedProfile.email ?? p.email,
            googleId: seedProfile.googleId ?? p.googleId,
            status: "approved",
          }
        : p,
    );
  }

  return { ...data, users, accountProfiles };
}

function normalizeAppData(data: AppData): AppData {
  const seed = getSeedFallback();
  const withClients = ensureDemoClientPortalData(data);
  const contracts = withClients.contracts.map(normalizeContract);
  const bonusPolicy = withClients.bonusPolicy ?? seed.bonusPolicy;
  const teams = withClients.teams ?? seed.teams;
  const normalized: AppData = {
    ...withClients,
    contracts,
    executions: withClients.executions.map(normalizeExecution),
    expenses: (withClients.expenses ?? seed.expenses).map((e, i) =>
      normalizeExpense(e, i),
    ),
    bonusPayments: (withClients.bonusPayments ?? seed.bonusPayments).map((p) =>
      normalizeBonusPayment(
        p,
        contracts,
        bonusPolicy,
        teams,
        withClients.users ?? seed.users,
      ),
    ),
    fundBudget: withClients.fundBudget ?? seed.fundBudget,
    contractRecords: withClients.contractRecords ?? seed.contractRecords,
    contractMemos: withClients.contractMemos ?? seed.contractMemos ?? [],
    bonusPolicy,
    partners: normalizePartners(withClients.partners ?? seed.partners),
    workOrders: withClients.workOrders ?? seed.workOrders,
    taskChannels: normalizeTaskChannels(withClients.taskChannels ?? seed.taskChannels),
    expenseCategories: normalizeExpenseCategories(
      withClients.expenseCategories ?? seed.expenseCategories,
    ),
    partnerFilterDefinitions: normalizePartnerFilters(
      withClients.partnerFilterDefinitions ?? seed.partnerFilterDefinitions,
    ),
    experienceFieldDefinitions: normalizeExperienceFields(
      withClients.experienceFieldDefinitions ?? seed.experienceFieldDefinitions,
    ),
    placeCredentials: withClients.placeCredentials ?? seed.placeCredentials ?? [],
    qaThreads: withClients.qaThreads ?? seed.qaThreads ?? [],
    qaMessages: withClients.qaMessages ?? seed.qaMessages ?? [],
    postLinkOpinions: withClients.postLinkOpinions ?? seed.postLinkOpinions ?? [],
    partnerReferralLeads:
      withClients.partnerReferralLeads ?? seed.partnerReferralLeads ?? [],
    experienceCampaigns: normalizeExperienceCampaigns(
      withClients.experienceCampaigns ?? seed.experienceCampaigns ?? [],
    ),
    experiencePartnerSlots:
      withClients.experiencePartnerSlots ?? seed.experiencePartnerSlots ?? [],
    experienceParticipationProposals:
      withClients.experienceParticipationProposals ??
      seed.experienceParticipationProposals ??
      [],
    workEvaluations: withClients.workEvaluations ?? seed.workEvaluations ?? [],
    clientPortalActionDismissals:
      withClients.clientPortalActionDismissals ??
      seed.clientPortalActionDismissals ??
      [],
    contractTermsApprovals:
      withClients.contractTermsApprovals ?? seed.contractTermsApprovals ?? [],
  };
  return applyJejuOseongOperationalSample(normalized);
}

/** persist·hydrate 시 계약 진행률·execution 자동 동기화 파이프라인 */
const dataSyncPipeline = {
  normalize: normalizeAppData,
  newExecutionId: () => newId("ex"),
};

function applyContractSync(data: AppData): AppData {
  return applyFullContractSync(data, dataSyncPipeline);
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => getSeedFallback());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const stored = await loadAppData();
        if (cancelled) return;

        if (stored) {
          setData(stored);
          setHydrated(true);

          window.setTimeout(() => {
            if (cancelled) return;
            try {
              setData((prev) => applyContractSync(prev));
            } catch (err) {
              console.error("데이터 정규화 실패", err);
            }
          }, 0);
          return;
        }

        setData(getSeedFallback());
      } catch (err) {
        console.error("데이터 로드 실패, 시드로 초기화합니다.", err);
        setData(getSeedFallback());
      }

      if (!cancelled) setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      const save = () => {
        void saveAppData(data).then((result) => {
          if (!result.ok && result.reason === "quota") {
            console.warn(
              `localStorage 용량(${APP_STORAGE_KEY})이 부족해 저장을 건너뜁니다. 설정에서 데이터 초기화하거나 브라우저 저장소를 비워 주세요.`,
            );
          }
        });
      };
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(save, { timeout: 2500 });
      } else {
        save();
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [data, hydrated]);

  const persist = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => commitAppData(prev, updater(prev), dataSyncPipeline));
  }, []);

  const storeDeps = useMemo(
    () => ({ persist, newId, todayISO }),
    [persist],
  );
  const contractStore = useMemo(
    () => createContractStore(storeDeps),
    [storeDeps],
  );
  const financeStore = useMemo(
    () => createFinanceStore(storeDeps),
    [storeDeps],
  );
  const workOrderStore = useMemo(
    () => createWorkOrderStore(storeDeps),
    [storeDeps],
  );
  const bonusStore = useMemo(
    () => createBonusStore(storeDeps),
    [storeDeps],
  );
  const qaStore = useMemo(
    () => createQaStore(storeDeps),
    [storeDeps],
  );
  const experienceStore = useMemo(
    () => createExperienceStore(storeDeps),
    [storeDeps],
  );

  const {
    addContract,
    updateContract,
    deleteContract,
    terminateContract,
    requestExtension,
    approveExtension,
    rejectExtension,
    requestContractTermsApproval,
    approveContractTermsApproval,
    rejectContractTermsApproval,
    addExecution,
    updateExecution,
    deleteExecution,
    addContractMemo,
    deleteContractMemo,
    updateContractLocation,
    updateContractClientLinks,
  } = contractStore;

  const {
    addExpense,
    updateExpense,
    deleteExpense,
    requestExpensePayout,
    approveExpensePayout,
    rejectExpensePayout,
    markExpensesPaid,
    updateFundBudget,
    updateClientDepositStatus,
  } = financeStore;

  const {
    updateWorkOrder,
    submitWorkOrder,
    approveWorkOrder,
    rejectWorkOrder,
    confirmWorkOrderByStaff,
    rejectWorkOrderByStaff,
    deliverWorkOrder,
    confirmWorkOrderPayment,
    ensureContractWorkOrders,
    cancelWorkOrder,
    holdWorkOrder,
    postponeWorkOrder,
    resumeWorkOrder,
  } = workOrderStore;

  const {
    approveBonusTeamLeader,
    approveBonusExecutive,
    approveBonusCeo,
    rejectBonus,
    payBonus,
    setExecutiveBonusLimit,
    setTeamLeaderBonusLimit,
    setStaffBonusPercent,
    requestBonusPayment,
  } = bonusStore;

  const {
    upsertPlaceCredentials,
    createQaThread,
    replyQaThread,
    closeQaThread,
    addPostLinkOpinion,
  } = qaStore;

  const {
    addExperienceFieldDefinition,
    updateExperienceFieldDefinition,
    deleteExperienceFieldDefinition,
    addExperienceCampaign,
    updateExperienceCampaign,
    sendExperienceCampaignToClient,
    proposeExperienceSchedule,
    acceptExperienceProposal,
    addExperienceParticipant,
    removeExperienceParticipant,
    updateExperienceParticipant,
    publishExperiencePartnerSlot,
    claimExperiencePartnerSlot,
    cancelExperiencePartnerSlot,
    submitExperienceParticipationProposal,
    acceptExperienceParticipationProposal,
    rejectExperienceParticipationProposal,
  } = experienceStore;

  const syncClientAccountProfile = (
    accountProfiles: AccountProfile[],
    user: User,
  ): AccountProfile[] => {
    if (user.role !== "client" || !user.email) {
      return accountProfiles.filter((p) => p.linkedUserId !== user.id);
    }

    const googleId = user.googleId ?? `demo-client-${user.id}`;
    const existing = accountProfiles.find(
      (p) =>
        p.linkedUserId === user.id ||
        p.googleId === googleId ||
        p.email === user.email,
    );

    const profile: AccountProfile = {
      id: existing?.id ?? newId("ap"),
      googleId,
      email: user.email,
      name: user.name,
      status: "approved",
      role: "client",
      linkedUserId: user.id,
      contractId: user.contractId,
      isFinancialViewer: false,
      requestedAt: existing?.requestedAt ?? todayISO(),
      approvedAt: existing?.approvedAt ?? todayISO(),
    };

    if (existing) {
      return accountProfiles.map((p) => (p.id === existing.id ? profile : p));
    }
    return [...accountProfiles, profile];
  };

  const addUser = useCallback(
    (input: UserInput) => {
      let user: User = { ...input, id: newId("u") };
      if (user.role === "client" && user.email) {
        user = { ...user, googleId: user.googleId ?? `demo-client-${user.id}` };
      }
      persist((prev) => {
        const users = [...prev.users, user];
        return {
          ...prev,
          users,
          accountProfiles:
            user.role === "client" && user.email
              ? syncClientAccountProfile(prev.accountProfiles, user)
              : prev.accountProfiles,
        };
      });
      return user;
    },
    [persist],
  );

  const updateUser = useCallback(
    (id: string, input: Partial<UserInput>) => {
      persist((prev) => {
        const users = prev.users.map((u) =>
          u.id === id ? { ...u, ...input } : u,
        );
        const updated = users.find((u) => u.id === id);
        if (!updated) return { ...prev, users };

        const withGoogleId =
          updated.role === "client" && updated.email && !updated.googleId
            ? { ...updated, googleId: `demo-client-${updated.id}` }
            : updated;

        const normalizedUsers = users.map((u) =>
          u.id === id ? withGoogleId : u,
        );

        return {
          ...prev,
          users: normalizedUsers,
          accountProfiles: syncClientAccountProfile(
            prev.accountProfiles,
            withGoogleId,
          ),
        };
      });
    },
    [persist],
  );

  const deleteUser = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        users: prev.users.filter((u) => u.id !== id),
        accountProfiles: prev.accountProfiles.filter((p) => p.linkedUserId !== id),
      }));
    },
    [persist],
  );

  const addTeam = useCallback(
    (input: TeamInput) => {
      const team: Team = { ...input, id: newId("team") };
      persist((prev) => ({ ...prev, teams: [...prev.teams, team] }));
      return team;
    },
    [persist],
  );

  const updateTeam = useCallback(
    (id: string, input: Partial<TeamInput>) => {
      persist((prev) => ({
        ...prev,
        teams: prev.teams.map((t) => (t.id === id ? { ...t, ...input } : t)),
      }));
    },
    [persist],
  );

  const deleteTeam = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        teams: prev.teams.filter((t) => t.id !== id),
      }));
    },
    [persist],
  );

  const addPartner = useCallback(
    (input: PartnerInput) => {
      const partner: Partner = normalizePartner({
        ...input,
        id: newId("p"),
        registeredAt: input.registeredAt ?? todayISO(),
      });
      persist((prev) => ({ ...prev, partners: [...prev.partners, partner] }));
      return partner;
    },
    [persist],
  );

  const updatePartner = useCallback(
    (id: string, input: Partial<PartnerInput>) => {
      persist((prev) => ({
        ...prev,
        partners: prev.partners.map((p) =>
          p.id === id ? normalizePartner({ ...p, ...input }) : p,
        ),
      }));
    },
    [persist],
  );

  const deletePartner = useCallback(
    (id: string) => {
      persist((prev) => purgePartnerFromAppData(prev, id));
    },
    [persist],
  );

  const addPartnerReferralLead = useCallback(
    (input: PartnerReferralLeadInput) => {
      const lead: PartnerReferralLead = { ...input, id: newId("prl") };
      persist((prev) => ({
        ...prev,
        partnerReferralLeads: [...(prev.partnerReferralLeads ?? []), lead],
      }));
      return lead;
    },
    [persist],
  );

  const ensureContractExecutions = useCallback(
    (contractId: string) => {
      persist((prev) => {
        const contract = prev.contracts.find((c) => c.id === contractId);
        if (!contract || contract.status !== "active") return prev;
        return {
          ...prev,
          executions: (() => {
            const next = ensureExecutionsForContract(
              contract,
              prev.executions,
              prev.taskChannels,
              () => newId("ex"),
            );
            return executionSnapshotEqual(prev.executions, next)
              ? prev.executions
              : next;
          })(),
        };
      });
    },
    [persist],
  );

  const upsertAccountFromAuth = useCallback(
    (auth: AuthSessionUser): AccountProfile => {
      let profile!: AccountProfile;
      persist((prev) => {
        const base = ensureDemoClientPortalData(prev);
        const matchedUser = findAuthMatchedUser(auth, base.users);
        const existing = base.accountProfiles.find(
          (p) =>
            p.googleId === auth.googleId ||
            (auth.email && p.email === auth.email),
        );

        let users = base.users;
        if (
          matchedUser &&
          !users.some((user) => user.id === matchedUser.id)
        ) {
          users = [...users, matchedUser];
        }

        if (existing) {
          const shouldAutoApprove =
            existing.status === "pending" && Boolean(matchedUser);
          profile = {
            ...existing,
            googleId: auth.googleId,
            email: auth.email,
            name: matchedUser?.name ?? auth.name,
            avatarUrl: auth.avatarUrl ?? existing.avatarUrl,
            linkedUserId: matchedUser?.id ?? existing.linkedUserId,
            role: matchedUser?.role ?? existing.role,
            contractId: matchedUser?.contractId ?? existing.contractId,
            partnerId: matchedUser?.partnerId ?? existing.partnerId,
            teamId: matchedUser?.teamId ?? existing.teamId,
            status: shouldAutoApprove ? "approved" : existing.status,
            ...(shouldAutoApprove && matchedUser
              ? { approvedAt: todayISO(), role: matchedUser.role }
              : {}),
          };
          if (matchedUser) {
            profile = {
              ...profile,
              linkedUserId: matchedUser.id,
              role: matchedUser.role,
              contractId: matchedUser.contractId,
              partnerId: matchedUser.partnerId,
              teamId: matchedUser.teamId,
            };
          }
          return {
            ...base,
            users,
            accountProfiles: base.accountProfiles.map((p) =>
              p.id === existing.id ? profile : p,
            ),
          };
        }

        if (matchedUser) {
          profile = {
            id: newId("ap"),
            googleId: auth.googleId,
            email: auth.email,
            name: matchedUser.name,
            avatarUrl: auth.avatarUrl,
            status: "approved",
            role: matchedUser.role,
            linkedUserId: matchedUser.id,
            teamId: matchedUser.teamId,
            partnerId: matchedUser.partnerId,
            contractId: matchedUser.contractId,
            isFinancialViewer: matchedUser.isFinancialViewer,
            requestedAt: todayISO(),
            approvedAt: todayISO(),
          };
          return {
            ...base,
            users,
            accountProfiles: [...base.accountProfiles, profile],
          };
        }

        profile = {
          id: newId("ap"),
          googleId: auth.googleId,
          email: auth.email,
          name: auth.name,
          avatarUrl: auth.avatarUrl,
          status: "pending",
          requestedAt: todayISO(),
        };
        return {
          ...base,
          accountProfiles: [...base.accountProfiles, profile],
        };
      });
      return profile;
    },
    [persist],
  );

  const approveAccountProfile = useCallback(
    (
      profileId: string,
      input: {
        role: UserRole;
        teamId?: string;
        partnerId?: string;
        contractId?: string;
        isFinancialViewer?: boolean;
      },
      approverUserId: string,
    ): boolean => {
      let ok = false;
      persist((prev) => {
        const profile = prev.accountProfiles.find((p) => p.id === profileId);
        if (!profile || profile.status !== "pending") return prev;

        let linkedUserId = profile.linkedUserId;
        let users = prev.users;

        if (linkedUserId) {
          users = users.map((u) =>
            u.id === linkedUserId
              ? {
                  ...u,
                  name: profile.name,
                  role: input.role,
                  teamId: input.teamId || u.teamId,
                  partnerId: input.partnerId || u.partnerId,
                  contractId: input.contractId || u.contractId,
                  isFinancialViewer:
                    input.isFinancialViewer ?? u.isFinancialViewer,
                  googleId: profile.googleId,
                  email: profile.email,
                }
              : u,
          );
        } else {
          const newUser: User = {
            id: newId("u"),
            name: profile.name,
            role: input.role,
            teamId: input.teamId,
            partnerId: input.partnerId,
            contractId: input.contractId,
            isFinancialViewer: input.isFinancialViewer ?? false,
            googleId: profile.googleId,
            email: profile.email,
          };
          linkedUserId = newUser.id;
          users = [...users, newUser];
        }

        ok = true;
        return {
          ...prev,
          users,
          accountProfiles: prev.accountProfiles.map((p) =>
            p.id === profileId
              ? {
                  ...p,
                  status: "approved" as const,
                  role: input.role,
                  linkedUserId,
                  teamId: input.teamId,
                  partnerId: input.partnerId,
                  contractId: input.contractId,
                  isFinancialViewer: input.isFinancialViewer,
                  approvedBy: approverUserId,
                  approvedAt: todayISO(),
                }
              : p,
          ),
        };
      });
      return ok;
    },
    [persist],
  );

  const rejectAccountProfile = useCallback(
    (profileId: string, reason: string, approverUserId: string) => {
      persist((prev) => ({
        ...prev,
        accountProfiles: prev.accountProfiles.map((p) =>
          p.id === profileId && p.status === "pending"
            ? {
                ...p,
                status: "rejected" as const,
                rejectedReason: reason || "권한 승인 반려",
                approvedBy: approverUserId,
                approvedAt: todayISO(),
              }
            : p,
        ),
      }));
    },
    [persist],
  );

  const addTaskChannel = useCallback(
    (input: TaskChannelInput) => {
      const channel: TaskChannelDefinition = { ...input };
      persist((prev) => ({
        ...prev,
        taskChannels: [...prev.taskChannels, channel].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        ),
      }));
      return channel;
    },
    [persist],
  );

  const updateTaskChannel = useCallback(
    (id: string, input: Partial<TaskChannelInput>) => {
      persist((prev) => ({
        ...prev,
        taskChannels: prev.taskChannels
          .map((c) => (c.id === id ? { ...c, ...input } : c))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      }));
    },
    [persist],
  );

  const deleteTaskChannel = useCallback(
    (id: string): boolean => {
      let ok = false;
      persist((prev) => {
        const channel = prev.taskChannels.find((c) => c.id === id);
        if (!channel || channel.isSystem) return prev;
        const inUse = prev.workOrders.some((w) => w.taskType === id);
        if (inUse) return prev;
        ok = true;
        return {
          ...prev,
          taskChannels: prev.taskChannels.filter((c) => c.id !== id),
        };
      });
      return ok;
    },
    [persist],
  );

  const addExpenseCategory = useCallback(
    (input: ExpenseCategoryInput) => {
      const category: ExpenseCategoryDefinition = { ...input };
      persist((prev) => ({
        ...prev,
        expenseCategories: [...prev.expenseCategories, category].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        ),
      }));
      return category;
    },
    [persist],
  );

  const updateExpenseCategory = useCallback(
    (id: string, input: Partial<ExpenseCategoryInput>) => {
      persist((prev) => ({
        ...prev,
        expenseCategories: prev.expenseCategories
          .map((c) => (c.id === id ? { ...c, ...input } : c))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      }));
    },
    [persist],
  );

  const deleteExpenseCategory = useCallback(
    (id: string): boolean => {
      let ok = false;
      persist((prev) => {
        const category = prev.expenseCategories.find((c) => c.id === id);
        if (!category || category.isSystem) return prev;
        const inUse =
          prev.expenses.some((e) => e.category === id) ||
          prev.taskChannels.some((ch) => ch.expenseCategory === id);
        if (inUse) return prev;
        ok = true;
        return {
          ...prev,
          expenseCategories: prev.expenseCategories.filter((c) => c.id !== id),
        };
      });
      return ok;
    },
    [persist],
  );

  const addPartnerFilterDefinition = useCallback(
    (input: PartnerFilterDefinitionInput) => {
      const filter: PartnerFilterDefinition = { ...input };
      persist((prev) => ({
        ...prev,
        partnerFilterDefinitions: [...prev.partnerFilterDefinitions, filter].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        ),
      }));
      return filter;
    },
    [persist],
  );

  const updatePartnerFilterDefinition = useCallback(
    (id: string, input: Partial<PartnerFilterDefinitionInput>) => {
      persist((prev) => ({
        ...prev,
        partnerFilterDefinitions: prev.partnerFilterDefinitions
          .map((f) => (f.id === id ? { ...f, ...input } : f))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      }));
    },
    [persist],
  );

  const deletePartnerFilterDefinition = useCallback(
    (id: string): boolean => {
      let ok = false;
      persist((prev) => {
        const filter = prev.partnerFilterDefinitions.find((f) => f.id === id);
        if (!filter || filter.isSystem) return prev;
        const inUse =
          prev.partners.some((p) => p.categories.includes(id)) ||
          prev.expenseCategories.some((c) => c.partnerCategory === id) ||
          prev.taskChannels.some((ch) => ch.partnerCategory === id);
        if (inUse) return prev;
        ok = true;
        return {
          ...prev,
          partnerFilterDefinitions: prev.partnerFilterDefinitions.filter(
            (f) => f.id !== id,
          ),
        };
      });
      return ok;
    },
    [persist],
  );

  const updatePartnerLocation = useCallback(
    (partnerId: string, input: LocationProfileInput) => {
      persist((prev) => ({
        ...prev,
        partners: prev.partners.map((partner) =>
          partner.id === partnerId
            ? normalizePartner({
                ...partner,
                address: input.address?.trim() || undefined,
                regionProvince: input.regionProvince || undefined,
                regionCity: input.regionCity || undefined,
              })
            : partner,
        ),
      }));
    },
    [persist],
  );

  const resetData = useCallback((options?: { reload?: boolean }) => {
    seedFallbackCache = null;
    clearAppStorage();
    const fresh = createSeedData();
    setData(fresh);
    void saveAppData(fresh).then((result) => {
      if (!result.ok && result.reason === "quota") {
        console.warn("샘플 데이터 저장 실패 — localStorage 용량을 확인해 주세요.");
        return;
      }
      if (options?.reload !== false) {
        window.location.reload();
      }
    });
  }, []);

  const upsertWorkEvaluation = useCallback((input: WorkEvaluationInput) => {
    setData((prev) => {
      const evaluatee = prev.users.find((user) => user.id === input.evaluateeId);
      const metrics =
        input.metrics ??
        (evaluatee ? computeEvaluationMetrics(prev, evaluatee) : input.metrics);
      const scores =
        input.scores ??
        (evaluatee && metrics
          ? computeAutoEvaluationScores(prev, evaluatee, metrics)
          : input.scores);
      const payload = buildWorkEvaluationInput({
        ...input,
        metrics: metrics!,
        scores: scores!,
      });
      const existingIndex = (prev.workEvaluations ?? []).findIndex(
        (item) =>
          item.period === input.period &&
          item.evaluatorId === input.evaluatorId &&
          item.evaluateeId === input.evaluateeId,
      );

      const next =
        existingIndex >= 0
          ? (prev.workEvaluations ?? []).map((item, index) =>
              index === existingIndex
                ? {
                    ...item,
                    ...payload,
                    id: item.id,
                    createdAt: item.createdAt,
                  }
                : item,
            )
          : [
              ...(prev.workEvaluations ?? []),
              { ...payload, id: newId("wev") },
            ];

      return { ...prev, workEvaluations: next };
    });
  }, []);

  const dismissClientPortalAction = useCallback(
    (contractId: string, userId: string, actionId: string) => {
      setData((prev) => {
        const existing = prev.clientPortalActionDismissals ?? [];
        if (
          existing.some(
            (d) =>
              d.contractId === contractId &&
              d.userId === userId &&
              d.actionId === actionId,
          )
        ) {
          return prev;
        }
        return {
          ...prev,
          clientPortalActionDismissals: [
            ...existing,
            {
              contractId,
              userId,
              actionId,
              dismissedAt: DEMO_TODAY,
            },
          ],
        };
      });
    },
    [],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      ...data,
      hydrated,
      contracts: syncAllContractProgress(data),
      addContract,
      updateContract,
      deleteContract,
      addExecution,
      updateExecution,
      deleteExecution,
      addExpense,
      updateExpense,
      deleteExpense,
      addUser,
      updateUser,
      deleteUser,
      addTeam,
      updateTeam,
      deleteTeam,
      addPartner,
      updatePartner,
      deletePartner,
      addPartnerReferralLead,
      updateWorkOrder,
      submitWorkOrder,
      approveWorkOrder,
      rejectWorkOrder,
      confirmWorkOrderByStaff,
      rejectWorkOrderByStaff,
      deliverWorkOrder,
      confirmWorkOrderPayment,
      ensureContractWorkOrders,
      cancelWorkOrder,
      holdWorkOrder,
      postponeWorkOrder,
      resumeWorkOrder,
      ensureContractExecutions,
      upsertAccountFromAuth,
      approveAccountProfile,
      rejectAccountProfile,
      approveExtension,
      rejectExtension,
      requestExtension,
      requestContractTermsApproval,
      approveContractTermsApproval,
      rejectContractTermsApproval,
      requestExpensePayout,
      approveExpensePayout,
      rejectExpensePayout,
      markExpensesPaid,
      approveBonusTeamLeader,
      approveBonusExecutive,
      approveBonusCeo,
      rejectBonus,
      payBonus,
      setExecutiveBonusLimit,
      setTeamLeaderBonusLimit,
      setStaffBonusPercent,
      requestBonusPayment,
      updateFundBudget,
      terminateContract,
      updateClientDepositStatus,
      addTaskChannel,
      updateTaskChannel,
      deleteTaskChannel,
      addExpenseCategory,
      updateExpenseCategory,
      deleteExpenseCategory,
      addPartnerFilterDefinition,
      updatePartnerFilterDefinition,
      deletePartnerFilterDefinition,
      addExperienceFieldDefinition,
      updateExperienceFieldDefinition,
      deleteExperienceFieldDefinition,
      upsertPlaceCredentials,
      createQaThread,
      replyQaThread,
      closeQaThread,
      addPostLinkOpinion,
      addExperienceCampaign,
      updateExperienceCampaign,
      sendExperienceCampaignToClient,
      proposeExperienceSchedule,
      acceptExperienceProposal,
      addExperienceParticipant,
      removeExperienceParticipant,
      updateExperienceParticipant,
      updateContractLocation,
      updateContractClientLinks,
      updatePartnerLocation,
      publishExperiencePartnerSlot,
      claimExperiencePartnerSlot,
      cancelExperiencePartnerSlot,
      submitExperienceParticipationProposal,
      acceptExperienceParticipationProposal,
      rejectExperienceParticipationProposal,
      addContractMemo,
      deleteContractMemo,
      upsertWorkEvaluation,
      dismissClientPortalAction,
      resetData,
    }),
    [
      data,
      hydrated,
      addContract,
      updateContract,
      deleteContract,
      addExecution,
      updateExecution,
      deleteExecution,
      addExpense,
      updateExpense,
      deleteExpense,
      addUser,
      updateUser,
      deleteUser,
      addTeam,
      updateTeam,
      deleteTeam,
      addPartner,
      updatePartner,
      deletePartner,
      addPartnerReferralLead,
      updateWorkOrder,
      submitWorkOrder,
      approveWorkOrder,
      rejectWorkOrder,
      confirmWorkOrderByStaff,
      rejectWorkOrderByStaff,
      deliverWorkOrder,
      confirmWorkOrderPayment,
      ensureContractWorkOrders,
      cancelWorkOrder,
      holdWorkOrder,
      postponeWorkOrder,
      resumeWorkOrder,
      ensureContractExecutions,
      upsertAccountFromAuth,
      approveAccountProfile,
      rejectAccountProfile,
      approveExtension,
      rejectExtension,
      requestExtension,
      requestContractTermsApproval,
      approveContractTermsApproval,
      rejectContractTermsApproval,
      requestExpensePayout,
      approveExpensePayout,
      rejectExpensePayout,
      markExpensesPaid,
      approveBonusTeamLeader,
      approveBonusExecutive,
      approveBonusCeo,
      rejectBonus,
      payBonus,
      setExecutiveBonusLimit,
      setTeamLeaderBonusLimit,
      setStaffBonusPercent,
      requestBonusPayment,
      updateFundBudget,
      terminateContract,
      updateClientDepositStatus,
      addTaskChannel,
      updateTaskChannel,
      deleteTaskChannel,
      addExpenseCategory,
      updateExpenseCategory,
      deleteExpenseCategory,
      addPartnerFilterDefinition,
      updatePartnerFilterDefinition,
      deletePartnerFilterDefinition,
      addExperienceFieldDefinition,
      updateExperienceFieldDefinition,
      deleteExperienceFieldDefinition,
      upsertPlaceCredentials,
      createQaThread,
      replyQaThread,
      closeQaThread,
      addPostLinkOpinion,
      addExperienceCampaign,
      updateExperienceCampaign,
      sendExperienceCampaignToClient,
      proposeExperienceSchedule,
      acceptExperienceProposal,
      addExperienceParticipant,
      removeExperienceParticipant,
      updateExperienceParticipant,
      updateContractLocation,
      updateContractClientLinks,
      updatePartnerLocation,
      publishExperiencePartnerSlot,
      claimExperiencePartnerSlot,
      cancelExperiencePartnerSlot,
      submitExperienceParticipationProposal,
      acceptExperienceParticipationProposal,
      rejectExperienceParticipationProposal,
      addContractMemo,
      deleteContractMemo,
      upsertWorkEvaluation,
      dismissClientPortalAction,
      resetData,
    ],
  );

  return (
    <DataContext.Provider value={value}>
      <ContractStoreProvider value={contractStore}>
        <FinanceStoreProvider value={financeStore}>
          <WorkOrderStoreProvider value={workOrderStore}>
            <BonusStoreProvider value={bonusStore}>
              <QaStoreProvider value={qaStore}>
                <ExperienceStoreProvider value={experienceStore}>
                  {children}
                </ExperienceStoreProvider>
              </QaStoreProvider>
            </BonusStoreProvider>
          </WorkOrderStoreProvider>
        </FinanceStoreProvider>
      </ContractStoreProvider>
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

export type { ContractTermsApproval, ExtensionApproval };
