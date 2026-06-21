import type { StoreDeps } from "@/core/data/persist-types";
import {
  applyApproveWorkOrder,
  applyCancelWorkOrder,
  applyConfirmWorkOrderByStaff,
  applyConfirmWorkOrderPayment,
  applyDeliverWorkOrder,
  applyEnsureContractWorkOrders,
  applyHoldWorkOrder,
  applyPostponeWorkOrder,
  applyRejectWorkOrder,
  applyRejectWorkOrderByStaff,
  applyResumeWorkOrder,
  applySubmitWorkOrder,
  applySyncReferralCommissionWorkOrders,
  applyUpdateWorkOrder,
} from "@/features/work-orders/work-order-actions";
import type { WorkOrder, WorkOrderInput } from "@/lib/types";

export type WorkOrderStore = {
  updateWorkOrder: (id: string, input: Partial<WorkOrderInput>) => void;
  submitWorkOrder: (id: string, requestedBy: string) => boolean;
  approveWorkOrder: (
    id: string,
    partnerUserId: string,
    approvalNote?: string,
  ) => boolean;
  rejectWorkOrder: (id: string, reason: string) => void;
  confirmWorkOrderByStaff: (id: string, staffUserId: string) => boolean;
  rejectWorkOrderByStaff: (
    id: string,
    staffUserId: string,
    reason: string,
  ) => boolean;
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
  syncReferralCommissionSchedules: (contractId?: string) => void;
};

export function createWorkOrderStore(deps: StoreDeps): WorkOrderStore {
  const ctx = { newId: deps.newId, todayISO: deps.todayISO };

  return {
    updateWorkOrder(id, input) {
      deps.persist((prev) => applyUpdateWorkOrder(prev, id, input));
    },

    submitWorkOrder(id, requestedBy) {
      let ok = false;
      deps.persist((prev) => {
        const result = applySubmitWorkOrder(prev, id, requestedBy, ctx);
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    approveWorkOrder(id, partnerUserId, approvalNote) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyApproveWorkOrder(
          prev,
          id,
          partnerUserId,
          approvalNote,
          ctx,
        );
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    rejectWorkOrder(id, reason) {
      deps.persist((prev) => applyRejectWorkOrder(prev, id, reason));
    },

    confirmWorkOrderByStaff(id, _staffUserId) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyConfirmWorkOrderByStaff(prev, id);
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    rejectWorkOrderByStaff(id, _staffUserId, reason) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyRejectWorkOrderByStaff(prev, id, reason);
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    deliverWorkOrder(id, postLinks, memo) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyDeliverWorkOrder(prev, id, postLinks, memo, ctx);
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    confirmWorkOrderPayment(id, paidBy) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyConfirmWorkOrderPayment(prev, id, paidBy, ctx);
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    ensureContractWorkOrders(contractId) {
      deps.persist((prev) =>
        applyEnsureContractWorkOrders(prev, contractId, ctx),
      );
    },

    cancelWorkOrder(id, reason) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyCancelWorkOrder(prev, id, reason);
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    holdWorkOrder(id, reason) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyHoldWorkOrder(prev, id, reason);
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    postponeWorkOrder(id, newDueDate, reason) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyPostponeWorkOrder(prev, id, newDueDate, reason);
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    resumeWorkOrder(id) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyResumeWorkOrder(prev, id);
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    syncReferralCommissionSchedules(contractId) {
      deps.persist((prev) =>
        applySyncReferralCommissionWorkOrders(prev, ctx.todayISO(), contractId),
      );
    },
  };
}
