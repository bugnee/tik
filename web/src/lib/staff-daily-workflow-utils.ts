import {
  isClientDepositBlockingWork,
  resolveClientDepositStatus,
} from "@/lib/client-deposit-utils";
import {
  getVisibleContractIds,
  threadNeedsStaffReply,
} from "@/lib/place-qa-utils";
import {
  canConfirmReferralCommissionPayout,
} from "@/lib/referral-commission-utils";
import { financeSectionHref, FINANCE_SECTION_CLIENT_DEPOSIT } from "@/lib/role-action-utils";
import type { AppData, Contract, WorkOrder } from "@/lib/types";
import { filterContractsByRole } from "@/lib/selectors";
import {
  isReferralCommissionWorkOrder,
  calcWorkOrderTotal,
} from "@/lib/work-order-utils";

/** 실무 담당 일일 우선순위 업무 (최대 5건) */
export type StaffDailyAction = {
  id: string;
  label: string;
  reason: string;
  href: string;
  priority: number;
  contractId?: string;
};

const MAX_DAILY_ACTIONS = 5;

function executionHref(contractId: string): string {
  return `/executions?contract=${contractId}`;
}

/** 업무 타임라인 행 — 다음 행동 힌트 (명확할 때만) */
export function getWorkOrderNextActionHint(
  order: WorkOrder,
  contract: Contract | undefined,
): string | null {
  if (contract && isClientDepositBlockingWork(contract)) {
    return "다음: 입금 확인 후 진행";
  }

  switch (order.stage) {
    case "draft":
    case "rejected":
      return order.partnerId
        ? "다음: 파트너·비용 제출"
        : "다음: 파트너·비용 설정";
    case "pending_approval":
      return "다음: 파트너 승인 대기";
    case "pending_staff_confirm":
      return "다음: 담당 확인";
    case "approved":
      return "다음: 결과 등록";
    case "delivered": {
      if (isReferralCommissionWorkOrder(order)) {
        if (
          contract &&
          !canConfirmReferralCommissionPayout(contract, order)
        ) {
          return "다음: 입금+10일 후 지급";
        }
        return "다음: 리셀러 지급 확인";
      }
      return calcWorkOrderTotal(order.costLines) > 0
        ? "다음: 입금 확인"
        : "다음: 완료 확인";
    }
    default:
      return null;
  }
}

/** 담당 계약·역할 기준 오늘 처리할 업무 (긴급도 순, 최대 5건) */
export function getStaffDailyActions(
  data: AppData,
  userId: string,
): StaffDailyAction[] {
  const user = data.users.find((u) => u.id === userId);
  const role = user?.role ?? "staff";
  const contracts = filterContractsByRole(data, role, userId).filter(
    (c) => c.status === "active",
  );
  const contractIds = new Set(contracts.map((c) => c.id));
  const actions: StaffDailyAction[] = [];

  for (const contract of contracts) {
    if (isClientDepositBlockingWork(contract)) {
      const status = resolveClientDepositStatus(contract);
      actions.push({
        id: `deposit-block-${contract.id}`,
        label: `${contract.clientName} — 입금 확인 대기`,
        reason:
          status === "overdue"
            ? "입금 연체 — 재무담당 확인 후 업무를 시작할 수 있습니다."
            : "고객사 광고비 입금 확인 전에는 실행·집행이 제한됩니다.",
        href: financeSectionHref(FINANCE_SECTION_CLIENT_DEPOSIT),
        priority: status === "overdue" ? 1 : 2,
        contractId: contract.id,
      });
    }
  }

  for (const order of data.workOrders) {
    if (!contractIds.has(order.contractId)) continue;
    const contract = contracts.find((c) => c.id === order.contractId);
    if (contract && isClientDepositBlockingWork(contract)) continue;

    if (order.stage === "draft" || order.stage === "rejected") {
      actions.push({
        id: `assign-${order.id}`,
        label: `${order.title} — 파트너·비용 설정`,
        reason: order.partnerId
          ? "파트너가 배정되었습니다. 비용 확인 후 제출하세요."
          : "매뉴얼 ① 실행 페이지에서 파트너와 원가를 입력합니다.",
        href: executionHref(order.contractId),
        priority: 3,
        contractId: order.contractId,
      });
      continue;
    }

    if (order.stage === "approved") {
      actions.push({
        id: `deliver-${order.id}`,
        label: `${order.title} — 결과 등록`,
        reason:
          "승인된 업무입니다. 포스팅 링크·결과물을 등록하면 다음 단계로 넘어갑니다.",
        href: executionHref(order.contractId),
        priority: 4,
        contractId: order.contractId,
      });
      continue;
    }

    if (order.stage === "delivered") {
      const isReferral = isReferralCommissionWorkOrder(order);
      if (
        isReferral &&
        contract &&
        !canConfirmReferralCommissionPayout(contract, order)
      ) {
        continue;
      }
      actions.push({
        id: `payout-${order.id}`,
        label: `${order.title} — ${isReferral ? "리셀러 지급" : "입금"} 확인`,
        reason: isReferral
          ? "고객 입금+10일 경과 — 리셀러 수수료 지급을 확인하세요."
          : "결과 등록 완료 — 파트너 원가 입금을 확인하세요.",
        href: executionHref(order.contractId),
        priority: 5,
        contractId: order.contractId,
      });
    }
  }

  const visibleQaContractIds = getVisibleContractIds(data, role, userId);
  for (const thread of data.qaThreads) {
    if (!visibleQaContractIds.includes(thread.contractId)) continue;
    if (!threadNeedsStaffReply(data, thread)) continue;
    const contract = data.contracts.find((c) => c.id === thread.contractId);
    actions.push({
      id: `qa-${thread.id}`,
      label: `Q&A — ${thread.subject}`,
      reason: `${contract?.clientName ?? "고객사"} 문의에 답변이 필요합니다.`,
      href: `/place-qa?contract=${thread.contractId}`,
      priority: 6,
      contractId: thread.contractId,
    });
  }

  return actions
    .sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label, "ko"))
    .slice(0, MAX_DAILY_ACTIONS);
}
