import { canRunContractWork } from "@/lib/client-deposit-utils";
import {
  getPartnerPendingApprovalOrders,
  getStaffPendingConfirmOrders,
} from "@/lib/partner-work-queue-utils";
import { filterContractsByRole } from "@/lib/selectors";
import type { AppData, UserRole } from "@/lib/types";

/** 역할별 승인 대기 실행(워크오더) 단계 설명 */
export const ROLE_EXECUTION_APPROVAL_LABELS: Record<UserRole, string> = {
  ceo: "파트너 승인 확인",
  executive: "파트너 승인 확인",
  team_leader: "파트너 승인 확인",
  staff: "파트너 승인 확인",
  finance_manager: "입금 확인 대기",
  partner: "실행 승인 대기",
  client: "결과 검토 대기",
};

function contractIdSet(contracts: { id: string }[]): Set<string> {
  return new Set(contracts.map((c) => c.id));
}

function countPendingStaffConfirmInContracts(
  data: AppData,
  contractIds: Set<string>,
): number {
  return data.workOrders.filter(
    (order) =>
      order.stage === "pending_staff_confirm" &&
      contractIds.has(order.contractId),
  ).length;
}

function countDeliveredPaymentPending(
  data: AppData,
  contractIds: Set<string>,
): number {
  return data.workOrders.filter(
    (order) =>
      order.stage === "delivered" &&
      contractIds.has(order.contractId) &&
      canRunContractWork(data, order.contractId),
  ).length;
}

function getExecutiveContractIds(data: AppData, userId: string): Set<string> {
  const teamIds = new Set(
    data.teams
      .filter((team) => team.executiveId === userId)
      .map((team) => team.id),
  );
  return contractIdSet(
    data.contracts.filter((contract) => teamIds.has(contract.teamId)),
  );
}

/** 역할·사용자 기준 승인 대기 실행(워크오더) 건수 */
export function getRoleExecutionApprovalCount(
  data: AppData,
  userId: string,
  role: UserRole,
): number {
  switch (role) {
    case "partner": {
      const partnerId = data.users.find((user) => user.id === userId)?.partnerId;
      if (!partnerId) return 0;
      return getPartnerPendingApprovalOrders(data, partnerId).length;
    }
    case "staff":
    case "team_leader":
      return getStaffPendingConfirmOrders(data, userId, role).length;
    case "executive": {
      const contractIds = getExecutiveContractIds(data, userId);
      if (contractIds.size === 0) return 0;
      return countPendingStaffConfirmInContracts(data, contractIds);
    }
    case "ceo": {
      const contractIds = contractIdSet(data.contracts);
      return countPendingStaffConfirmInContracts(data, contractIds);
    }
    case "finance_manager": {
      const contractIds = contractIdSet(data.contracts);
      return countDeliveredPaymentPending(data, contractIds);
    }
    case "client": {
      const contracts = filterContractsByRole(data, role, userId);
      return countDeliveredPaymentPending(data, contractIdSet(contracts));
    }
    default:
      return 0;
  }
}

/** 데모·역할 전환 UI — 역할별 대표 사용자 */
export function getRepresentativeUserIdForRole(
  data: AppData,
  role: UserRole,
): string | null {
  return data.users.find((user) => user.role === role)?.id ?? null;
}

/** 역할 전환 목록용 — 역할별 승인 대기 실행 건수 */
export function getRoleExecutionApprovalCountForRole(
  data: AppData,
  role: UserRole,
): number {
  const userId = getRepresentativeUserIdForRole(data, role);
  if (!userId) return 0;
  return getRoleExecutionApprovalCount(data, userId, role);
}
