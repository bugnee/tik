import type { AppData, UserRole } from "./types";
import {
  enrichWorkOrder,
  filterWorkOrdersByPartner,
  type EnrichedWorkOrder,
} from "./work-order-utils";
import { filterContractsByRole } from "./selectors";

/** 파트너 승인 대기 업무 */
export function getPartnerPendingApprovalOrders(
  data: AppData,
  partnerId: string,
): EnrichedWorkOrder[] {
  return filterWorkOrdersByPartner(data.workOrders, partnerId)
    .filter((order) => order.stage === "pending_approval")
    .map((order) => enrichWorkOrder(data, order));
}

/** 파트너 진행 중(승인됨 · 결과 제출 대기) */
export function getPartnerApprovedWorkOrders(
  data: AppData,
  partnerId: string,
): EnrichedWorkOrder[] {
  return filterWorkOrdersByPartner(data.workOrders, partnerId)
    .filter((order) => order.stage === "approved")
    .map((order) => enrichWorkOrder(data, order));
}

/** 담당 확인 대기 — 파트너 승인 후 실무 반영 전 */
export function getStaffPendingConfirmOrders(
  data: AppData,
  userId: string,
  role: UserRole,
): EnrichedWorkOrder[] {
  const visibleContracts = filterContractsByRole(data, role, userId);
  const contractIds = new Set(visibleContracts.map((c) => c.id));

  return data.workOrders
    .filter(
      (order) =>
        order.stage === "pending_staff_confirm" &&
        contractIds.has(order.contractId),
    )
    .map((order) => enrichWorkOrder(data, order))
    .sort((a, b) => (b.approvedAt ?? "").localeCompare(a.approvedAt ?? ""));
}

export function countStaffPendingConfirmOrders(
  data: AppData,
  userId: string,
  role: UserRole,
): number {
  return getStaffPendingConfirmOrders(data, userId, role).length;
}
