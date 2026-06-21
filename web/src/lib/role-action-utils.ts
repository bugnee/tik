import {
  countDepositByStatus,
  getDepositConfirmContracts,
} from "@/lib/client-deposit-utils";
import {
  getClientPortalBadgeCounts,
  getClientPortalViewFromHref,
  CLIENT_PORTAL_VIEWS,
  type ClientPortalBadgeCounts,
} from "@/lib/client-portal-utils";
import { getPendingBonusForRole } from "@/lib/bonus-utils";
import {
  canApproveExpensePayout,
  getFinancePayoutQueue,
  getPendingExpensePayoutApprovals,
} from "@/lib/expense-payout-utils";
import { getPartnerCollaborationContractIds } from "@/lib/partner-collaboration-utils";
import {
  getPartnerApprovedWorkOrders,
  getPartnerPendingApprovalOrders,
} from "@/lib/partner-work-queue-utils";
import { PARTNER_SELF_SERVICE_WORKFLOW_ENABLED } from "@/lib/partner-workflow-config";
import {
  getPartnerByUserId,
  partnerHasCategory,
} from "@/lib/partner-utils";
import {
  getQaDashboardStats,
  getVisibleContractIds,
} from "@/lib/place-qa-utils";
import {
  getRoleExecutionApprovalCount,
  ROLE_EXECUTION_APPROVAL_LABELS,
} from "@/lib/role-execution-approval-utils";
import { filterContractsByRole, getClientContractForUser } from "@/lib/selectors";
import type { AppData, UserRole } from "@/lib/types";

/** 대시보드 해야 할 일 → 섹션 이동 쿼리 (성과급 패널은 기본 접힘) */
export const DASHBOARD_SECTION_BONUS_APPROVAL = "bonus-approval";

/** 재무 페이지 — 고객사 입금 확인 패널 앵커 */
export const FINANCE_SECTION_CLIENT_DEPOSIT = "client-deposit";

export function dashboardSectionHref(section: string): string {
  return `/dashboard?section=${section}`;
}

export function financeSectionHref(section: string): string {
  return `/finance?section=${section}`;
}

/** 역할별 처리 대기 업무 — Navbar·해야 할 일 패널 공용 */
export type RoleActionItem = {
  id: string;
  label: string;
  count: number;
  href: string;
};

export function getRoleActionItems(
  data: AppData,
  userId: string,
  role: UserRole,
): RoleActionItem[] {
  const items: RoleActionItem[] = [];

  const pushExecutionConfirm = (href = "/executions") => {
    const count = getRoleExecutionApprovalCount(data, userId, role);
    if (count <= 0) return;
    items.push({
      id: "execution-confirm",
      label: ROLE_EXECUTION_APPROVAL_LABELS[role],
      count,
      href,
    });
  };

  const pushQaReply = () => {
    const contractIds = getVisibleContractIds(data, role, userId);
    const { needsReply } = getQaDashboardStats(data, contractIds);
    if (needsReply <= 0) return;
    items.push({
      id: "qa-reply",
      label: "Q&A 답변 필요",
      count: needsReply,
      href: "/place-qa",
    });
  };

  switch (role) {
    case "staff": {
      pushExecutionConfirm();
      pushQaReply();
      break;
    }
    case "team_leader": {
      pushExecutionConfirm();
      pushQaReply();
      const bonusCount = getPendingBonusForRole(
        data.bonusPayments,
        "team_leader",
      ).length;
      if (bonusCount > 0) {
        items.push({
          id: "bonus-team-leader",
          label: "성과급 승인",
          count: bonusCount,
          href: dashboardSectionHref(DASHBOARD_SECTION_BONUS_APPROVAL),
        });
      }
      break;
    }
    case "executive": {
      pushExecutionConfirm();
      pushQaReply();
      const bonusCount = getPendingBonusForRole(
        data.bonusPayments,
        "executive",
      ).length;
      if (bonusCount > 0) {
        items.push({
          id: "bonus-executive",
          label: "성과급 결재",
          count: bonusCount,
          href: dashboardSectionHref(DASHBOARD_SECTION_BONUS_APPROVAL),
        });
      }
      if (canApproveExpensePayout(role)) {
        const expenseCount = getPendingExpensePayoutApprovals(
          data.expenses,
        ).length;
        if (expenseCount > 0) {
          items.push({
            id: "expense-approve",
            label: "원가 입금 결재",
            count: expenseCount,
            href: "/expenses",
          });
        }
      }
      break;
    }
    case "ceo": {
      pushExecutionConfirm();
      pushQaReply();
      const bonusCount = getPendingBonusForRole(data.bonusPayments, "ceo").length;
      if (bonusCount > 0) {
        items.push({
          id: "bonus-ceo",
          label: "성과급 최종 승인",
          count: bonusCount,
          href: dashboardSectionHref(DASHBOARD_SECTION_BONUS_APPROVAL),
        });
      }
      const expenseCount = getPendingExpensePayoutApprovals(data.expenses).length;
      if (expenseCount > 0) {
        items.push({
          id: "expense-approve",
          label: "원가 입금 결재",
          count: expenseCount,
          href: "/expenses",
        });
      }
      break;
    }
    case "finance_manager": {
      pushExecutionConfirm("/finance");
      pushQaReply();
      const depositCount = countDepositByStatus(
        getDepositConfirmContracts(data),
      ).pending;
      if (depositCount > 0) {
        items.push({
          id: "deposit-confirm",
          label: "고객사 입금 확인",
          count: depositCount,
          href: financeSectionHref(FINANCE_SECTION_CLIENT_DEPOSIT),
        });
      }
      const transferCount = getFinancePayoutQueue(data.expenses).length;
      if (transferCount > 0) {
        items.push({
          id: "expense-transfer",
          label: "원가 이체 대기",
          count: transferCount,
          href: "/finance",
        });
      }
      const bonusPayCount = getPendingBonusForRole(
        data.bonusPayments,
        "finance_manager",
      ).length;
      if (bonusPayCount > 0) {
        items.push({
          id: "bonus-pay",
          label: "성과급 지급 처리",
          count: bonusPayCount,
          href: "/finance",
        });
      }
      break;
    }
    case "partner": {
      const partnerId = data.users.find((user) => user.id === userId)?.partnerId;
      if (!partnerId) break;

      if (PARTNER_SELF_SERVICE_WORKFLOW_ENABLED) {
        const pending = getPartnerPendingApprovalOrders(data, partnerId).length;
        if (pending > 0) {
          items.push({
            id: "partner-approve",
            label: "실행 승인 대기",
            count: pending,
            href: "/dashboard",
          });
        }
        const deliver = getPartnerApprovedWorkOrders(data, partnerId).length;
        if (deliver > 0) {
          items.push({
            id: "partner-deliver",
            label: "집행·결과 제출",
            count: deliver,
            href: "/dashboard",
          });
        }
        break;
      }

      const contractIds = getPartnerCollaborationContractIds(data, partnerId);
      const partner = getPartnerByUserId(data.partners, partnerId);
      const isReferralPartner = partner
        ? partnerHasCategory(partner, "referral")
        : false;
      if (!isReferralPartner) {
        const openThreads = data.qaThreads.filter(
          (t) =>
            contractIds.includes(t.contractId) && t.status !== "closed",
        ).length;
        if (openThreads > 0) {
          items.push({
            id: "partner-qa",
            label: "소통 스레드",
            count: openThreads,
            href: "/dashboard",
          });
        }
      }
      break;
    }
    case "client": {
      const contract = getClientContractForUser(data, userId);
      const badges = getClientPortalBadgeCounts(data, contract, userId);
      for (const view of CLIENT_PORTAL_VIEWS) {
        const count = badges[view.id];
        if (count <= 0) continue;
        items.push({
          id: `portal-${view.id}`,
          label: `${view.label} 확인`,
          count,
          href: `/dashboard?view=${view.id}`,
        });
      }
      break;
    }
    default:
      break;
  }

  return items;
}

export function getTotalRoleActionCount(items: RoleActionItem[]): number {
  return items.reduce((sum, item) => sum + item.count, 0);
}

/** Navbar·모바일 메뉴별 알림 수 */
export function getNavBadgeCountForHref(
  data: AppData,
  userId: string,
  role: UserRole,
  href: string,
  clientPortalBadges?: ClientPortalBadgeCounts | null,
): number {
  const clientView = getClientPortalViewFromHref(href);
  if (clientView && clientPortalBadges) {
    return clientPortalBadges[clientView];
  }

  const path = href.split("?")[0];
  const items = getRoleActionItems(data, userId, role);

  if (path === "/dashboard") {
    const dashboardItems = items.filter((item) => item.href.split("?")[0] === path);
    let count = dashboardItems.reduce((sum, item) => sum + item.count, 0);

    if (role === "client" && clientPortalBadges) {
      count = Object.values(clientPortalBadges).reduce((sum, n) => sum + n, 0);
    }

    if (
      role === "staff" ||
      role === "team_leader" ||
      role === "executive" ||
      role === "ceo"
    ) {
      count += getRoleExecutionApprovalCount(data, userId, role);
    }

    if (role === "partner") {
      return items
        .filter((item) => item.href.split("?")[0] === path)
        .reduce((sum, item) => sum + item.count, 0);
    }

    return count;
  }

  return items
    .filter((item) => item.href.split("?")[0] === path)
    .reduce((sum, item) => sum + item.count, 0);
}

/** 파트너 대시보드 탭별 처리 건수 */
export function getPartnerTabActionCounts(
  data: AppData,
  partnerId: string,
  userId?: string,
): Partial<
  Record<
    "overview" | "collaborate" | "work" | "approvals" | "active" | "experience" | "history",
    number
  >
> {
  if (PARTNER_SELF_SERVICE_WORKFLOW_ENABLED) {
    return {
      approvals: getPartnerPendingApprovalOrders(data, partnerId).length,
      active: getPartnerApprovedWorkOrders(data, partnerId).length,
    };
  }

  const contractIds = getPartnerCollaborationContractIds(data, partnerId);
  const partner = getPartnerByUserId(data.partners, partnerId);
  const isReferralPartner = partner
    ? partnerHasCategory(partner, "referral")
    : false;
  const openThreads = isReferralPartner
    ? 0
    : data.qaThreads.filter(
        (t) => contractIds.includes(t.contractId) && t.status !== "closed",
      ).length;
  const workCount = data.workOrders.filter(
    (o) => o.partnerId === partnerId,
  ).length;

  return {
    collaborate: openThreads,
    work: workCount,
  };
}
