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
import {
  addDays,
  calcBonusAmounts,
  createBonusPaymentFromContract,
  calcScheduledPayDate,
  isBonusPayDue,
  validateStaffPercent,
  validateTeamLeaderLimit,
} from "@/lib/bonus-utils";
import { migratePostLinks, getValidPostLinks } from "@/lib/execution-utils";
import {
  ensureAllContractExecutions,
  ensureExecutionsForContract,
  executionSnapshotEqual,
  findExecutionForWorkOrder,
} from "@/lib/execution-generation-utils";
import { syncAllContractProgress } from "@/lib/selectors";
import {
  buildExpenseDescription,
  buildReferralCostLines,
  calcWorkOrderTotal,
  generateWorkOrdersForContract,
  shouldSyncExecutionForTask,
  taskTypeToExecutionType,
  taskTypeToExpenseCategory,
} from "@/lib/work-order-utils";
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
  AccountProfile,
  UserRole,
  ClientDepositStatus,
  PlaceCredentials,
  PlaceCredentialsInput,
  PostLinkOpinion,
  PostLinkOpinionInput,
  QaMessage,
  QaThread,
} from "@/lib/types";
import type { AuthSessionUser } from "@/lib/auth-utils";
import { canUserRequestExpense } from "@/lib/expense-payout-utils";
import {
  applyRenewalSideEffects,
  hasMaterialTermsChange,
  termsChangeRecordNote,
  type ContractTermsChangeMode,
} from "@/lib/contract-terms-utils";
import { normalizeExpenseCategories } from "@/lib/expense-category-utils";
import {
  getContractTargetChannels,
  getContractTargetCount,
  normalizeTaskChannels,
} from "@/lib/task-channel-utils";
import type {
  ExpenseCategoryDefinition,
  ExpenseCategoryInput,
  TaskChannelDefinition,
  TaskChannelInput,
} from "@/lib/types";
import {
  canCreateClientQaThread,
  canReplyQa,
} from "@/lib/place-qa-utils";

const STORAGE_KEY = "tripit-erp-v12";

/** normalizeContract에서 매번 시드 전체를 만들지 않도록 고정 기본값 사용 */
const DEFAULT_CONTRACT_START = "2026-06-01";
const DEFAULT_CONTRACT_END = "2026-06-30";

let seedFallbackCache: AppData | null = null;

function getSeedFallback(): AppData {
  if (!seedFallbackCache) seedFallbackCache = createSeedData();
  return seedFallbackCache;
}

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
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
  approveWorkOrder: (id: string, partnerUserId: string) => boolean;
  rejectWorkOrder: (id: string, reason: string) => void;
  deliverWorkOrder: (
    id: string,
    postLinks: WorkOrder["postLinks"],
    memo: string,
  ) => boolean;
  confirmWorkOrderPayment: (id: string, paidBy: string) => boolean;
  ensureContractWorkOrders: (contractId: string) => void;
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
  ) => QaThread;
  replyQaThread: (threadId: string, body: string, userId: string) => QaMessage;
  closeQaThread: (threadId: string, userId: string) => void;
  addPostLinkOpinion: (input: PostLinkOpinionInput) => PostLinkOpinion;
  addContractMemo: (contractId: string, body: string, authorUserId: string) => ContractMemo | null;
  deleteContractMemo: (id: string) => void;
  resetData: () => void;
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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeContract(contract: Contract): Contract {
  const start = contract.contractStartDate ?? DEFAULT_CONTRACT_START;
  return {
    ...contract,
    targetExperience: contract.targetExperience ?? 0,
    targetInstaCard: contract.targetInstaCard ?? 0,
    hasPlaceSetting: contract.hasPlaceSetting ?? false,
    contractStartDate: start,
    contractEndDate: contract.contractEndDate ?? DEFAULT_CONTRACT_END,
    status: contract.status ?? "active",
    renewalMonthCount: contract.renewalMonthCount ?? 1,
    lastClientDepositDate:
      contract.lastClientDepositDate ??
      (contract.status === "active" ? start : undefined),
    clientDepositStatus: contract.clientDepositStatus,
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

function normalizeAppData(data: AppData): AppData {
  const seed = getSeedFallback();
  const contracts = data.contracts.map(normalizeContract);
  const bonusPolicy = data.bonusPolicy ?? seed.bonusPolicy;
  const teams = data.teams ?? seed.teams;
  return {
    ...data,
    contracts,
    executions: data.executions.map(normalizeExecution),
    expenses: (data.expenses ?? seed.expenses).map((e, i) =>
      normalizeExpense(e, i),
    ),
    bonusPayments: (data.bonusPayments ?? seed.bonusPayments).map((p) =>
      normalizeBonusPayment(
        p,
        contracts,
        bonusPolicy,
        teams,
        data.users ?? seed.users,
      ),
    ),
    fundBudget: data.fundBudget ?? seed.fundBudget,
    contractRecords: data.contractRecords ?? seed.contractRecords,
    contractMemos: data.contractMemos ?? seed.contractMemos ?? [],
    bonusPolicy,
    partners: data.partners ?? seed.partners,
    workOrders: data.workOrders ?? seed.workOrders,
    accountProfiles: data.accountProfiles ?? seed.accountProfiles,
    taskChannels: normalizeTaskChannels(data.taskChannels ?? seed.taskChannels),
    expenseCategories: normalizeExpenseCategories(
      data.expenseCategories ?? seed.expenseCategories,
    ),
    placeCredentials: data.placeCredentials ?? seed.placeCredentials ?? [],
    qaThreads: data.qaThreads ?? seed.qaThreads ?? [],
    qaMessages: data.qaMessages ?? seed.qaMessages ?? [],
    postLinkOpinions: data.postLinkOpinions ?? seed.postLinkOpinions ?? [],
    partnerReferralLeads:
      data.partnerReferralLeads ?? seed.partnerReferralLeads ?? [],
  };
}

function loadStoredDataRaw(): AppData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

function applyContractSync(data: AppData): AppData {
  const withProgress = {
    ...data,
    contracts: syncAllContractProgress(data),
  };
  return normalizeAppData({
    ...withProgress,
    executions: ensureAllContractExecutions(withProgress, () =>
      newId("ex"),
    ),
  });
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => getSeedFallback());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    try {
      const stored = loadStoredDataRaw();
      if (stored) {
        // 1) 저장 데이터를 먼저 표시 → 로딩 즉시 해제
        setData(stored);
        setHydrated(true);

        // 2) 무거운 정규화·동기화는 다음 틱에 처리
        window.setTimeout(() => {
          if (cancelled) return;
          try {
            setData((prev) => applyContractSync(normalizeAppData(prev)));
          } catch (err) {
            console.error("데이터 정규화 실패", err);
          }
        }, 0);
        return () => {
          cancelled = true;
        };
      }

      setData(getSeedFallback());
    } catch (err) {
      console.error("데이터 로드 실패, 시드로 초기화합니다.", err);
      setData(getSeedFallback());
    }

    setHydrated(true);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        console.error("localStorage 저장 실패", err);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [data, hydrated]);

  const persist = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => applyContractSync(updater(prev)));
  }, []);

  const addContract = useCallback(
    (input: ContractInput) => {
      const contract: Contract = { ...input, id: newId("c") };
      const period = (contract.contractStartDate || todayISO()).slice(0, 7);
      const record: ContractRecord = {
        id: newId("cr"),
        contractId: contract.id,
        period,
        assignedStaffId: contract.assignedStaffId,
        teamId: contract.teamId,
        startedAt: contract.contractStartDate || todayISO(),
        monthlyFee: contract.monthlyFee,
        isExtension: contract.isExtension,
        note: "신규 계약",
      };
      persist((prev) => ({
        ...prev,
        contracts: [...prev.contracts, contract],
        contractRecords: [...prev.contractRecords, record],
        executions: ensureExecutionsForContract(
          contract,
          prev.executions,
          prev.taskChannels,
          () => newId("ex"),
        ),
      }));
      return contract;
    },
    [persist],
  );

  const updateContract = useCallback(
    (id: string, input: Partial<ContractInput>, options?: { mode?: ContractTermsChangeMode }) => {
      const mode = options?.mode ?? "amend";
      persist((prev) => {
        const old = prev.contracts.find((c) => c.id === id);
        let contractRecords = prev.contractRecords;
        const now = todayISO();

        let patch: Partial<ContractInput> = { ...input };
        if (mode === "renewal" && old) {
          patch = applyRenewalSideEffects(old, patch);
        }

        if (
          old &&
          patch.assignedStaffId &&
          patch.assignedStaffId !== old.assignedStaffId
        ) {
          contractRecords = contractRecords.map((r) =>
            r.contractId === id && !r.endedAt ? { ...r, endedAt: now } : r,
          );
          contractRecords = [
            ...contractRecords,
            {
              id: newId("cr"),
              contractId: id,
              period: now.slice(0, 7),
              assignedStaffId: patch.assignedStaffId,
              teamId: patch.teamId ?? old.teamId,
              startedAt: now,
              monthlyFee: patch.monthlyFee ?? old.monthlyFee,
              isExtension: patch.isExtension ?? old.isExtension,
              note: "담당자 변경",
            },
          ];
        }

        const merged = old ? { ...old, ...patch } : undefined;

        if (old && merged) {
          if (mode === "renewal") {
            contractRecords = contractRecords.map((r) =>
              r.contractId === id && !r.endedAt ? { ...r, endedAt: now } : r,
            );
            contractRecords = [
              ...contractRecords,
              {
                id: newId("cr"),
                contractId: id,
                period: (patch.contractStartDate ?? now).slice(0, 7),
                assignedStaffId: merged.assignedStaffId,
                teamId: merged.teamId,
                startedAt: patch.contractStartDate ?? now,
                monthlyFee: merged.monthlyFee,
                isExtension: merged.isExtension,
                note: termsChangeRecordNote(mode, merged.renewalMonthCount),
              },
            ];
          } else if (
            hasMaterialTermsChange(old, merged, prev.taskChannels) &&
            !(
              patch.assignedStaffId &&
              patch.assignedStaffId !== old.assignedStaffId &&
              old.monthlyFee === merged.monthlyFee &&
              old.contractStartDate === merged.contractStartDate &&
              old.contractEndDate === merged.contractEndDate &&
              old.hasPlaceSetting === merged.hasPlaceSetting &&
              !getContractTargetChannels(prev.taskChannels).some(
                (ch) =>
                  getContractTargetCount(old, ch) !==
                  getContractTargetCount(merged, ch),
              )
            )
          ) {
            contractRecords = [
              ...contractRecords,
              {
                id: newId("cr"),
                contractId: id,
                period: now.slice(0, 7),
                assignedStaffId: merged.assignedStaffId,
                teamId: merged.teamId,
                startedAt: now,
                monthlyFee: merged.monthlyFee,
                isExtension: merged.isExtension,
                note: termsChangeRecordNote(mode, merged.renewalMonthCount),
              },
            ];
          }
        }

        return {
          ...prev,
          contractRecords,
          contracts: prev.contracts.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
          ...(() => {
            const updated = prev.contracts.find((c) => c.id === id);
            if (!updated) return {};
            const mergedContract = { ...updated, ...patch };
            let workOrders = prev.workOrders;
            let executions = ensureExecutionsForContract(
              mergedContract,
              prev.executions,
              prev.taskChannels,
              () => newId("ex"),
            );

            const targetsChanged =
              old &&
              getContractTargetChannels(prev.taskChannels).some(
                (ch) =>
                  getContractTargetCount(old, ch) !==
                  getContractTargetCount(mergedContract, ch),
              );

            if (
              patch.referrerPartnerId !== undefined ||
              patch.hasReferralPromo !== undefined ||
              patch.monthlyFee !== undefined
            ) {
              workOrders = workOrders.map((w) => {
                if (w.contractId !== id || w.taskType !== "referral") return w;
                if (!["draft", "rejected"].includes(w.stage)) return w;
                return {
                  ...w,
                  partnerId: mergedContract.referrerPartnerId ?? w.partnerId,
                  costLines:
                    patch.monthlyFee !== undefined
                      ? buildReferralCostLines(mergedContract.monthlyFee)
                      : w.costLines,
                };
              });
            }

            if (mergedContract.hasReferralPromo && mergedContract.status === "active") {
              const generated = generateWorkOrdersForContract(
                mergedContract,
                workOrders,
                prev.taskChannels,
              );
              if (generated.length > 0) {
                workOrders = [
                  ...workOrders,
                  ...generated.map((g) => ({ ...g, id: newId("wo") })),
                ];
              }
            }

            if (mergedContract.hasReferralPromo === false) {
              workOrders = workOrders.filter(
                (w) =>
                  !(
                    w.contractId === id &&
                    w.taskType === "referral" &&
                    ["draft", "rejected"].includes(w.stage)
                  ),
              );
            }

            if (targetsChanged || mode === "renewal") {
              const generated = generateWorkOrdersForContract(
                mergedContract,
                workOrders,
                prev.taskChannels,
              );
              if (generated.length > 0) {
                workOrders = [
                  ...workOrders,
                  ...generated.map((g) => ({ ...g, id: newId("wo") })),
                ];
              }
            }

            return { workOrders, executions };
          })(),
        };
      });
    },
    [persist],
  );

  const deleteContract = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        contracts: prev.contracts.filter((c) => c.id !== id),
        executions: prev.executions.filter((e) => e.contractId !== id),
        expenses: prev.expenses.filter((e) => e.contractId !== id),
        extensionApprovals: prev.extensionApprovals.filter(
          (a) => a.contractId !== id,
        ),
        contractRecords: prev.contractRecords.filter(
          (r) => r.contractId !== id,
        ),
        contractMemos: (prev.contractMemos ?? []).filter(
          (m) => m.contractId !== id,
        ),
        workOrders: prev.workOrders.filter((w) => w.contractId !== id),
        placeCredentials: prev.placeCredentials.filter(
          (p) => p.contractId !== id,
        ),
        qaThreads: prev.qaThreads.filter((t) => t.contractId !== id),
        qaMessages: prev.qaMessages.filter(
          (m) =>
            !prev.qaThreads.some(
              (t) => t.contractId === id && t.id === m.threadId,
            ),
        ),
        postLinkOpinions: (prev.postLinkOpinions ?? []).filter(
          (o) => o.contractId !== id,
        ),
      }));
    },
    [persist],
  );

  const addExecution = useCallback(
    (input: ExecutionInput) => {
      const execution: Execution = { ...input, id: newId("ex") };
      persist((prev) => ({
        ...prev,
        executions: [...prev.executions, execution],
      }));
      return execution;
    },
    [persist],
  );

  const updateExecution = useCallback(
    (id: string, input: Partial<ExecutionInput>) => {
      persist((prev) => {
        const updated = prev.executions.map((e) =>
          e.id === id ? { ...e, ...input } : e,
        );
        const exec = updated.find((e) => e.id === id);
        if (!exec) return { ...prev, executions: updated };

        const contracts = prev.contracts.map((c) => {
          if (c.id !== exec.contractId) return c;
          if (exec.type === "optimized") {
            return { ...c, optimizedDone: exec.completedCount };
          }
          if (exec.type === "influencer") {
            return { ...c, influencerDone: exec.completedCount };
          }
          return c;
        });

        return { ...prev, executions: updated, contracts };
      });
    },
    [persist],
  );

  const deleteExecution = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        executions: prev.executions.filter((e) => e.id !== id),
      }));
    },
    [persist],
  );

  const addExpense = useCallback(
    (input: ExpenseInput) => {
      const expense: Expense = { ...input, id: newId("e") };
      persist((prev) => ({ ...prev, expenses: [...prev.expenses, expense] }));
      return expense;
    },
    [persist],
  );

  const updateExpense = useCallback(
    (id: string, input: Partial<ExpenseInput>) => {
      persist((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) =>
          e.id === id ? { ...e, ...input } : e,
        ),
      }));
    },
    [persist],
  );

  const deleteExpense = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        expenses: prev.expenses.filter((e) => e.id !== id),
      }));
    },
    [persist],
  );

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
      requestedAt: existing?.requestedAt ?? today(),
      approvedAt: existing?.approvedAt ?? today(),
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
      const partner: Partner = { ...input, id: newId("p") };
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
          p.id === id ? { ...p, ...input } : p,
        ),
      }));
    },
    [persist],
  );

  const deletePartner = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        partners: prev.partners.filter((p) => p.id !== id),
        expenses: prev.expenses.map((e) =>
          e.partnerId === id ? { ...e, partnerId: undefined } : e,
        ),
        workOrders: prev.workOrders.map((w) =>
          w.partnerId === id ? { ...w, partnerId: undefined } : w,
        ),
      }));
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

  const updateWorkOrder = useCallback(
    (id: string, input: Partial<WorkOrderInput>) => {
      persist((prev) => ({
        ...prev,
        workOrders: prev.workOrders.map((w) => {
          if (w.id !== id) return w;
          if (!["draft", "rejected"].includes(w.stage)) return w;
          return { ...w, ...input };
        }),
      }));
    },
    [persist],
  );

  const submitWorkOrder = useCallback(
    (id: string, requestedBy: string): boolean => {
      let ok = false;
      persist((prev) => {
        const order = prev.workOrders.find((w) => w.id === id);
        if (
          !order ||
          !["draft", "rejected"].includes(order.stage) ||
          !order.partnerId ||
          calcWorkOrderTotal(order.costLines) <= 0
        ) {
          return prev;
        }
        ok = true;
        return {
          ...prev,
          workOrders: prev.workOrders.map((w) =>
            w.id === id
              ? {
                  ...w,
                  stage: "pending_approval" as const,
                  requestedBy,
                  requestedAt: today(),
                  rejectedReason: undefined,
                }
              : w,
          ),
        };
      });
      return ok;
    },
    [persist],
  );

  const approveWorkOrder = useCallback(
    (id: string, partnerUserId: string): boolean => {
      let ok = false;
      persist((prev) => {
        const order = prev.workOrders.find((w) => w.id === id);
        if (!order || order.stage !== "pending_approval") return prev;
        ok = true;
        return {
          ...prev,
          workOrders: prev.workOrders.map((w) =>
            w.id === id
              ? {
                  ...w,
                  stage: "approved" as const,
                  approvedBy: partnerUserId,
                  approvedAt: today(),
                }
              : w,
          ),
        };
      });
      return ok;
    },
    [persist],
  );

  const rejectWorkOrder = useCallback(
    (id: string, reason: string) => {
      persist((prev) => ({
        ...prev,
        workOrders: prev.workOrders.map((w) =>
          w.id === id && w.stage === "pending_approval"
            ? {
                ...w,
                stage: "rejected" as const,
                rejectedReason: reason || "파트너 반려",
              }
            : w,
        ),
      }));
    },
    [persist],
  );

  const deliverWorkOrder = useCallback(
    (id: string, postLinks: WorkOrder["postLinks"], memo: string): boolean => {
      let ok = false;
      persist((prev) => {
        const order = prev.workOrders.find((w) => w.id === id);
        if (!order || order.stage !== "approved") return prev;
        const links = getValidPostLinks(postLinks);
        if (links.length === 0 && !memo.trim()) return prev;
        ok = true;
        return {
          ...prev,
          workOrders: prev.workOrders.map((w) =>
            w.id === id
              ? {
                  ...w,
                  stage: "delivered" as const,
                  postLinks: links,
                  memo,
                  deliveredAt: today(),
                }
              : w,
          ),
        };
      });
      return ok;
    },
    [persist],
  );

  const confirmWorkOrderPayment = useCallback(
    (id: string, paidBy: string): boolean => {
      let ok = false;
      persist((prev) => {
        const order = prev.workOrders.find((w) => w.id === id);
        if (!order || order.stage !== "delivered") return prev;
        const partner = prev.partners.find((p) => p.id === order.partnerId);
        const total = calcWorkOrderTotal(order.costLines);
        if (total <= 0) return prev;

        const expenseId = newId("e");
        const expense = {
          id: expenseId,
          contractId: order.contractId,
          category: taskTypeToExpenseCategory(order.taskType, prev.taskChannels),
          description: buildExpenseDescription(order, prev.taskChannels),
          amount: total,
          bankAccount: partner?.bankAccount ?? "",
          accountHolder: partner?.accountHolder ?? "",
          partnerId: order.partnerId,
          paymentDueDate: order.dueDate,
          payoutStatus: "paid" as const,
        };

        const execType = taskTypeToExecutionType(order.taskType, prev.taskChannels);
        let executionId = order.executionId;
        let executions = [...prev.executions];

        if (shouldSyncExecutionForTask(order.taskType, prev.taskChannels)) {
          const existing = findExecutionForWorkOrder(
            executions,
            order.contractId,
            order.taskType,
            prev.taskChannels,
          );

          if (existing) {
            const mergedLinks = [
              ...existing.postLinks,
              ...order.postLinks.filter(
                (l) => !existing.postLinks.some((p) => p.url === l.url),
              ),
            ];
            const completedCount = Math.min(
              existing.targetCount,
              existing.completedCount + 1,
            );
            executionId = existing.id;
            executions = executions.map((e) =>
              e.id === existing.id
                ? {
                    ...e,
                    postLinks: mergedLinks,
                    completedCount,
                    status:
                      completedCount >= e.targetCount
                        ? ("completed" as const)
                        : ("in_progress" as const),
                    completedDate:
                      completedCount >= e.targetCount
                        ? today()
                        : e.completedDate,
                  }
                : e,
            );
          } else {
            const contract = prev.contracts.find((c) => c.id === order.contractId);
            const channel = prev.taskChannels.find((c) => c.id === order.taskType);
            const targetCount =
              contract && channel
                ? getContractTargetCount(contract, channel) || 1
                : 1;
            const newExec = {
              id: newId("ex"),
              contractId: order.contractId,
              type: execType,
              taskChannelId: order.taskType,
              status: "in_progress" as const,
              completedCount: 1,
              targetCount,
              dueDate: order.dueDate,
              memo: order.memo ?? "",
              postLinks: order.postLinks,
              enteredAt: today(),
            };
            executionId = newExec.id;
            executions.push(newExec);
          }
        }

        const contracts = shouldSyncExecutionForTask(
          order.taskType,
          prev.taskChannels,
        )
          ? prev.contracts.map((c) => {
              if (c.id !== order.contractId) return c;
              const channel = prev.taskChannels.find(
                (ch) => ch.id === order.taskType,
              );
              if (channel?.contractDoneField) {
                const field = channel.contractDoneField;
                const target = getContractTargetCount(c, channel);
                return {
                  ...c,
                  [field]: Math.min(target, (c[field] ?? 0) + 1),
                };
              }
              if (execType === "optimized") {
                return {
                  ...c,
                  optimizedDone: Math.min(c.targetOptimized, c.optimizedDone + 1),
                };
              }
              if (execType === "influencer") {
                return {
                  ...c,
                  influencerDone: Math.min(
                    c.targetInfluencer,
                    c.influencerDone + 1,
                  ),
                };
              }
              return c;
            })
          : prev.contracts;

        ok = true;
        return {
          ...prev,
          expenses: [...prev.expenses, expense],
          executions,
          contracts,
          workOrders: prev.workOrders.map((w) =>
            w.id === id
              ? {
                  ...w,
                  stage: "order_ready" as const,
                  paidAt: today(),
                  paidBy,
                  expenseId,
                  executionId,
                }
              : w,
          ),
        };
      });
      return ok;
    },
    [persist],
  );

  const ensureContractWorkOrders = useCallback(
    (contractId: string) => {
      persist((prev) => {
        const contract = prev.contracts.find((c) => c.id === contractId);
        if (!contract || contract.status !== "active") return prev;
        const generated = generateWorkOrdersForContract(
          contract,
          prev.workOrders,
          prev.taskChannels,
        );
        if (generated.length === 0) return prev;
        return {
          ...prev,
          workOrders: [
            ...prev.workOrders,
            ...generated.map((g) => ({ ...g, id: newId("wo") })),
          ],
        };
      });
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
        const existing = prev.accountProfiles.find(
          (p) => p.googleId === auth.googleId || p.email === auth.email,
        );
        if (existing) {
          profile = {
            ...existing,
            googleId: auth.googleId,
            email: auth.email,
            name: auth.name,
            avatarUrl: auth.avatarUrl ?? existing.avatarUrl,
          };
          return {
            ...prev,
            accountProfiles: prev.accountProfiles.map((p) =>
              p.id === existing.id ? profile : p,
            ),
          };
        }
        profile = {
          id: newId("ap"),
          googleId: auth.googleId,
          email: auth.email,
          name: auth.name,
          avatarUrl: auth.avatarUrl,
          status: "pending",
          requestedAt: today(),
        };
        return {
          ...prev,
          accountProfiles: [...prev.accountProfiles, profile],
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
                  approvedAt: today(),
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
                approvedAt: today(),
              }
            : p,
        ),
      }));
    },
    [persist],
  );

  const approveExtension = useCallback(
    (approvalId: string) => {
      persist((prev) => {
        const approval = prev.extensionApprovals.find(
          (a) => a.id === approvalId,
        );
        if (!approval) return prev;

        const contract = prev.contracts.find(
          (c) => c.id === approval.contractId,
        );

        return {
          ...prev,
          extensionApprovals: prev.extensionApprovals.map((a) =>
            a.id === approvalId ? { ...a, status: "approved" as const } : a,
          ),
          contracts: prev.contracts.map((c) =>
            c.id === approval.contractId
              ? {
                  ...c,
                  isExtension: true,
                  renewalMonthCount: Math.max(1, c.renewalMonthCount + 1),
                  clientDepositStatus: "pending" as const,
                  lastClientDepositDate: undefined,
                }
              : c,
          ),
        };
      });
    },
    [persist],
  );

  const rejectExtension = useCallback(
    (approvalId: string) => {
      persist((prev) => ({
        ...prev,
        extensionApprovals: prev.extensionApprovals.map((a) =>
          a.id === approvalId ? { ...a, status: "rejected" as const } : a,
        ),
      }));
    },
    [persist],
  );

  const requestExtension = useCallback(
    (contractId: string, requestedBy: string): boolean => {
      let ok = false;
      persist((prev) => {
        const contract = prev.contracts.find((c) => c.id === contractId);
        if (!contract || contract.isExtension) return prev;

        const hasPending = prev.extensionApprovals.some(
          (a) => a.contractId === contractId && a.status === "pending",
        );
        if (hasPending) return prev;

        ok = true;
        return {
          ...prev,
          extensionApprovals: [
            ...prev.extensionApprovals,
            {
              id: newId("ext"),
              contractId,
              requestedBy,
              status: "pending" as const,
              createdAt: new Date().toISOString().slice(0, 10),
            },
          ],
        };
      });
      return ok;
    },
    [persist],
  );

  const markExpensesPaid = useCallback(
    (ids: string[]) => {
      persist((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) =>
          ids.includes(e.id) && e.payoutStatus === "pending_transfer"
            ? { ...e, payoutStatus: "paid" as const }
            : e,
        ),
      }));
    },
    [persist],
  );

  const requestExpensePayout = useCallback(
    (expenseId: string, requestedBy: string): boolean => {
      let ok = false;
      persist((prev) => {
        const expense = prev.expenses.find((e) => e.id === expenseId);
        const requester = prev.users.find((u) => u.id === requestedBy);
        if (
          !expense ||
          !requester ||
          !canUserRequestExpense(prev, expense, requestedBy, requester.role)
        ) {
          return prev;
        }
        ok = true;
        return {
          ...prev,
          expenses: prev.expenses.map((e) =>
            e.id === expenseId
              ? {
                  ...e,
                  payoutStatus: "pending_approval" as const,
                  payoutRequestedBy: requestedBy,
                  payoutRequestedAt: todayISO(),
                }
              : e,
          ),
        };
      });
      return ok;
    },
    [persist],
  );

  const approveExpensePayout = useCallback(
    (expenseId: string, approverId: string): boolean => {
      let ok = false;
      persist((prev) => {
        const expense = prev.expenses.find((e) => e.id === expenseId);
        const approver = prev.users.find((u) => u.id === approverId);
        if (
          !expense ||
          expense.payoutStatus !== "pending_approval" ||
          !approver ||
          (approver.role !== "ceo" && approver.role !== "executive")
        ) {
          return prev;
        }
        ok = true;
        return {
          ...prev,
          expenses: prev.expenses.map((e) =>
            e.id === expenseId
              ? {
                  ...e,
                  payoutStatus: "pending_transfer" as const,
                  payoutApprovedBy: approverId,
                  payoutApprovedAt: todayISO(),
                }
              : e,
          ),
        };
      });
      return ok;
    },
    [persist],
  );

  const rejectExpensePayout = useCallback(
    (expenseId: string, approverId: string): boolean => {
      let ok = false;
      persist((prev) => {
        const expense = prev.expenses.find((e) => e.id === expenseId);
        const approver = prev.users.find((u) => u.id === approverId);
        if (
          !expense ||
          expense.payoutStatus !== "pending_approval" ||
          !approver ||
          (approver.role !== "ceo" && approver.role !== "executive")
        ) {
          return prev;
        }
        ok = true;
        return {
          ...prev,
          expenses: prev.expenses.map((e) =>
            e.id === expenseId
              ? {
                  ...e,
                  payoutStatus: "unpaid" as const,
                  payoutRequestedBy: undefined,
                  payoutRequestedAt: undefined,
                }
              : e,
          ),
        };
      });
      return ok;
    },
    [persist],
  );

  const today = () => new Date().toISOString().slice(0, 10);

  const approveBonusTeamLeader = useCallback(
    (paymentId: string, approverId: string) => {
      persist((prev) => ({
        ...prev,
        bonusPayments: prev.bonusPayments.map((p) =>
          p.id === paymentId && p.stage === "pending_team_leader"
            ? {
                ...p,
                stage: "pending_executive" as const,
                teamLeaderApprovedBy: approverId,
                teamLeaderApprovedAt: today(),
              }
            : p,
        ),
      }));
    },
    [persist],
  );

  const approveBonusExecutive = useCallback(
    (paymentId: string, approverId: string) => {
      persist((prev) => ({
        ...prev,
        bonusPayments: prev.bonusPayments.map((p) =>
          p.id === paymentId && p.stage === "pending_executive"
            ? {
                ...p,
                stage: "pending_ceo" as const,
                executiveApprovedBy: approverId,
                executiveApprovedAt: today(),
              }
            : p,
        ),
      }));
    },
    [persist],
  );

  const approveBonusCeo = useCallback(
    (paymentId: string, approverId: string) => {
      persist((prev) => ({
        ...prev,
        bonusPayments: prev.bonusPayments.map((p) =>
          p.id === paymentId && p.stage === "pending_ceo"
            ? {
                ...p,
                stage: "ceo_confirmed" as const,
                ceoApprovedBy: approverId,
                ceoApprovedAt: today(),
              }
            : p,
        ),
      }));
    },
    [persist],
  );

  const rejectBonus = useCallback(
    (paymentId: string, rejectedBy: string) => {
      persist((prev) => ({
        ...prev,
        bonusPayments: prev.bonusPayments.map((p) =>
          p.id === paymentId &&
          p.stage !== "paid" &&
          p.stage !== "rejected"
            ? {
                ...p,
                stage: "rejected" as const,
                rejectedBy,
                rejectedAt: today(),
              }
            : p,
        ),
      }));
    },
    [persist],
  );

  const payBonus = useCallback(
    (paymentId: string, paidBy: string) => {
      let ok = false;
      persist((prev) => {
        const payment = prev.bonusPayments.find((p) => p.id === paymentId);
        if (!payment || payment.stage !== "ceo_confirmed") return prev;
        if (!isBonusPayDue(payment.scheduledPayDate)) return prev;

        ok = true;
        return {
          ...prev,
          bonusPayments: prev.bonusPayments.map((p) =>
            p.id === paymentId
              ? {
                  ...p,
                  stage: "paid" as const,
                  paidBy,
                  paidAt: today(),
                }
              : p,
          ),
          fundBudget: {
            ...prev.fundBudget,
            bonusAllocated: Math.max(
              0,
              prev.fundBudget.bonusAllocated - payment.totalAmount,
            ),
            operatingReserve:
              prev.fundBudget.operatingReserve - payment.totalAmount,
          },
        };
      });
      return ok;
    },
    [persist],
  );

  const updateFundBudget = useCallback(
    (input: Partial<FundBudget>) => {
      persist((prev) => ({
        ...prev,
        fundBudget: { ...prev.fundBudget, ...input },
      }));
    },
    [persist],
  );

  const terminateContract = useCallback(
    (contractId: string, reason: TerminationReason) => {
      persist((prev) => {
        const contract = prev.contracts.find((c) => c.id === contractId);
        if (!contract || contract.status === "terminated") return prev;

        const now = todayISO();
        return {
          ...prev,
          contracts: prev.contracts.map((c) =>
            c.id === contractId
              ? {
                  ...c,
                  status: "terminated" as const,
                  terminationReason: reason,
                  terminatedAt: now,
                  contractEndDate: now,
                }
              : c,
          ),
          contractRecords: prev.contractRecords.map((r) =>
            r.contractId === contractId && !r.endedAt
              ? { ...r, endedAt: now, terminationReason: reason }
              : r,
          ),
        };
      });
    },
    [persist],
  );

  const setExecutiveBonusLimit = useCallback(
    (executiveId: string, percent: number): boolean => {
      if (percent < 0 || percent > 15) return false;
      persist((prev) => ({
        ...prev,
        bonusPolicy: {
          ...prev.bonusPolicy,
          executiveMaxPercent: {
            ...prev.bonusPolicy.executiveMaxPercent,
            [executiveId]: percent,
          },
        },
      }));
      return true;
    },
    [persist],
  );

  const setTeamLeaderBonusLimit = useCallback(
    (leaderId: string, percent: number): boolean => {
      let ok = true;
      persist((prev) => {
        const err = validateTeamLeaderLimit(prev, prev.bonusPolicy, leaderId, percent);
        if (err) {
          ok = false;
          return prev;
        }
        return {
          ...prev,
          bonusPolicy: {
            ...prev.bonusPolicy,
            teamLeaderMaxPercent: {
              ...prev.bonusPolicy.teamLeaderMaxPercent,
              [leaderId]: percent,
            },
          },
        };
      });
      return ok;
    },
    [persist],
  );

  const setStaffBonusPercent = useCallback(
    (staffId: string, percent: number): boolean => {
      let ok = true;
      persist((prev) => {
        const err = validateStaffPercent(prev, prev.bonusPolicy, staffId, percent);
        if (err) {
          ok = false;
          return prev;
        }
        return {
          ...prev,
          bonusPolicy: {
            ...prev.bonusPolicy,
            staffPercent: {
              ...prev.bonusPolicy.staffPercent,
              [staffId]: percent,
            },
          },
        };
      });
      return ok;
    },
    [persist],
  );

  const requestBonusPayment = useCallback(
    (contractId: string, requestedBy: string): boolean => {
      let ok = false;
      persist((prev) => {
        const contract = prev.contracts.find((c) => c.id === contractId);
        if (!contract || contract.assignedStaffId !== requestedBy) return prev;
        if (
          !contract.isExtension ||
          contract.renewalMonthCount < 4 ||
          contract.status !== "active" ||
          !contract.lastClientDepositDate
        ) {
          return prev;
        }

        const duplicate = prev.bonusPayments.some(
          (p) =>
            p.contractId === contractId &&
            !["paid", "rejected"].includes(p.stage),
        );
        if (duplicate) return prev;

        ok = true;
        return {
          ...prev,
          bonusPayments: [
            ...prev.bonusPayments,
            {
              ...createBonusPaymentFromContract(
                contract,
                prev.bonusPolicy,
                prev,
                requestedBy,
              ),
              id: newId("bp"),
            },
          ],
        };
      });
      return ok;
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

  const upsertPlaceCredentials = useCallback(
    (
      contractId: string,
      input: PlaceCredentialsInput,
      userId: string,
    ): PlaceCredentials => {
      const now = todayISO();
      let saved: PlaceCredentials = {
        id: newId("pc"),
        contractId,
        ...input,
        updatedAt: now,
        updatedByUserId: userId,
      };
      persist((prev) => {
        const existing = prev.placeCredentials.find(
          (p) => p.contractId === contractId,
        );
        saved = existing
          ? { ...existing, ...input, updatedAt: now, updatedByUserId: userId }
          : saved;
        const rest = prev.placeCredentials.filter(
          (p) => p.contractId !== contractId,
        );
        return { ...prev, placeCredentials: [...rest, saved] };
      });
      return saved;
    },
    [persist],
  );

  const createQaThread = useCallback(
    (
      contractId: string,
      subject: string,
      body: string,
      userId: string,
    ): QaThread => {
      const now = todayISO();
      const threadId = newId("qa");
      const messageId = newId("qm");
      let created: QaThread = {
        id: threadId,
        contractId,
        subject,
        status: "open",
        createdByUserId: userId,
        assignedStaffId: "",
        createdAt: now,
        lastMessageAt: now,
      };
      persist((prev) => {
        const contract = prev.contracts.find((c) => c.id === contractId);
        const author = prev.users.find((u) => u.id === userId);
        if (
          !contract ||
          !author ||
          !canCreateClientQaThread(prev, author.role, userId, contractId)
        ) {
          return prev;
        }
        created = {
          ...created,
          assignedStaffId: contract.assignedStaffId,
        };
        const message: QaMessage = {
          id: messageId,
          threadId,
          authorUserId: userId,
          body,
          createdAt: now,
        };
        return {
          ...prev,
          qaThreads: [...prev.qaThreads, created],
          qaMessages: [...prev.qaMessages, message],
        };
      });
      return created;
    },
    [persist],
  );

  const replyQaThread = useCallback(
    (threadId: string, body: string, userId: string): QaMessage => {
      const now = todayISO();
      const message: QaMessage = {
        id: newId("qm"),
        threadId,
        authorUserId: userId,
        body,
        createdAt: now,
      };
      persist((prev) => {
        const author = prev.users.find((u) => u.id === userId);
        const thread = prev.qaThreads.find((t) => t.id === threadId);
        if (
          !author ||
          !thread ||
          !canReplyQa(prev, author.role, userId, thread.contractId)
        ) {
          return prev;
        }
        const isClient = author.role === "client";
        return {
          ...prev,
          qaMessages: [...prev.qaMessages, message],
          qaThreads: prev.qaThreads.map((t) => {
            if (t.id !== threadId) return t;
            return {
              ...t,
              lastMessageAt: now,
              status: isClient ? "open" : "answered",
            };
          }),
        };
      });
      return message;
    },
    [persist],
  );

  const closeQaThread = useCallback(
    (threadId: string, userId: string) => {
      const now = todayISO();
      persist((prev) => ({
        ...prev,
        qaThreads: prev.qaThreads.map((t) =>
          t.id === threadId
            ? {
                ...t,
                status: "closed" as const,
                closedAt: now,
                closedByUserId: userId,
              }
            : t,
        ),
      }));
    },
    [persist],
  );

  const addPostLinkOpinion = useCallback(
    (input: PostLinkOpinionInput) => {
      const opinion: PostLinkOpinion = {
        ...input,
        id: newId("plo"),
        createdAt: todayISO(),
        body: input.body.trim(),
        imageUrls: input.imageUrls ?? [],
      };
      persist((prev) => ({
        ...prev,
        postLinkOpinions: [...(prev.postLinkOpinions ?? []), opinion],
      }));
      return opinion;
    },
    [persist],
  );

  const addContractMemo = useCallback(
    (contractId: string, body: string, authorUserId: string) => {
      const trimmed = body.trim();
      if (!trimmed) return null;

      let created: ContractMemo | null = null;
      persist((prev) => {
        const contract = prev.contracts.find((c) => c.id === contractId);
        if (!contract) return prev;

        created = {
          id: newId("cm"),
          contractId,
          body: trimmed,
          createdAt: todayISO(),
          assignedStaffId: contract.assignedStaffId,
          authorUserId,
        };

        return {
          ...prev,
          contractMemos: [...(prev.contractMemos ?? []), created],
        };
      });
      return created;
    },
    [persist],
  );

  const deleteContractMemo = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        contractMemos: (prev.contractMemos ?? []).filter((m) => m.id !== id),
      }));
    },
    [persist],
  );

  const resetData = useCallback(() => {
    seedFallbackCache = null;
    setData(createSeedData());
  }, []);

  const updateClientDepositStatus = useCallback(
    (contractId: string, status: ClientDepositStatus, depositDate?: string) => {
      const today = todayISO();
      persist((prev) => {
        let updated: Contract | undefined;
        const contracts = prev.contracts.map((c) => {
          if (c.id !== contractId) return c;
          const next: Contract = { ...c, clientDepositStatus: status };
          if (status === "completed") {
            next.lastClientDepositDate =
              depositDate || c.lastClientDepositDate || today;
          } else if (status === "pending") {
            next.lastClientDepositDate = undefined;
          }
          updated = next;
          return next;
        });

        const bonusPayments = prev.bonusPayments.map((p) => {
          if (p.contractId !== contractId) return p;
          const deposit = updated?.lastClientDepositDate;
          if (!deposit) return p;
          return {
            ...p,
            clientDepositDate: deposit,
            scheduledPayDate: calcScheduledPayDate(deposit),
          };
        });

        return { ...prev, contracts, bonusPayments };
      });
    },
    [persist],
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
      deliverWorkOrder,
      confirmWorkOrderPayment,
      ensureContractWorkOrders,
      ensureContractExecutions,
      upsertAccountFromAuth,
      approveAccountProfile,
      rejectAccountProfile,
      approveExtension,
      rejectExtension,
      requestExtension,
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
      upsertPlaceCredentials,
      createQaThread,
      replyQaThread,
      closeQaThread,
      addPostLinkOpinion,
      addContractMemo,
      deleteContractMemo,
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
      deliverWorkOrder,
      confirmWorkOrderPayment,
      ensureContractWorkOrders,
      ensureContractExecutions,
      upsertAccountFromAuth,
      approveAccountProfile,
      rejectAccountProfile,
      approveExtension,
      rejectExtension,
      requestExtension,
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
      upsertPlaceCredentials,
      createQaThread,
      replyQaThread,
      closeQaThread,
      addPostLinkOpinion,
      addContractMemo,
      deleteContractMemo,
      resetData,
    ],
  );

  return (
    <DataContext.Provider value={value}>{children}</DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

export type { ExtensionApproval };
