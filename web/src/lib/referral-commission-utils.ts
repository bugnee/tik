import { addDays, todayISO } from "@/lib/bonus-utils";
import { isClientDepositConfirmed } from "@/lib/client-deposit-utils";
import { calcReferralCommission } from "@/lib/partner-referral-utils";
import {
  buildReferralCostLines,
  isReferralCommissionWorkOrder,
} from "@/lib/work-order-utils";
import type { Contract, WorkOrder, WorkOrderStage } from "@/lib/types";

/** 소개 고객사 입금 확인 후 리셀러 지급까지 대기 일수 */
export const REFERRAL_PAYOUT_DELAY_DAYS = 10;

export const REFERRAL_PAYOUT_POLICY_LABEL =
  "고객사 입금 확인 후 10일 뒤 리셀러 지급";

export function calcReferralPayoutDueDate(clientDepositDate: string): string {
  return addDays(clientDepositDate, REFERRAL_PAYOUT_DELAY_DAYS);
}

export interface ReferralPayoutContext {
  clientDepositConfirmed: boolean;
  clientDepositDate?: string;
  payoutDueDate?: string;
  daysUntilPayout?: number;
  isPayoutDue: boolean;
  commissionAmount: number;
}

export function getReferralPayoutContext(
  contract: Contract | undefined,
  order: Pick<WorkOrder, "costLines" | "taskType">,
  referenceDate = todayISO(),
): ReferralPayoutContext {
  const commissionAmount =
    order.costLines.reduce((s, l) => s + l.amount, 0) ||
    (contract ? calcReferralCommission(contract.monthlyFee) : 0);

  if (!contract || !isClientDepositConfirmed(contract)) {
    return {
      clientDepositConfirmed: false,
      isPayoutDue: false,
      commissionAmount,
    };
  }

  const clientDepositDate = contract.lastClientDepositDate;
  if (!clientDepositDate) {
    return {
      clientDepositConfirmed: true,
      isPayoutDue: false,
      commissionAmount,
    };
  }

  const payoutDueDate = calcReferralPayoutDueDate(clientDepositDate);
  const msPerDay = 86400000;
  const daysUntilPayout = Math.ceil(
    (new Date(`${payoutDueDate}T12:00:00`).getTime() -
      new Date(`${referenceDate}T12:00:00`).getTime()) /
      msPerDay,
  );

  return {
    clientDepositConfirmed: true,
    clientDepositDate,
    payoutDueDate,
    daysUntilPayout,
    isPayoutDue: referenceDate >= payoutDueDate,
    commissionAmount,
  };
}

export function canConfirmReferralCommissionPayout(
  contract: Contract | undefined,
  order: WorkOrder,
  referenceDate = todayISO(),
): boolean {
  if (!isReferralCommissionWorkOrder(order)) return true;
  if (order.stage !== "delivered") return false;
  const ctx = getReferralPayoutContext(contract, order, referenceDate);
  return ctx.clientDepositConfirmed && ctx.isPayoutDue;
}

/** 리셀러 수수료 건 — 단계 라벨 (입금·10일 규칙 반영) */
export function getReferralCommissionStageLabel(
  order: WorkOrder,
  contract: Contract | undefined,
  referenceDate = todayISO(),
): string {
  if (order.stage === "order_ready" || order.stage === "paid") {
    return "지급 완료";
  }
  if (order.stage === "cancelled") return "취소";
  if (order.stage === "on_hold") return "보류";
  if (order.stage === "postponed") return "연기";

  const ctx = getReferralPayoutContext(contract, order, referenceDate);
  if (!ctx.clientDepositConfirmed) return "고객사 입금 대기";
  if (!ctx.isPayoutDue) {
    const d = ctx.daysUntilPayout ?? 0;
    return d > 0 ? `지급 예정 · D-${d}` : "지급 예정";
  }
  if (order.stage === "delivered") return "지급 가능";
  return "지급 일정 확인";
}

const REFERRAL_TERMINAL_STAGES: WorkOrderStage[] = [
  "order_ready",
  "paid",
  "cancelled",
];

/** 고객 입금·10일 규칙에 맞게 리셀러 수수료 건 상태 동기화 */
export function syncReferralCommissionWorkOrder(
  order: WorkOrder,
  contract: Contract,
  referenceDate: string,
): WorkOrder {
  if (!isReferralCommissionWorkOrder(order)) return order;
  if (REFERRAL_TERMINAL_STAGES.includes(order.stage)) return order;
  if (!contract.hasReferralPromo) return order;

  const partnerId = contract.referrerPartnerId ?? order.partnerId;
  const costLines = buildReferralCostLines(contract.monthlyFee);
  const ctx = getReferralPayoutContext(contract, order, referenceDate);

  if (!ctx.clientDepositConfirmed || !ctx.clientDepositDate) {
    const next = {
      ...order,
      partnerId,
      costLines,
      stage: (["draft", "rejected"].includes(order.stage)
        ? order.stage
        : "draft") as WorkOrderStage,
      memo: "고객사 입금 대기 · 입금 확인 후 10일 뒤 리셀러 지급",
    };
    return referralWorkOrderUnchanged(order, next) ? order : next;
  }

  const payoutDueDate = ctx.payoutDueDate!;
  const memo = `고객 입금 ${ctx.clientDepositDate} · 지급 예정 ${payoutDueDate} (${REFERRAL_PAYOUT_POLICY_LABEL})`;

  if (ctx.isPayoutDue) {
    const next = {
      ...order,
      partnerId,
      costLines,
      dueDate: payoutDueDate,
      memo,
      stage: "delivered" as const,
      deliveredAt: order.deliveredAt ?? referenceDate,
      approvedAt: order.approvedAt ?? ctx.clientDepositDate,
    };
    return referralWorkOrderUnchanged(order, next) ? order : next;
  }

  const next = {
    ...order,
    partnerId,
    costLines,
    dueDate: payoutDueDate,
    memo,
    stage: "approved" as const,
    approvedAt: order.approvedAt ?? ctx.clientDepositDate,
  };
  return referralWorkOrderUnchanged(order, next) ? order : next;
}

function referralWorkOrderUnchanged(prev: WorkOrder, next: WorkOrder): boolean {
  return (
    prev.stage === next.stage &&
    prev.dueDate === next.dueDate &&
    prev.memo === next.memo &&
    prev.partnerId === next.partnerId &&
    prev.deliveredAt === next.deliveredAt &&
    prev.approvedAt === next.approvedAt &&
    JSON.stringify(prev.costLines) === JSON.stringify(next.costLines)
  );
}

export function syncReferralCommissionWorkOrdersInData(
  data: { contracts: Contract[]; workOrders: WorkOrder[] },
  referenceDate: string,
  contractId?: string,
): WorkOrder[] {
  return data.workOrders.map((order) => {
    if (contractId && order.contractId !== contractId) return order;
    if (!isReferralCommissionWorkOrder(order)) return order;
    const contract = data.contracts.find((c) => c.id === order.contractId);
    if (!contract) return order;
    return syncReferralCommissionWorkOrder(order, contract, referenceDate);
  });
}
