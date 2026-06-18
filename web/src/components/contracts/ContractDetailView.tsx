"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  ExternalLink,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { useWorkOrders } from "@/features/work-orders/useWorkOrders";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { TabBar } from "@/components/ui/TabBar";
import { ContractTermsEditModal } from "@/components/contracts/ContractTermsEditModal";
import { ContractKpiStrip } from "@/components/contracts/ContractKpiStrip";
import {
  CONTRACT_DETAIL_TABS,
  emptyExecution,
  emptyExpense,
  type ContractDetailTab,
} from "@/components/contracts/detail/constants";
import {
  ContractExecutionModal,
  ContractExpenseModal,
} from "@/components/contracts/detail/ContractDetailModals";
import { ContractExecutionsTab } from "@/components/contracts/detail/ContractExecutionsTab";
import { ContractExpensesTab } from "@/components/contracts/detail/ContractExpensesTab";
import { ContractExtensionTab } from "@/components/contracts/detail/ContractExtensionTab";
import { ContractHistoryTab } from "@/components/contracts/detail/ContractHistoryTab";
import { ContractOverviewTab } from "@/components/contracts/detail/ContractOverviewTab";
import {
  calcBonusAmounts,
  calcBonusClosingDeadline,
  calcScheduledPayDate,
  calcVisibleBonusTotal,
  isBonusEligible,
} from "@/lib/bonus-utils";
import { canRoleViewContract, isLeaderManagedContract } from "@/lib/contract-access-utils";
import { daysUntil } from "@/lib/contract-lifecycle";
import {
  canEditContractTerms,
  canRecontractAfterTermination,
  type ContractTermsChangeMode,
  type ContractTermsFormValues,
} from "@/lib/contract-terms-utils";
import { prepareExecutionInput } from "@/lib/execution-utils";
import { sortExecutionsByChannel } from "@/lib/execution-generation-utils";
import { threadNeedsStaffReply } from "@/lib/place-qa-utils";
import {
  getCompletionRate,
  getContractActivity,
  getContractExecutions,
  getContractExpenses,
  getContractExtensionApproval,
  getContractMemos,
  getContractRecords,
  getTeamName,
  getUserName,
} from "@/lib/selectors";
import { getContractTargetChannels } from "@/lib/task-channel-utils";
import type {
  ContractInput,
  Execution,
  ExecutionInput,
  Expense,
  ExpenseInput,
  TerminationReason,
} from "@/lib/types";
import { TERMINATION_REASON_LABELS } from "@/lib/types";

export function ContractDetailView({ contractId }: { contractId: string }) {
  const data = useData();
  const { ensureContractExecutions, updateContract, updateContractClientLinks } =
    data;
  const { ensureContractWorkOrders } = useWorkOrders();
  const { currentUser, canViewFinancials, activeRole, canManageContractTerms } =
    useRole();

  const [tab, setTab] = useState<ContractDetailTab>("overview");
  const [execModal, setExecModal] = useState(false);
  const [expModal, setExpModal] = useState(false);
  const [editingExec, setEditingExec] = useState<Execution | null>(null);
  const [editingExp, setEditingExp] = useState<Expense | null>(null);
  const [execForm, setExecForm] = useState<ExecutionInput>(
    emptyExecution(contractId),
  );
  const [expForm, setExpForm] = useState<ExpenseInput>(
    emptyExpense(contractId),
  );
  const [toast, setToast] = useState<string | null>(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(
    null,
  );
  const [terminateModal, setTerminateModal] = useState(false);
  const [terminateReason, setTerminateReason] =
    useState<TerminationReason>("client_request");
  const [depositDraft, setDepositDraft] = useState("");
  const [memoDraft, setMemoDraft] = useState("");
  const [termsModalMode, setTermsModalMode] =
    useState<ContractTermsChangeMode | null>(null);

  const contract = data.contracts.find((c) => c.id === contractId);
  const contractRecords = useMemo(
    () => getContractRecords(data, contractId),
    [data, contractId],
  );
  const contractMemos = useMemo(
    () => getContractMemos(data, contractId),
    [data, contractId],
  );
  const executions = useMemo(
    () =>
      sortExecutionsByChannel(
        getContractExecutions(data, contractId),
        data.taskChannels,
      ),
    [data, contractId],
  );

  useEffect(() => {
    ensureContractExecutions(contractId);
  }, [contractId, ensureContractExecutions]);

  const expenses = useMemo(
    () => getContractExpenses(data, contractId),
    [data, contractId],
  );
  const activity = useMemo(
    () => getContractActivity(data, contractId),
    [data, contractId],
  );
  const extensionApproval = getContractExtensionApproval(data, contractId);
  const targetChannels = useMemo(
    () => getContractTargetChannels(data.taskChannels),
    [data.taskChannels],
  );
  const progressChannels = useMemo(
    () => targetChannels.filter((c) => c.contractDoneField),
    [targetChannels],
  );

  if (!contract) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-400">업체를 찾을 수 없습니다.</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm text-emerald-400 hover:underline"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    );
  }

  if (!canRoleViewContract(data, contract, activeRole, currentUser.id)) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-400">이 업체 정보를 조회할 권한이 없습니다.</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm text-emerald-400 hover:underline"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    );
  }

  const completionRate = getCompletionRate(data, contract);
  const bonusAmounts = contract.isExtension
    ? calcBonusAmounts(contract, data.bonusPolicy, data)
    : null;
  const leaderManaged = isLeaderManagedContract(data, contract);
  const expectedBonus =
    activeRole === "staff"
      ? leaderManaged
        ? (bonusAmounts?.teamLeaderBonusAmount ?? 0)
        : (bonusAmounts?.staffBonusAmount ?? 0)
      : bonusAmounts
        ? calcVisibleBonusTotal(bonusAmounts, activeRole)
        : 0;
  const expectedPct =
    activeRole === "staff"
      ? leaderManaged
        ? (bonusAmounts?.teamLeaderPercentApplied ?? 0)
        : (bonusAmounts?.staffPercentApplied ?? 0)
      : null;
  const showBonusTierBreakdown =
    Boolean(bonusAmounts) &&
    activeRole !== "staff" &&
    activeRole !== "client" &&
    activeRole !== "partner";
  const bonusEligible = isBonusEligible(contract);
  const scheduledBonusPayDate = contract.lastClientDepositDate
    ? calcScheduledPayDate(contract.lastClientDepositDate)
    : undefined;
  const scheduledBonusClosingDate = contract.lastClientDepositDate
    ? calcBonusClosingDeadline(contract.lastClientDepositDate)
    : undefined;
  const canWriteMemo = activeRole !== "client" && activeRole !== "partner";
  const memoToday = new Date().toISOString().slice(0, 10);
  const depositInputValue =
    depositDraft || contract.lastClientDepositDate || "";
  const depositDirty =
    Boolean(depositInputValue) &&
    depositInputValue !== (contract.lastClientDepositDate ?? "");
  const memoDirty = memoDraft.trim().length > 0;

  function handleAddMemo(ev: React.FormEvent) {
    ev.preventDefault();
    if (!memoDraft.trim()) return;
    const created = data.addContractMemo(
      contractId,
      memoDraft,
      currentUser.id,
    );
    if (created) {
      setMemoDraft("");
      showToast("메모가 저장되었습니다.");
    }
  }

  function handleDeleteMemo(memoId: string) {
    if (!confirm("이 메모를 삭제하시겠습니까?")) return;
    data.deleteContractMemo(memoId);
    showToast("메모가 삭제되었습니다.");
  }

  const canEditTerms =
    contract.status === "active" &&
    canEditContractTerms(data, contract, activeRole, currentUser.id);

  const canRecontract = canRecontractAfterTermination(
    data,
    contract,
    activeRole,
    currentUser.id,
  );

  function handleSaveTerms(
    values: ContractTermsFormValues,
    mode: ContractTermsChangeMode,
  ) {
    if (!contract) return;
    const payload: Partial<ContractInput> = { ...values };
    if (!canManageContractTerms) {
      payload.isExtension = contract.isExtension;
      payload.hasReferralPromo = contract.hasReferralPromo;
      payload.referrerPartnerId = contract.referrerPartnerId;
    }
    if (mode === "recontract") {
      payload.isExtension = false;
    }
    updateContract(contractId, payload, { mode });
    ensureContractExecutions(contractId);
    ensureContractWorkOrders(contractId);
    showToast(
      mode === "recontract"
        ? "재계약이 적용되었습니다. 성과급은 3개월 경과 후 연장 전환, 4월차부터 지급 대상입니다."
        : mode === "renewal"
          ? "재계약 조건이 적용되었습니다."
          : "계약 조건이 변경되었습니다.",
    );
    if (mode === "recontract") {
      setTab("overview");
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function openExecCreate() {
    setEditingExec(null);
    setExecForm(emptyExecution(contractId));
    setExecModal(true);
  }

  function openExecEdit(e: Execution) {
    setEditingExec(e);
    setExecForm({
      ...e,
      postLinks: e.postLinks?.length ? e.postLinks : [],
    });
    setExecModal(true);
  }

  function submitExec(ev: React.FormEvent) {
    ev.preventDefault();
    const payload = prepareExecutionInput(execForm);
    if (editingExec) {
      data.updateExecution(editingExec.id, payload);
      showToast("실행 내역이 수정되었습니다.");
    } else {
      data.addExecution(payload);
      showToast("실행이 등록되었습니다.");
    }
    setExecModal(false);
  }

  function openExpCreate() {
    setEditingExp(null);
    setExpForm(emptyExpense(contractId));
    setExpModal(true);
  }

  function openExpEdit(e: Expense) {
    setEditingExp(e);
    setExpForm({ ...e });
    setExpModal(true);
  }

  function submitExp(ev: React.FormEvent) {
    ev.preventDefault();
    const payload = {
      ...expForm,
      payoutStatus: editingExp?.payoutStatus ?? ("unpaid" as const),
    };
    if (editingExp) {
      data.updateExpense(editingExp.id, payload);
      showToast("원가가 수정되었습니다.");
    } else {
      data.addExpense({ ...payload, payoutStatus: "unpaid" });
      showToast("원가가 등록되었습니다.");
    }
    setExpModal(false);
  }

  function handleRequestPayout(expense: Expense) {
    if (
      !confirm(
        "입금 요청을 상신하시겠습니까? (대표·임원 승인 후 재무 큐에 추가)",
      )
    ) {
      return;
    }
    if (data.requestExpensePayout(expense.id, currentUser.id)) {
      showToast("입금 요청이 상신되었습니다.");
    }
  }

  function handleExtensionRequest() {
    const ok = data.requestExtension(contractId, currentUser.id);
    if (ok) {
      showToast("연장 전환 신청이 접수되었습니다. 팀장 승인을 기다려주세요.");
      setTab("extension");
    } else {
      showToast("이미 연장 계약이거나 승인 대기 중입니다.");
    }
  }

  function handleTerminate() {
    data.terminateContract(contractId, terminateReason);
    setTerminateModal(false);
    showToast("계약이 해지 처리되었습니다.");
    setTab("history");
  }

  const daysLeft =
    contract.status === "active" ? daysUntil(contract.contractEndDate) : null;

  const pendingQaCount = useMemo(
    () =>
      (data.qaThreads ?? []).filter(
        (thread) =>
          thread.contractId === contractId &&
          threadNeedsStaffReply(data, thread),
      ).length,
    [data, contractId],
  );

  const tabItems = useMemo(
    () =>
      CONTRACT_DETAIL_TABS.map((item) =>
        item.id === "overview" && pendingQaCount > 0
          ? { ...item, label: `계약 현황 (${pendingQaCount})` }
          : item,
      ),
    [pendingQaCount],
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 shadow-xl">
          {toast}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            href="/contracts"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            계약 목록
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl font-bold text-zinc-50 sm:text-2xl">
              {contract.clientName}
            </h1>
            {activeRole !== "partner" && (
              <Link href={`/contracts/${contractId}/client-portal`}>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1.5 border-cyan-500/25 px-2.5 text-xs text-cyan-300 hover:border-cyan-500/40 hover:text-cyan-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  고객사 포털
                </Button>
              </Link>
            )}
            {contract.companyName && (
              <span className="text-sm text-zinc-500">{contract.companyName}</span>
            )}
            {contract.isExtension && <Badge variant="success">연장</Badge>}
            {contract.status === "terminated" && (
              <Badge variant="danger">해지</Badge>
            )}
            {daysLeft !== null && daysLeft <= 14 && daysLeft >= 0 && (
              <Badge variant={daysLeft <= 7 ? "danger" : "warning"}>
                D-{daysLeft}
              </Badge>
            )}
            {contract.hasReferralPromo && (
              <Badge variant="info">리셀러 10%</Badge>
            )}
            <Badge variant="default">{completionRate.toFixed(0)}% 달성</Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {getTeamName(data, contract.teamId)} · 담당{" "}
            {getUserName(data, contract.assignedStaffId)}
            {contract.lastClientDepositDate && (
              <span className="text-zinc-600">
                {" "}
                · 입금 {contract.lastClientDepositDate}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:shrink-0 lg:justify-end">
          <Link href="/executions">
            <Button variant="secondary" size="sm">
              <BarChart3 className="h-4 w-4" />
              실행 허브
            </Button>
          </Link>
          {!contract.isExtension && extensionApproval?.status !== "pending" && (
            <Button variant="secondary" size="sm" onClick={handleExtensionRequest}>
              <RefreshCw className="h-4 w-4" />
              연장 신청
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={openExecCreate}>
            <Plus className="h-4 w-4" />
            실행
          </Button>
          <Button size="sm" onClick={openExpCreate}>
            <Plus className="h-4 w-4" />
            원가
          </Button>
          {contract.status === "active" && (
            <Button variant="danger" size="sm" onClick={() => setTerminateModal(true)}>
              해지
            </Button>
          )}
        </div>
      </div>

      <ContractKpiStrip
        contract={contract}
        progressChannels={progressChannels}
        completionRate={completionRate}
        scheduledBonusPayDate={scheduledBonusPayDate}
        bonusEligible={bonusEligible}
        expectedPct={expectedPct}
      />

      <div className="sticky top-14 z-20 -mx-1 rounded-xl border border-zinc-800/80 bg-zinc-950/95 px-1 py-2 backdrop-blur-md">
        <TabBar active={tab} onChange={setTab} items={tabItems} />
      </div>

      {contract.status === "terminated" && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader
            title="계약 해지됨"
            subtitle="성과급 지급 이력이 있던 고객사도 재계약 시 회차가 초기화됩니다"
          />
          <div className="space-y-3 px-1 pb-2">
            <p className="text-sm text-zinc-400">
              재계약 후 새 시작일 기준{" "}
              <strong className="text-zinc-200">3개월 경과</strong> 시 연장·성과급
              정책 적용,{" "}
              <strong className="text-zinc-200">4월차부터</strong> 성과급 지급
              대상입니다.
            </p>
            {canRecontract ? (
              <Button onClick={() => setTermsModalMode("recontract")}>
                <RefreshCw className="h-4 w-4" />
                해지 후 재계약
              </Button>
            ) : (
              <p className="text-xs text-zinc-500">
                재계약은 임원·대표 또는 해당 팀 담당자만 설정할 수 있습니다.
              </p>
            )}
          </div>
        </Card>
      )}

      {tab === "overview" && (
        <ContractOverviewTab
          data={data}
          contract={contract}
          contractId={contractId}
          canViewFinancials={canViewFinancials}
          canEditTerms={canEditTerms}
          depositDraft={depositDraft}
          onDepositDraftChange={setDepositDraft}
          depositDirty={depositDirty}
          onSaveDeposit={() => {
            const date = depositDraft || contract.lastClientDepositDate;
            if (!date) {
              showToast("입금일을 선택해 주세요.");
              return;
            }
            data.updateContract(contractId, { lastClientDepositDate: date });
            setDepositDraft("");
            showToast("업체 입금일이 저장되었습니다.");
          }}
          scheduledBonusPayDate={scheduledBonusPayDate}
          scheduledBonusClosingDate={scheduledBonusClosingDate}
          completionRate={completionRate}
          progressChannels={progressChannels}
          activity={activity}
          executions={executions}
          selectedExecutionId={selectedExecutionId}
          onSelectExecution={setSelectedExecutionId}
          onOpenExecEdit={openExecEdit}
          onNavigateTab={setTab}
          onUpdateClientLinks={(input) =>
            updateContractClientLinks(contract.id, input)
          }
          onOpenTermsModal={setTermsModalMode}
          expectedPct={expectedPct}
        />
      )}

      {tab === "executions" && (
        <ContractExecutionsTab
          executions={executions}
          onEdit={openExecEdit}
          onDelete={(id) => {
            if (confirm("삭제하시겠습니까?")) {
              data.deleteExecution(id);
              showToast("실행이 삭제되었습니다.");
            }
          }}
        />
      )}

      {tab === "expenses" && (
        <ContractExpensesTab
          expenses={expenses}
          data={data}
          currentUserId={currentUser.id}
          activeRole={activeRole}
          onAdd={openExpCreate}
          onEdit={openExpEdit}
          onRequestPayout={handleRequestPayout}
          onDelete={(id) => {
            if (confirm("삭제하시겠습니까?")) {
              data.deleteExpense(id);
              showToast("원가가 삭제되었습니다.");
            }
          }}
        />
      )}

      {tab === "extension" && (
        <ContractExtensionTab
          contract={contract}
          extensionApproval={extensionApproval}
          bonusEligible={bonusEligible}
          expectedBonus={expectedBonus}
          expectedPct={expectedPct}
          showBonusTierBreakdown={showBonusTierBreakdown}
          bonusAmounts={bonusAmounts}
          activeRole={activeRole}
          scheduledBonusPayDate={scheduledBonusPayDate}
          scheduledBonusClosingDate={scheduledBonusClosingDate}
          canEditTerms={canEditTerms}
          onRequestExtension={handleExtensionRequest}
          onOpenTermsModal={setTermsModalMode}
        />
      )}

      {tab === "history" && (
        <ContractHistoryTab
          data={data}
          contract={contract}
          contractRecords={contractRecords}
          contractMemos={contractMemos}
          canWriteMemo={canWriteMemo}
          memoToday={memoToday}
          memoDraft={memoDraft}
          onMemoDraftChange={setMemoDraft}
          memoDirty={memoDirty}
          onAddMemo={handleAddMemo}
          onDeleteMemo={handleDeleteMemo}
          currentUserId={currentUser.id}
          activeRole={activeRole}
        />
      )}

      {termsModalMode && (
        <ContractTermsEditModal
          contract={contract}
          open={termsModalMode !== null}
          onClose={() => setTermsModalMode(null)}
          mode={termsModalMode}
          onSave={handleSaveTerms}
        />
      )}

      <Modal
        open={terminateModal}
        onClose={() => setTerminateModal(false)}
        title="계약 해지"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            <strong className="text-zinc-200">{contract.clientName}</strong>{" "}
            계약을 해지합니다. 해지 사유를 선택해 주세요.
          </p>
          <Select
            label="해지 사유 *"
            value={terminateReason}
            onChange={(e) =>
              setTerminateReason(e.target.value as TerminationReason)
            }
          >
            {(Object.keys(TERMINATION_REASON_LABELS) as TerminationReason[]).map(
              (key) => (
                <option key={key} value={key}>
                  {TERMINATION_REASON_LABELS[key]}
                </option>
              ),
            )}
          </Select>
          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <Button variant="secondary" onClick={() => setTerminateModal(false)}>
              취소
            </Button>
            <Button variant="danger" onClick={handleTerminate}>
              해지 확인
            </Button>
          </div>
        </div>
      </Modal>

      <ContractExecutionModal
        open={execModal}
        onClose={() => setExecModal(false)}
        editing={editingExec}
        form={execForm}
        setForm={setExecForm}
        onSubmit={submitExec}
      />

      <ContractExpenseModal
        open={expModal}
        onClose={() => setExpModal(false)}
        editing={editingExp}
        form={expForm}
        setForm={setExpForm}
        onSubmit={submitExp}
      />
    </div>
  );
}
