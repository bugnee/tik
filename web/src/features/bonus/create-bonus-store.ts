import type { StoreDeps } from "@/core/data/persist-types";
import {
  applyApproveBonusCeo,
  applyApproveBonusExecutive,
  applyApproveBonusTeamLeader,
  applyPayBonus,
  applyRejectBonus,
  applyRequestBonusPayment,
  applySetExecutiveBonusLimit,
  applySetStaffBonusPercent,
  applySetTeamLeaderBonusLimit,
} from "@/features/bonus/bonus-actions";

export type BonusStore = {
  approveBonusTeamLeader: (paymentId: string, approverId: string) => void;
  approveBonusExecutive: (paymentId: string, approverId: string) => void;
  approveBonusCeo: (paymentId: string, approverId: string) => void;
  rejectBonus: (paymentId: string, rejectedBy: string) => void;
  payBonus: (paymentId: string, paidBy: string) => boolean;
  setExecutiveBonusLimit: (executiveId: string, percent: number) => boolean;
  setTeamLeaderBonusLimit: (leaderId: string, percent: number) => boolean;
  setStaffBonusPercent: (staffId: string, percent: number) => boolean;
  requestBonusPayment: (contractId: string, requestedBy: string) => boolean;
};

export function createBonusStore(deps: StoreDeps): BonusStore {
  const ctx = { newId: deps.newId, todayISO: deps.todayISO };

  return {
    approveBonusTeamLeader(paymentId, approverId) {
      deps.persist((prev) =>
        applyApproveBonusTeamLeader(prev, paymentId, approverId, ctx),
      );
    },

    approveBonusExecutive(paymentId, approverId) {
      deps.persist((prev) =>
        applyApproveBonusExecutive(prev, paymentId, approverId, ctx),
      );
    },

    approveBonusCeo(paymentId, approverId) {
      deps.persist((prev) =>
        applyApproveBonusCeo(prev, paymentId, approverId, ctx),
      );
    },

    rejectBonus(paymentId, rejectedBy) {
      deps.persist((prev) =>
        applyRejectBonus(prev, paymentId, rejectedBy, ctx),
      );
    },

    payBonus(paymentId, paidBy) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyPayBonus(prev, paymentId, paidBy, ctx);
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    setExecutiveBonusLimit(executiveId, percent) {
      let ok = false;
      deps.persist((prev) => {
        const result = applySetExecutiveBonusLimit(prev, executiveId, percent);
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    setTeamLeaderBonusLimit(leaderId, percent) {
      let ok = false;
      deps.persist((prev) => {
        const result = applySetTeamLeaderBonusLimit(prev, leaderId, percent);
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    setStaffBonusPercent(staffId, percent) {
      let ok = false;
      deps.persist((prev) => {
        const result = applySetStaffBonusPercent(prev, staffId, percent);
        ok = result.ok;
        return result.next;
      });
      return ok;
    },

    requestBonusPayment(contractId, requestedBy) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyRequestBonusPayment(
          prev,
          contractId,
          requestedBy,
          ctx,
        );
        ok = result.ok;
        return result.next;
      });
      return ok;
    },
  };
}
