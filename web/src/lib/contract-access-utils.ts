import type { AppData, Contract, User, UserRole } from "./types";

export function getContractAssignee(
  data: AppData,
  contract: Contract,
): User | undefined {
  return data.users.find((u) => u.id === contract.assignedStaffId);
}

/** 담당자가 팀장인 계약 — 담당 실무에게 숨김, 팀장 한도 전액 성과급 */
export function isLeaderManagedContract(
  data: AppData,
  contract: Contract,
): boolean {
  return getContractAssignee(data, contract)?.role === "team_leader";
}

export function canRoleViewContract(
  data: AppData,
  contract: Contract,
  role: UserRole,
  userId: string,
): boolean {
  switch (role) {
    case "ceo":
    case "executive":
    case "finance_manager":
      return true;
    case "staff":
      return contract.assignedStaffId === userId;
    case "team_leader": {
      const user = data.users.find((u) => u.id === userId);
      if (contract.teamId !== user?.teamId) return false;
      if (isLeaderManagedContract(data, contract)) {
        return contract.assignedStaffId === userId;
      }
      return true;
    }
    case "partner": {
      const user = data.users.find((u) => u.id === userId);
      const partnerId = user?.partnerId;
      if (!partnerId) return false;
      return (
        contract.hasReferralPromo && contract.referrerPartnerId === partnerId
      );
    }
    case "client": {
      const contractId = data.users.find((u) => u.id === userId)?.contractId;
      return contractId === contract.id;
    }
    default:
      return true;
  }
}

/** 팀장 본인이 직접 담당하는 계약 (실행·성과급 신청용) */
export function filterLeaderWorkContracts(
  data: AppData,
  leaderUserId: string,
): Contract[] {
  return data.contracts.filter((c) => c.assignedStaffId === leaderUserId);
}

/** 실행 진행 등 개인 업무 입력 대상 계약 */
export function filterExecutionWorkContracts(
  data: AppData,
  role: UserRole,
  userId: string,
): Contract[] {
  if (role === "staff" || role === "team_leader") {
    return data.contracts.filter((c) => c.assignedStaffId === userId);
  }
  if (role === "partner") {
    const user = data.users.find((u) => u.id === userId);
    const partnerId = user?.partnerId;
    if (!partnerId) return [];
    return data.contracts.filter(
      (c) => c.hasReferralPromo && c.referrerPartnerId === partnerId,
    );
  }
  if (role === "client") {
    const contractId = data.users.find((u) => u.id === userId)?.contractId;
    return contractId
      ? data.contracts.filter((c) => c.id === contractId)
      : [];
  }
  return data.contracts;
}
