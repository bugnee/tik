import type { UserRole } from "./types";

/** 담당자 변경 사유 */
export type ContractStaffReassignReason =
  | "resignation"
  | "work_issue"
  | "workload"
  | "other";

export const CONTRACT_STAFF_REASSIGN_REASONS: {
  value: ContractStaffReassignReason;
  label: string;
}[] = [
  { value: "resignation", label: "담당자 퇴사 · 퇴직" },
  { value: "work_issue", label: "업무 문제 · 성과 이슈" },
  { value: "workload", label: "업무 분산 · 인수인계" },
  { value: "other", label: "기타" },
];

/** 대표·임원만 계약 담당자를 직접 변경할 수 있음 */
export function canReassignContractStaff(role: UserRole): boolean {
  return role === "ceo" || role === "executive";
}

export function getReassignReasonLabel(
  reason: ContractStaffReassignReason,
): string {
  return (
    CONTRACT_STAFF_REASSIGN_REASONS.find((r) => r.value === reason)?.label ??
    reason
  );
}

/** 계약 메모·이력용 변경 기록 문구 */
export function buildStaffReassignMemo(params: {
  fromName: string;
  toName: string;
  reason: ContractStaffReassignReason;
  note?: string;
}): string {
  const reasonLabel = getReassignReasonLabel(params.reason);
  const notePart = params.note?.trim()
    ? ` · 메모: ${params.note.trim()}`
    : "";
  return `[담당자 변경] ${params.fromName} → ${params.toName} · 사유: ${reasonLabel}${notePart}`;
}
