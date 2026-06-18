import type { User, Team, AccountProfile } from "@/lib/types/user";
import type { Contract, ContractRecord, ContractMemo, ExtensionApproval } from "@/lib/types/contract";
import type { Execution } from "@/lib/types/execution";
import type { Expense, FundBudget, ExpenseCategoryDefinition } from "@/lib/types/finance";
import type { Partner, PartnerFilterDefinition, PartnerReferralLead } from "@/lib/types/partner";
import type { WorkOrder, TaskChannelDefinition } from "@/lib/types/work-order";
import type {
  ExperienceCampaign,
  ExperienceFieldDefinition,
  ExperiencePartnerSlot,
  ExperienceParticipationProposal,
} from "@/lib/types/experience";
import type {
  PlaceCredentials,
  QaThread,
  QaMessage,
  PostLinkOpinion,
} from "@/lib/types/qa";
import type { BonusPayment, BonusPolicySettings } from "@/lib/types/bonus";
import type { WorkEvaluation } from "@/lib/types/evaluation";

/** 고객사 포털 — 해야 할 일 확인(숨김) 기록 */
export interface ClientPortalActionDismissal {
  userId: string;
  contractId: string;
  actionId: string;
  dismissedAt: string;
}

export interface AppData {
  users: User[];
  teams: Team[];
  contracts: Contract[];
  executions: Execution[];
  expenses: Expense[];
  extensionApprovals: ExtensionApproval[];
  bonusPayments: BonusPayment[];
  bonusPolicy: BonusPolicySettings;
  fundBudget: FundBudget;
  contractRecords: ContractRecord[];
  contractMemos: ContractMemo[];
  partners: Partner[];
  workOrders: WorkOrder[];
  accountProfiles: AccountProfile[];
  taskChannels: TaskChannelDefinition[];
  expenseCategories: ExpenseCategoryDefinition[];
  partnerFilterDefinitions: PartnerFilterDefinition[];
  experienceFieldDefinitions: ExperienceFieldDefinition[];
  placeCredentials: PlaceCredentials[];
  qaThreads: QaThread[];
  qaMessages: QaMessage[];
  postLinkOpinions: PostLinkOpinion[];
  partnerReferralLeads: PartnerReferralLead[];
  experienceCampaigns: ExperienceCampaign[];
  experiencePartnerSlots: ExperiencePartnerSlot[];
  experienceParticipationProposals: ExperienceParticipationProposal[];
  workEvaluations: WorkEvaluation[];
  clientPortalActionDismissals: ClientPortalActionDismissal[];
}

export interface TeamMemberStats {
  id: string;
  name: string;
  completionRate: number;
  clientCount: number;
  extensionRate: number;
}

export interface TeamRanking {
  teamId: string;
  teamName: string;
  revenue: number;
  clientCount: number;
  completionRate: number;
}

export interface OrgNode {
  id: string;
  name: string;
  role: import("@/lib/types/user").UserRole;
  revenue: number;
  children?: OrgNode[];
}
