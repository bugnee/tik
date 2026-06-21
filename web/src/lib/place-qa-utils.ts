import type {
  AppData,
  Contract,
  QaMessage,
  QaThread,
  UserRole,
} from "./types";
import { canRoleViewContract } from "./contract-access-utils";
import { getPartnerCollaborationContractIds } from "./partner-collaboration-utils";
import {
  countPostLinkOpinionsForContract,
  getPostLinkOpinionsForContract,
} from "./post-link-opinion-utils";
import { filterContractsByRole, getClientName, getUserName } from "./selectors";

const INTERNAL_QA_ROLES: UserRole[] = [
  "staff",
  "team_leader",
  "executive",
  "ceo",
  "finance_manager",
];

export function isInternalQaRole(role: UserRole): boolean {
  return INTERNAL_QA_ROLES.includes(role);
}

export function isClientQaRole(role: UserRole): boolean {
  return role === "client";
}

export function isPartnerQaRole(role: UserRole): boolean {
  return role === "partner";
}

export function isExternalQaRole(role: UserRole | undefined): boolean {
  return role === "client" || role === "partner";
}

export interface QaDashboardStats {
  totalThreads: number;
  openThreads: number;
  needsReply: number;
  answeredThreads: number;
  linkOpinions: number;
}

export interface QaContractRow {
  contractId: string;
  clientName: string;
  assignedStaffName: string;
  threadCount: number;
  linkOpinionCount: number;
  needsReply: number;
  hasPlaceSetting: boolean;
  hasPlaceCredentials: boolean;
  lastActivity?: string;
}

export function getPlaceCredentialsForContract(
  data: AppData,
  contractId: string,
) {
  return data.placeCredentials.find((p) => p.contractId === contractId);
}

export function getThreadsForContract(
  data: AppData,
  contractId: string,
): QaThread[] {
  return data.qaThreads
    .filter((t) => t.contractId === contractId)
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

export function getMessagesForThread(
  data: AppData,
  threadId: string,
): QaMessage[] {
  return data.qaMessages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getAuthorRole(
  data: AppData,
  userId: string,
): UserRole | undefined {
  return data.users.find((u) => u.id === userId)?.role;
}

export function threadNeedsStaffReply(
  data: AppData,
  thread: QaThread,
): boolean {
  if (thread.status === "closed") return false;
  const messages = getMessagesForThread(data, thread.id);
  if (messages.length === 0) return true;
  const last = messages[messages.length - 1];
  return isExternalQaAuthor(data, last.authorUserId);
}

function isExternalQaAuthor(data: AppData, userId: string): boolean {
  return isExternalQaRole(getAuthorRole(data, userId));
}

/** 담당업무(역할별 계약 조회 범위) 내 Q&A 접근 가능 여부 */
export function canAccessQaContract(
  data: AppData,
  role: UserRole,
  userId: string,
  contractId: string,
): boolean {
  const contract = data.contracts.find((c) => c.id === contractId);
  if (!contract || contract.status !== "active") return false;

  if (role === "client") {
    const linkedId = data.users.find((u) => u.id === userId)?.contractId;
    return linkedId === contractId;
  }

  if (role === "partner") {
    const partnerId = data.users.find((u) => u.id === userId)?.partnerId;
    if (!partnerId) return false;
    return getPartnerCollaborationContractIds(data, partnerId).includes(
      contractId,
    );
  }

  return canRoleViewContract(data, contract, role, userId);
}

/** 고객사: 본인 계약 문의 등록 · 직원: 담당업무 범위 내 답변 */
export function canReplyQa(
  data: AppData,
  role: UserRole,
  userId: string,
  contractId: string,
): boolean {
  if (!canAccessQaContract(data, role, userId, contractId)) return false;
  return isClientQaRole(role) || isPartnerQaRole(role) || isInternalQaRole(role);
}

/** 고객사·파트너 — 새 문의 스레드 등록 */
export function canCreateQaThread(
  data: AppData,
  role: UserRole,
  userId: string,
  contractId: string,
): boolean {
  if (!canAccessQaContract(data, role, userId, contractId)) return false;
  return isClientQaRole(role) || isPartnerQaRole(role);
}

/** @deprecated canCreateQaThread 사용 */
export function canCreateClientQaThread(
  data: AppData,
  role: UserRole,
  userId: string,
  contractId: string,
): boolean {
  return canCreateQaThread(data, role, userId, contractId);
}

export function getQaScopeHint(role: UserRole): string {
  switch (role) {
    case "staff":
      return "본인 담당 업체 문의에 답변할 수 있습니다.";
    case "team_leader":
      return "팀 담당 업체(본인 직접 담당 포함) 문의에 답변할 수 있습니다.";
    case "executive":
      return "소속 팀 계약 문의에 답변할 수 있습니다.";
    case "ceo":
    case "finance_manager":
      return "전체 고객사 문의에 답변할 수 있습니다.";
    case "client":
      return "담당 매니저에게 문의를 남길 수 있습니다.";
    case "partner":
      return "협업 업체와 담당자에게 문의를 남길 수 있습니다. (조회 전용 · 소통)";
    default:
      return "";
  }
}

export function getVisibleContractIds(
  data: AppData,
  role: UserRole,
  userId: string,
): string[] {
  if (role === "partner") {
    const partnerId = data.users.find((u) => u.id === userId)?.partnerId;
    if (!partnerId) return [];
    return getPartnerCollaborationContractIds(data, partnerId);
  }
  return filterContractsByRole(data, role, userId)
    .filter((c) => c.status === "active")
    .map((c) => c.id);
}

export function getQaDashboardStats(
  data: AppData,
  contractIds: string[],
): QaDashboardStats {
  const threads = data.qaThreads.filter((t) =>
    contractIds.includes(t.contractId),
  );
  const needsReply = threads.filter((t) => threadNeedsStaffReply(data, t));
  const linkOpinions = (data.postLinkOpinions ?? []).filter((o) =>
    contractIds.includes(o.contractId),
  );
  return {
    totalThreads: threads.length,
    openThreads: threads.filter((t) => t.status !== "closed").length,
    needsReply: needsReply.length,
    answeredThreads: threads.filter((t) => t.status === "answered").length,
    linkOpinions: linkOpinions.length,
  };
}

export function getQaContractRows(
  data: AppData,
  contractIds: string[],
): QaContractRow[] {
  const contracts = data.contracts.filter((c) => contractIds.includes(c.id));

  return contracts
    .map((contract) => {
      const threads = getThreadsForContract(data, contract.id);
      const needsReply = threads.filter((t) =>
        threadNeedsStaffReply(data, t),
      ).length;
      const linkOpinionCount = countPostLinkOpinionsForContract(
        data,
        contract.id,
      );
      const lastThread = threads[0]?.lastMessageAt;
      const lastOpinion = getPostLinkOpinionsForContract(data, contract.id)[0]
        ?.createdAt;
      const lastActivity = [lastThread, lastOpinion]
        .filter(Boolean)
        .sort()
        .reverse()[0];
      const hasPlaceCredentials = Boolean(
        getPlaceCredentialsForContract(data, contract.id),
      );

      return {
        contractId: contract.id,
        clientName: contract.clientName,
        assignedStaffName: getUserName(data, contract.assignedStaffId),
        threadCount: threads.length,
        linkOpinionCount,
        needsReply,
        hasPlaceSetting: contract.hasPlaceSetting,
        hasPlaceCredentials,
        lastActivity,
      };
    })
    .filter(
      (row) =>
        row.threadCount > 0 ||
        row.linkOpinionCount > 0 ||
        row.needsReply > 0 ||
        row.hasPlaceSetting,
    )

    .sort((a, b) => {
      if (b.needsReply !== a.needsReply) return b.needsReply - a.needsReply;
      return (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "");
    });
}

export function canManagePlaceCredentials(role: UserRole): boolean {
  return role === "client";
}

export function canViewPlacePassword(role: UserRole): boolean {
  return isInternalQaRole(role);
}

export function canParticipateQa(role: UserRole): boolean {
  return (
    isClientQaRole(role) || isPartnerQaRole(role) || isInternalQaRole(role)
  );
}

export function canCloseQaThread(role: UserRole): boolean {
  return isInternalQaRole(role);
}

export function getContractForQa(
  data: AppData,
  contractId: string,
): Contract | undefined {
  return data.contracts.find((c) => c.id === contractId);
}

export function formatQaParticipant(
  data: AppData,
  userId: string,
  contract?: Contract,
): string {
  const user = data.users.find((u) => u.id === userId);
  if (!user) return "-";
  if (user.role === "client") return contract?.clientName ?? "고객사";
  if (user.role === "partner") {
    const partner = user.partnerId
      ? data.partners.find((p) => p.id === user.partnerId)
      : undefined;
    return partner?.companyName ?? "파트너";
  }
  return getUserName(data, userId);
}
