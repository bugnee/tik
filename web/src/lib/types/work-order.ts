import type { ExecutionType } from "@/lib/types/execution";
import type { ExpenseCategory } from "@/lib/types/finance";
import type { PartnerCategory } from "@/lib/types/partner";
import type { PostLinkEntry } from "@/lib/types/execution";

export type WorkOrderTaskType = string;

export type TaskChannelKind =
  | "contract_target"
  | "referral_promo"
  | "execution_only";

/** 집행 항목 배지·진행바 구분 색 */
export type TaskChannelAccent =
  | "cyan"
  | "emerald"
  | "violet"
  | "fuchsia"
  | "amber"
  | "orange"
  | "rose"
  | "sky"
  | "lime";

/** 설정 · 집행 항목 (최적블로그, 인플루언서 등) */
export interface TaskChannelDefinition {
  id: WorkOrderTaskType;
  label: string;
  sortOrder: number;
  isActive: boolean;
  isSystem?: boolean;
  kind: TaskChannelKind;
  accentColor?: TaskChannelAccent;
  contractTargetField?:
    | "targetOptimized"
    | "targetInfluencer"
    | "targetExperience"
    | "targetInstaCard"
    | "targetYoutube"
    | "targetInstagram"
    | "targetClip"
    | "targetTiktok";
  contractDoneField?:
    | "optimizedDone"
    | "influencerDone"
    | "youtubeDone"
    | "instagramDone"
    | "clipDone"
    | "tiktokDone";
  executionType?: ExecutionType;
  partnerCategory?: PartnerCategory;
  expenseCategory?: ExpenseCategory;
  syncExecution?: boolean;
}

export type TaskChannelInput = Omit<TaskChannelDefinition, "isSystem">;

export type WorkOrderCostType =
  | "manuscript"
  | "filming"
  | "travel"
  | "other";

export interface WorkOrderCostLine {
  type: WorkOrderCostType;
  amount: number;
}

export type WorkOrderStage =
  | "draft"
  | "pending_approval"
  | "pending_staff_confirm"
  | "approved"
  | "delivered"
  | "paid"
  | "order_ready"
  | "rejected"
  | "cancelled"
  | "on_hold"
  | "postponed";

export interface WorkOrder {
  id: string;
  contractId: string;
  taskType: WorkOrderTaskType;
  sequence: number;
  title: string;
  dueDate: string;
  partnerId?: string;
  costLines: WorkOrderCostLine[];
  stage: WorkOrderStage;
  /** 보류·연기 전 단계 — 재개 시 복원 */
  previousStage?: WorkOrderStage;
  /** 연기 시 변경된 마감일 */
  postponedDueDate?: string;
  memo?: string;
  postLinks: PostLinkEntry[];
  requestedBy?: string;
  requestedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  /** 파트너 승인 시 전달 메모 — 담당 확인용 */
  partnerApprovalNote?: string;
  rejectedReason?: string;
  deliveredAt?: string;
  paidAt?: string;
  paidBy?: string;
  expenseId?: string;
  executionId?: string;
  createdAt: string;
}
