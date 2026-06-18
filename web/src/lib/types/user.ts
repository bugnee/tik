export type UserRole =
  | "staff"
  | "team_leader"
  | "executive"
  | "ceo"
  | "finance_manager"
  | "partner"
  | "client";

export interface Team {
  id: string;
  name: string;
  leaderId?: string;
  executiveId?: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  isFinancialViewer: boolean;
  teamId?: string;
  /** partner 역할일 때 연결 파트너사 */
  partnerId?: string;
  /** client 역할일 때 연결 계약(고객사) */
  contractId?: string;
  /** Google 로그인 계정 연결 */
  googleId?: string;
  email?: string;
}

export type AccountStatus = "pending" | "approved" | "rejected";

/** Google 로그인 후 권한 승인 대상 */
export interface AccountProfile {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  status: AccountStatus;
  role?: UserRole;
  linkedUserId?: string;
  teamId?: string;
  partnerId?: string;
  contractId?: string;
  isFinancialViewer?: boolean;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
}
