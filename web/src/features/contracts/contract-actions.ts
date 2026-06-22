import { purgeContractFromAppData } from "@/core/domain/cascade-delete";
import { ensureExecutionsForContract } from "@/lib/execution-generation-utils";
import {
  normalizeClientLinksInput,
  type ClientLinksInput,
} from "@/lib/client-links-utils";
import {
  applyRecontractAfterTermination,
  applyRenewalSideEffects,
  hasMaterialTermsChange,
  termsChangeRecordNote,
  type ContractTermsChangeMode,
} from "@/lib/contract-terms-utils";
import type { LocationProfileInput } from "@/lib/location-profile-utils";
import {
  buildReferralCostLines,
  generateWorkOrdersForContract,
} from "@/lib/work-order-utils";
import { applySyncReferralCommissionWorkOrders } from "@/features/work-orders/work-order-actions";
import {
  getContractTargetChannels,
  getContractTargetCount,
} from "@/lib/task-channel-utils";
import type {
  AppData,
  Contract,
  ContractInput,
  ContractMemo,
  ContractRecord,
  ContractTermsProposedValues,
  Execution,
  ExecutionInput,
  TerminationReason,
} from "@/lib/types";
import type { IdFactory, TodayFn } from "@/core/data/persist-types";

export type ContractActionContext = {
  newId: IdFactory;
  todayISO: TodayFn;
};

export function applyAddContract(
  prev: AppData,
  input: ContractInput,
  ctx: ContractActionContext,
): { next: AppData; contract: Contract } {
  const contract: Contract = { ...input, id: ctx.newId("c") };
  const period = (contract.contractStartDate || ctx.todayISO()).slice(0, 7);
  const record: ContractRecord = {
    id: ctx.newId("cr"),
    contractId: contract.id,
    period,
    assignedStaffId: contract.assignedStaffId,
    teamId: contract.teamId,
    startedAt: contract.contractStartDate || ctx.todayISO(),
    monthlyFee: contract.monthlyFee,
    isExtension: contract.isExtension,
    note: "신규 계약",
  };
  return {
    contract,
    next: {
      ...prev,
      contracts: [...prev.contracts, contract],
      contractRecords: [...prev.contractRecords, record],
      executions: ensureExecutionsForContract(
        contract,
        prev.executions,
        prev.taskChannels,
        () => ctx.newId("ex"),
      ),
    },
  };
}

export function applyUpdateContract(
  prev: AppData,
  id: string,
  input: Partial<ContractInput>,
  mode: ContractTermsChangeMode,
  ctx: ContractActionContext,
): AppData {
  const old = prev.contracts.find((c) => c.id === id);
  let contractRecords = prev.contractRecords;
  const now = ctx.todayISO();

  let patch: Partial<ContractInput> = { ...input };
  if (mode === "recontract") {
    if (!old || old.status !== "terminated") return prev;
    patch = applyRecontractAfterTermination(old, patch);
  } else if (mode === "renewal" && old) {
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
        id: ctx.newId("cr"),
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

  const staffReassigned =
    old &&
    patch.assignedStaffId &&
    patch.assignedStaffId !== old.assignedStaffId;

  const merged = old ? { ...old, ...patch } : undefined;

  if (old && merged) {
    if (mode === "renewal") {
      contractRecords = contractRecords.map((r) =>
        r.contractId === id && !r.endedAt ? { ...r, endedAt: now } : r,
      );
      contractRecords = [
        ...contractRecords,
        {
          id: ctx.newId("cr"),
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
    } else if (mode === "recontract") {
      contractRecords = [
        ...contractRecords,
        {
          id: ctx.newId("cr"),
          contractId: id,
          period: (patch.contractStartDate ?? now).slice(0, 7),
          assignedStaffId: merged.assignedStaffId,
          teamId: merged.teamId,
          startedAt: patch.contractStartDate ?? now,
          monthlyFee: merged.monthlyFee,
          isExtension: false,
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
          id: ctx.newId("cr"),
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

  const updated = prev.contracts.find((c) => c.id === id);
  const mergedContract = updated ? { ...updated, ...patch } : undefined;
  let workOrders = prev.workOrders;
  let executions = mergedContract
    ? ensureExecutionsForContract(
        mergedContract,
        prev.executions,
        prev.taskChannels,
        () => ctx.newId("ex"),
      )
    : prev.executions;

  const targetsChanged =
    old &&
    mergedContract &&
    getContractTargetChannels(prev.taskChannels).some(
      (ch) =>
        getContractTargetCount(old, ch) !==
        getContractTargetCount(mergedContract, ch),
    );

  if (mergedContract) {
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
          ...generated.map((g) => ({ ...g, id: ctx.newId("wo") })),
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

    if (targetsChanged || mode === "renewal" || mode === "recontract") {
      const generated = generateWorkOrdersForContract(
        mergedContract,
        workOrders,
        prev.taskChannels,
      );
      if (generated.length > 0) {
        workOrders = [
          ...workOrders,
          ...generated.map((g) => ({ ...g, id: ctx.newId("wo") })),
        ];
      }
    }
  }

  return applySyncReferralCommissionWorkOrders(
    {
      ...prev,
      contractRecords,
      ...(staffReassigned
        ? {
            qaThreads: (prev.qaThreads ?? []).map((thread) =>
              thread.contractId === id && thread.status !== "closed"
                ? { ...thread, assignedStaffId: patch.assignedStaffId! }
                : thread,
            ),
          }
        : {}),
      ...(mode === "recontract"
        ? {
            extensionApprovals: prev.extensionApprovals.filter(
              (a) => !(a.contractId === id && a.status === "pending"),
            ),
            contractTermsApprovals: (prev.contractTermsApprovals ?? []).filter(
              (a) => !(a.contractId === id && a.status === "pending"),
            ),
          }
        : {}),
      contracts: prev.contracts.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
      workOrders,
      executions,
    },
    ctx.todayISO(),
    id,
  );
}

export function applyDeleteContract(prev: AppData, id: string): AppData {
  return purgeContractFromAppData(prev, id);
}

export function applyAddExecution(
  prev: AppData,
  input: ExecutionInput,
  ctx: ContractActionContext,
): { next: AppData; execution: Execution } {
  const execution: Execution = { ...input, id: ctx.newId("ex") };
  return {
    execution,
    next: { ...prev, executions: [...prev.executions, execution] },
  };
}

export function applyUpdateExecution(
  prev: AppData,
  id: string,
  input: Partial<ExecutionInput>,
): AppData {
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
}

export function applyDeleteExecution(prev: AppData, id: string): AppData {
  return {
    ...prev,
    executions: prev.executions.filter((e) => e.id !== id),
  };
}

export function applyTerminateContract(
  prev: AppData,
  contractId: string,
  reason: TerminationReason,
  today: string,
): AppData {
  const contract = prev.contracts.find((c) => c.id === contractId);
  if (!contract || contract.status === "terminated") return prev;

  return {
    ...prev,
    contracts: prev.contracts.map((c) =>
      c.id === contractId
        ? {
            ...c,
            status: "terminated" as const,
            terminationReason: reason,
            terminatedAt: today,
            contractEndDate: today,
          }
        : c,
    ),
    contractRecords: prev.contractRecords.map((r) =>
      r.contractId === contractId && !r.endedAt
        ? { ...r, endedAt: today, terminationReason: reason }
        : r,
    ),
  };
}

export function applyApproveExtension(prev: AppData, approvalId: string): AppData {
  const approval = prev.extensionApprovals.find((a) => a.id === approvalId);
  if (!approval) return prev;

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
}

export function applyRejectExtension(prev: AppData, approvalId: string): AppData {
  return {
    ...prev,
    extensionApprovals: prev.extensionApprovals.map((a) =>
      a.id === approvalId ? { ...a, status: "rejected" as const } : a,
    ),
  };
}

export function applyRequestExtension(
  prev: AppData,
  contractId: string,
  requestedBy: string,
  ctx: ContractActionContext,
): { next: AppData; ok: boolean } {
  const contract = prev.contracts.find((c) => c.id === contractId);
  if (!contract || contract.isExtension) return { next: prev, ok: false };

  const hasPending = prev.extensionApprovals.some(
    (a) => a.contractId === contractId && a.status === "pending",
  );
  if (hasPending) return { next: prev, ok: false };

  return {
    ok: true,
    next: {
      ...prev,
      extensionApprovals: [
        ...prev.extensionApprovals,
        {
          id: ctx.newId("ext"),
          contractId,
          requestedBy,
          status: "pending" as const,
          createdAt: ctx.todayISO(),
        },
      ],
    },
  };
}

export function applyRequestContractTermsApproval(
  prev: AppData,
  contractId: string,
  requestedBy: string,
  mode: ContractTermsChangeMode,
  proposedValues: ContractTermsProposedValues,
  ctx: ContractActionContext,
): { next: AppData; ok: boolean } {
  const contract = prev.contracts.find((c) => c.id === contractId);
  if (!contract) return { next: prev, ok: false };

  const hasPending = (prev.contractTermsApprovals ?? []).some(
    (a) => a.contractId === contractId && a.status === "pending",
  );
  if (hasPending) return { next: prev, ok: false };

  return {
    ok: true,
    next: {
      ...prev,
      contractTermsApprovals: [
        ...(prev.contractTermsApprovals ?? []),
        {
          id: ctx.newId("cta"),
          contractId,
          requestedBy,
          status: "pending" as const,
          createdAt: ctx.todayISO(),
          mode,
          proposedValues,
        },
      ],
    },
  };
}

export function applyApproveContractTermsApproval(
  prev: AppData,
  approvalId: string,
  reviewerId: string,
  ctx: ContractActionContext,
): AppData {
  const approval = (prev.contractTermsApprovals ?? []).find(
    (a) => a.id === approvalId,
  );
  if (!approval || approval.status !== "pending") return prev;

  const marked = {
    ...prev,
    contractTermsApprovals: (prev.contractTermsApprovals ?? []).map((a) =>
      a.id === approvalId
        ? {
            ...a,
            status: "approved" as const,
            reviewedBy: reviewerId,
            reviewedAt: ctx.todayISO(),
          }
        : a,
    ),
  };

  return applyUpdateContract(
    marked,
    approval.contractId,
    approval.proposedValues,
    approval.mode,
    ctx,
  );
}

export function applyRejectContractTermsApproval(
  prev: AppData,
  approvalId: string,
  reviewerId: string,
  ctx: ContractActionContext,
): AppData {
  return {
    ...prev,
    contractTermsApprovals: (prev.contractTermsApprovals ?? []).map((a) =>
      a.id === approvalId
        ? {
            ...a,
            status: "rejected" as const,
            reviewedBy: reviewerId,
            reviewedAt: ctx.todayISO(),
          }
        : a,
    ),
  };
}

export function applyAddContractMemo(
  prev: AppData,
  contractId: string,
  body: string,
  authorUserId: string,
  ctx: ContractActionContext,
): { next: AppData; memo: ContractMemo | null } {
  const trimmed = body.trim();
  if (!trimmed) return { next: prev, memo: null };

  const contract = prev.contracts.find((c) => c.id === contractId);
  if (!contract) return { next: prev, memo: null };

  const memo: ContractMemo = {
    id: ctx.newId("cm"),
    contractId,
    body: trimmed,
    createdAt: ctx.todayISO(),
    assignedStaffId: contract.assignedStaffId,
    authorUserId,
  };

  return {
    memo,
    next: {
      ...prev,
      contractMemos: [...(prev.contractMemos ?? []), memo],
    },
  };
}

export function applyDeleteContractMemo(prev: AppData, id: string): AppData {
  return {
    ...prev,
    contractMemos: (prev.contractMemos ?? []).filter((m) => m.id !== id),
  };
}

export function applyUpdateContractLocation(
  prev: AppData,
  contractId: string,
  input: LocationProfileInput,
): AppData {
  return {
    ...prev,
    contracts: prev.contracts.map((contract) =>
      contract.id === contractId
        ? {
            ...contract,
            address: input.address?.trim() || undefined,
            regionProvince: input.regionProvince || undefined,
            regionCity: input.regionCity || undefined,
          }
        : contract,
    ),
  };
}

export function applyUpdateContractClientLinks(
  prev: AppData,
  contractId: string,
  input: ClientLinksInput,
): AppData {
  const normalized = normalizeClientLinksInput(input);
  return {
    ...prev,
    contracts: prev.contracts.map((contract) =>
      contract.id === contractId
        ? { ...contract, ...normalized }
        : contract,
    ),
  };
}
