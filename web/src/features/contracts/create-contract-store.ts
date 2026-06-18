import type { StoreDeps } from "@/core/data/persist-types";
import {
  applyAddContract,
  applyAddContractMemo,
  applyAddExecution,
  applyApproveExtension,
  applyDeleteContract,
  applyDeleteContractMemo,
  applyDeleteExecution,
  applyRejectExtension,
  applyRequestExtension,
  applyTerminateContract,
  applyUpdateContract,
  applyUpdateContractClientLinks,
  applyUpdateContractLocation,
  applyUpdateExecution,
} from "@/features/contracts/contract-actions";
import type { ClientLinksInput } from "@/lib/client-links-utils";
import type { ContractTermsChangeMode } from "@/lib/contract-terms-utils";
import type { LocationProfileInput } from "@/lib/location-profile-utils";
import type {
  Contract,
  ContractInput,
  ContractMemo,
  Execution,
  ExecutionInput,
  TerminationReason,
} from "@/lib/types";

export type ContractStore = {
  addContract: (input: ContractInput) => Contract;
  updateContract: (
    id: string,
    input: Partial<ContractInput>,
    options?: { mode?: ContractTermsChangeMode },
  ) => void;
  deleteContract: (id: string) => void;
  terminateContract: (contractId: string, reason: TerminationReason) => void;
  requestExtension: (contractId: string, requestedBy: string) => boolean;
  approveExtension: (approvalId: string) => void;
  rejectExtension: (approvalId: string) => void;
  addExecution: (input: ExecutionInput) => Execution;
  updateExecution: (id: string, input: Partial<ExecutionInput>) => void;
  deleteExecution: (id: string) => void;
  addContractMemo: (
    contractId: string,
    body: string,
    authorUserId: string,
  ) => ContractMemo | null;
  deleteContractMemo: (id: string) => void;
  updateContractLocation: (
    contractId: string,
    input: LocationProfileInput,
  ) => void;
  updateContractClientLinks: (
    contractId: string,
    input: ClientLinksInput,
  ) => void;
};

export function createContractStore(deps: StoreDeps): ContractStore {
  const ctx = { newId: deps.newId, todayISO: deps.todayISO };

  return {
    addContract(input) {
      let contract!: Contract;
      deps.persist((prev) => {
        const result = applyAddContract(prev, input, ctx);
        contract = result.contract;
        return result.next;
      });
      return contract;
    },

    updateContract(id, input, options) {
      const mode = options?.mode ?? "amend";
      deps.persist((prev) => applyUpdateContract(prev, id, input, mode, ctx));
    },

    deleteContract(id) {
      deps.persist((prev) => applyDeleteContract(prev, id));
    },

    terminateContract(contractId, reason) {
      deps.persist((prev) =>
        applyTerminateContract(prev, contractId, reason, deps.todayISO()),
      );
    },

    requestExtension(contractId, requestedBy) {
      let ok = false;
      deps.persist((prev) => {
        const result = applyRequestExtension(
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

    approveExtension(approvalId) {
      deps.persist((prev) => applyApproveExtension(prev, approvalId));
    },

    rejectExtension(approvalId) {
      deps.persist((prev) => applyRejectExtension(prev, approvalId));
    },

    addExecution(input) {
      let execution!: Execution;
      deps.persist((prev) => {
        const result = applyAddExecution(prev, input, ctx);
        execution = result.execution;
        return result.next;
      });
      return execution;
    },

    updateExecution(id, input) {
      deps.persist((prev) => applyUpdateExecution(prev, id, input));
    },

    deleteExecution(id) {
      deps.persist((prev) => applyDeleteExecution(prev, id));
    },

    addContractMemo(contractId, body, authorUserId) {
      let memo: ContractMemo | null = null;
      deps.persist((prev) => {
        const result = applyAddContractMemo(
          prev,
          contractId,
          body,
          authorUserId,
          ctx,
        );
        memo = result.memo;
        return result.next;
      });
      return memo;
    },

    deleteContractMemo(id) {
      deps.persist((prev) => applyDeleteContractMemo(prev, id));
    },

    updateContractLocation(contractId, input) {
      deps.persist((prev) =>
        applyUpdateContractLocation(prev, contractId, input),
      );
    },

    updateContractClientLinks(contractId, input) {
      deps.persist((prev) =>
        applyUpdateContractClientLinks(prev, contractId, input),
      );
    },
  };
}
