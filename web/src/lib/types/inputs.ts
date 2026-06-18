import type { Contract } from "@/lib/types/contract";
import type { Execution } from "@/lib/types/execution";
import type { Expense } from "@/lib/types/finance";
import type { User, Team } from "@/lib/types/user";
import type { Partner } from "@/lib/types/partner";
import type { WorkOrder } from "@/lib/types/work-order";

export type ContractInput = Omit<Contract, "id">;
export type ExecutionInput = Omit<Execution, "id">;
export type ExpenseInput = Omit<Expense, "id">;
export type UserInput = Omit<User, "id">;
export type TeamInput = Omit<Team, "id">;
export type PartnerInput = Omit<Partner, "id">;
export type WorkOrderInput = Omit<WorkOrder, "id">;

/** @deprecated client-links-utils에서 정의 — @/lib/types 호환 re-export */
export type { ClientLinksInput } from "@/lib/client-links-utils";
