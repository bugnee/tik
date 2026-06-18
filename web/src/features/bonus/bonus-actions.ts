import {
  canRequestBonus,
  createBonusPaymentFromContract,
  isBonusPayDue,
  validateStaffPercent,
  validateTeamLeaderLimit,
} from "@/lib/bonus-utils";
import type { AppData } from "@/lib/types";
import type { IdFactory, TodayFn } from "@/core/data/persist-types";

export type BonusActionContext = {
  newId: IdFactory;
  todayISO: TodayFn;
};

export function applyApproveBonusTeamLeader(
  prev: AppData,
  paymentId: string,
  approverId: string,
  ctx: BonusActionContext,
): AppData {
  return {
    ...prev,
    bonusPayments: prev.bonusPayments.map((p) =>
      p.id === paymentId && p.stage === "pending_team_leader"
        ? {
            ...p,
            stage: "pending_executive" as const,
            teamLeaderApprovedBy: approverId,
            teamLeaderApprovedAt: ctx.todayISO(),
          }
        : p,
    ),
  };
}

export function applyApproveBonusExecutive(
  prev: AppData,
  paymentId: string,
  approverId: string,
  ctx: BonusActionContext,
): AppData {
  return {
    ...prev,
    bonusPayments: prev.bonusPayments.map((p) =>
      p.id === paymentId && p.stage === "pending_executive"
        ? {
            ...p,
            stage: "pending_ceo" as const,
            executiveApprovedBy: approverId,
            executiveApprovedAt: ctx.todayISO(),
          }
        : p,
    ),
  };
}

export function applyApproveBonusCeo(
  prev: AppData,
  paymentId: string,
  approverId: string,
  ctx: BonusActionContext,
): AppData {
  return {
    ...prev,
    bonusPayments: prev.bonusPayments.map((p) =>
      p.id === paymentId && p.stage === "pending_ceo"
        ? {
            ...p,
            stage: "ceo_confirmed" as const,
            ceoApprovedBy: approverId,
            ceoApprovedAt: ctx.todayISO(),
          }
        : p,
    ),
  };
}

export function applyRejectBonus(
  prev: AppData,
  paymentId: string,
  rejectedBy: string,
  ctx: BonusActionContext,
): AppData {
  return {
    ...prev,
    bonusPayments: prev.bonusPayments.map((p) =>
      p.id === paymentId && p.stage !== "paid" && p.stage !== "rejected"
        ? {
            ...p,
            stage: "rejected" as const,
            rejectedBy,
            rejectedAt: ctx.todayISO(),
          }
        : p,
    ),
  };
}

export function applyPayBonus(
  prev: AppData,
  paymentId: string,
  paidBy: string,
  ctx: BonusActionContext,
): { next: AppData; ok: boolean } {
  const payment = prev.bonusPayments.find((p) => p.id === paymentId);
  if (!payment || payment.stage !== "ceo_confirmed") {
    return { next: prev, ok: false };
  }
  if (!isBonusPayDue(payment.scheduledPayDate)) {
    return { next: prev, ok: false };
  }

  return {
    ok: true,
    next: {
      ...prev,
      bonusPayments: prev.bonusPayments.map((p) =>
        p.id === paymentId
          ? {
              ...p,
              stage: "paid" as const,
              paidBy,
              paidAt: ctx.todayISO(),
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
    },
  };
}

export function applySetExecutiveBonusLimit(
  prev: AppData,
  executiveId: string,
  percent: number,
): { next: AppData; ok: boolean } {
  if (percent < 0 || percent > 15) {
    return { next: prev, ok: false };
  }
  return {
    ok: true,
    next: {
      ...prev,
      bonusPolicy: {
        ...prev.bonusPolicy,
        executiveMaxPercent: {
          ...prev.bonusPolicy.executiveMaxPercent,
          [executiveId]: percent,
        },
      },
    },
  };
}

export function applySetTeamLeaderBonusLimit(
  prev: AppData,
  leaderId: string,
  percent: number,
): { next: AppData; ok: boolean } {
  const err = validateTeamLeaderLimit(
    prev,
    prev.bonusPolicy,
    leaderId,
    percent,
  );
  if (err) {
    return { next: prev, ok: false };
  }
  return {
    ok: true,
    next: {
      ...prev,
      bonusPolicy: {
        ...prev.bonusPolicy,
        teamLeaderMaxPercent: {
          ...prev.bonusPolicy.teamLeaderMaxPercent,
          [leaderId]: percent,
        },
      },
    },
  };
}

export function applySetStaffBonusPercent(
  prev: AppData,
  staffId: string,
  percent: number,
): { next: AppData; ok: boolean } {
  const err = validateStaffPercent(prev, prev.bonusPolicy, staffId, percent);
  if (err) {
    return { next: prev, ok: false };
  }
  return {
    ok: true,
    next: {
      ...prev,
      bonusPolicy: {
        ...prev.bonusPolicy,
        staffPercent: {
          ...prev.bonusPolicy.staffPercent,
          [staffId]: percent,
        },
      },
    },
  };
}

export function applyRequestBonusPayment(
  prev: AppData,
  contractId: string,
  requestedBy: string,
  ctx: BonusActionContext,
): { next: AppData; ok: boolean } {
  const contract = prev.contracts.find((c) => c.id === contractId);
  if (!contract || contract.assignedStaffId !== requestedBy) {
    return { next: prev, ok: false };
  }
  if (!canRequestBonus(contract)) {
    return { next: prev, ok: false };
  }

  const duplicate = prev.bonusPayments.some(
    (p) =>
      p.contractId === contractId && !["paid", "rejected"].includes(p.stage),
  );
  if (duplicate) {
    return { next: prev, ok: false };
  }

  return {
    ok: true,
    next: {
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
          id: ctx.newId("bp"),
        },
      ],
    },
  };
}
