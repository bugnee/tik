"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronRight,
  ClipboardList,
  History,
  MessageSquare,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Send,
  Trash2,
  User,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  DataTable,
  EmptyState,
  Td,
  Th,
  Tr,
} from "@/components/ui/DataTable";
import { Input, Select, Textarea } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatKRW } from "@/lib/finance";
import {
  calcBonusAmounts,
  calcScheduledPayDate,
  getEligibilityMessage,
  isBonusEligible,
} from "@/lib/bonus-utils";
import { BonusPayDateLine } from "@/components/bonus/BonusPayScheduleNotice";
import { canRoleViewContract, isLeaderManagedContract } from "@/lib/contract-access-utils";
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
import type {
  AppData,
  Contract,
  ContractInput,
  Execution,
  ExecutionInput,
  ExecutionStatus,
  ExecutionType,
  Expense,
  ExpenseCategory,
  ExpenseInput,
  PayoutStatus,
  TerminationReason,
  UserRole,
} from "@/lib/types";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import { ContractTermsEditModal } from "@/components/contracts/ContractTermsEditModal";
import { PlaceCredentialsPanel } from "@/components/place-qa/PlaceCredentialsPanel";
import { QaConversationPanel } from "@/components/place-qa/QaConversationPanel";
import { getPlaceCredentialsForContract } from "@/lib/place-qa-utils";
import { sortExecutionsByChannel } from "@/lib/execution-generation-utils";
import {
  getContractChannelProgress,
  getContractDoneCount,
  getContractTargetChannels,
  getContractTargetCount,
  getContractTargetUnit,
  getExecutionTypeLabels,
  shouldShowContractTargetRow,
  TASK_CHANNEL_BADGE_CLASSES,
} from "@/lib/task-channel-utils";
import {
  CONTRACT_STATUS_LABELS,
  EXECUTION_STATUS_LABELS,
  PAYOUT_LABELS,
  TERMINATION_REASON_LABELS,
} from "@/lib/types";
import { daysUntil } from "@/lib/contract-lifecycle";
import {
  canEditContractTerms,
  type ContractTermsChangeMode,
  type ContractTermsFormValues,
} from "@/lib/contract-terms-utils";
import { canUserRequestExpense } from "@/lib/expense-payout-utils";
import {
  getActiveExpenseCategories,
  getExpenseCategoryLabel,
} from "@/lib/expense-category-utils";
import { getPartnerName } from "@/lib/partner-utils";
import { prepareExecutionInput, getValidPostLinks } from "@/lib/execution-utils";
import { PostLinksCell, PostLinksField } from "@/components/executions/PostLinksField";
import { cn } from "@/lib/cn";

type Tab = "overview" | "executions" | "expenses" | "extension" | "history";

const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: "overview", label: "계약 현황", icon: Building2 },
  { id: "executions", label: "실행 진행", icon: ClipboardList },
  { id: "expenses", label: "집행 원가", icon: Receipt },
  { id: "extension", label: "연장 신청", icon: RefreshCw },
  { id: "history", label: "계약 기록", icon: History },
];

const emptyExecution = (contractId: string): ExecutionInput => ({
  contractId,
  type: "optimized",
  status: "pending",
  completedCount: 0,
  targetCount: 0,
  dueDate: "",
  memo: "",
  postLinks: [],
});

const emptyExpense = (contractId: string): ExpenseInput => ({
  contractId,
  category: "press",
  description: "",
  amount: 0,
  bankAccount: "",
  accountHolder: "",
  payoutStatus: "unpaid",
  paymentDueDate: "",
});

const PAYOUT_VARIANT: Record<
  PayoutStatus,
  "danger" | "warning" | "success" | "info"
> = {
  unpaid: "danger",
  pending_approval: "info",
  pending_transfer: "warning",
  paid: "success",
};

export function ContractDetailView({ contractId }: { contractId: string }) {
  const data = useData();
  const { ensureContractExecutions, ensureContractWorkOrders, updateContract } =
    data;
  const { currentUser, canViewFinancials, activeRole, canManageContractTerms } =
    useRole();
  const [tab, setTab] = useState<Tab>("overview");
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

  if (
    !canRoleViewContract(data, contract, activeRole, currentUser.id)
  ) {
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
  const staffBonus = bonusAmounts?.staffBonusAmount ?? 0;
  const staffPct = bonusAmounts?.staffPercentApplied ?? 0;
  const bonusEligible = isBonusEligible(contract);
  const scheduledBonusPayDate = contract.lastClientDepositDate
    ? calcScheduledPayDate(contract.lastClientDepositDate)
    : undefined;
  const canWriteMemo =
    activeRole !== "client" && activeRole !== "partner";
  const memoToday = new Date().toISOString().slice(0, 10);

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
    contract &&
    contract.status === "active" &&
    canEditContractTerms(data, contract, activeRole, currentUser.id);

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
    updateContract(contractId, payload, { mode });
    ensureContractExecutions(contractId);
    ensureContractWorkOrders(contractId);
    showToast(
      mode === "renewal"
        ? "재계약 조건이 적용되었습니다."
        : "계약 조건이 변경되었습니다.",
    );
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
    contract.status === "active"
      ? daysUntil(contract.contractEndDate)
      : null;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 shadow-xl">
          {toast}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            대시보드로
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-50">
              {contract.clientName}
            </h1>
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
              <Badge variant="info">소개 10%</Badge>
            )}
            <Badge variant="default">{completionRate.toFixed(0)}% 달성</Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {getTeamName(data, contract.teamId)} · 담당{" "}
            {getUserName(data, contract.assignedStaffId)}
          </p>
        </div>
        <div className="flex gap-2">
          {!contract.isExtension &&
            extensionApproval?.status !== "pending" && (
              <Button variant="secondary" onClick={handleExtensionRequest}>
                <RefreshCw className="h-4 w-4" />
                연장 신청
              </Button>
            )}
          <Button variant="secondary" onClick={openExecCreate}>
            <Plus className="h-4 w-4" />
            실행 추가
          </Button>
          <Button onClick={openExpCreate}>
            <Plus className="h-4 w-4" />
            원가 등록
          </Button>
          {contract.status === "active" && (
            <Button variant="danger" onClick={() => setTerminateModal(true)}>
              계약 해지
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="월 광고비" value={formatKRW(contract.monthlyFee)} />
        <MiniStat
          label="계약 기간"
          value={`${contract.contractStartDate} ~ ${contract.contractEndDate}`}
        />
        <MiniStat
          label="계약 상태"
          value={CONTRACT_STATUS_LABELS[contract.status]}
        />
        {progressChannels.map((channel) => (
          <MiniStat
            key={channel.id}
            label={channel.label}
            value={`${getContractDoneCount(contract, channel)} / ${getContractTargetCount(contract, channel)}`}
          />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <MiniStat
          label="업체 입금일"
          value={contract.lastClientDepositDate ?? "미등록"}
        />
        <MiniStat
          label={`성과급 지급 예정 (${staffPct}%)`}
          value={
            scheduledBonusPayDate
              ? scheduledBonusPayDate
              : bonusEligible
                ? "입금일 등록 필요"
                : "-"
          }
        />
        {contract.status === "terminated" && contract.terminationReason && (
          <MiniStat
            label="해지 사유"
            value={TERMINATION_REASON_LABELS[contract.terminationReason]}
          />
        )}
      </div>

      {canViewFinancials && contract.status === "active" && (
        <Card>
          <CardHeader
            title="업체 입금일 등록"
            subtitle="광고비 입금 확인일 · 성과급은 입금 + 60일 후 지급"
          />
          <div className="flex flex-wrap items-end gap-3">
            <Input
              label="입금일"
              type="date"
              value={depositDraft || contract.lastClientDepositDate || ""}
              onChange={(e) => setDepositDraft(e.target.value)}
              className="max-w-xs"
            />
            <Button
              size="sm"
              onClick={() => {
                const date = depositDraft || contract.lastClientDepositDate;
                if (!date) {
                  showToast("입금일을 선택해 주세요.");
                  return;
                }
                data.updateContract(contractId, { lastClientDepositDate: date });
                setDepositDraft("");
                showToast("업체 입금일이 저장되었습니다.");
              }}
            >
              저장
            </Button>
            {contract.lastClientDepositDate && scheduledBonusPayDate && (
              <BonusPayDateLine
                clientDepositDate={contract.lastClientDepositDate}
                scheduledPayDate={scheduledBonusPayDate}
              />
            )}
          </div>
        </Card>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === id
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card glow>
            <CardHeader title="달성률" subtitle="목표 대비 진행" />
            <div className="space-y-4">
              <ProgressBar
                value={completionRate}
                label="종합 달성률"
                color="emerald"
              />
              {progressChannels.map((channel, index) => (
                <ProgressBar
                  key={channel.id}
                  value={getContractChannelProgress(contract, channel)}
                  label={channel.label}
                  color={index % 2 === 0 ? "cyan" : "amber"}
                />
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="계약 조건"
              action={
                canEditTerms ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setTermsModalMode("amend")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      조건 변경
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setTermsModalMode("renewal")}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      재계약
                    </Button>
                  </div>
                ) : undefined
              }
            />
            <dl className="space-y-2 text-sm">
              <Row
                icon={Building2}
                label="업체명"
                value={contract.clientName}
                tone="default"
              />
              <Row
                icon={User}
                label="담당"
                value={
                  isLeaderManagedContract(data, contract)
                    ? `${getUserName(data, contract.assignedStaffId)} (팀장)`
                    : getUserName(data, contract.assignedStaffId)
                }
                tone={
                  isLeaderManagedContract(data, contract) ? "leader" : "info"
                }
              />
              <Row
                icon={Calendar}
                label="월 광고비"
                value={formatKRW(contract.monthlyFee)}
                tone="fee"
              />
              {targetChannels
                .filter((channel) => shouldShowContractTargetRow(contract, channel))
                .map((channel) => (
                  <Row
                    key={channel.id}
                    label={`${channel.label} 목표`}
                    value={`${getContractTargetCount(contract, channel)}${getContractTargetUnit(channel)}`}
                    pillClassName={
                      TASK_CHANNEL_BADGE_CLASSES[
                        channel.accentColor ?? "emerald"
                      ]
                    }
                  />
                ))}
              <Row
                label="플레이스세팅"
                value={contract.hasPlaceSetting ? "포함" : "미포함"}
                tone={contract.hasPlaceSetting ? "success" : "muted"}
              />
              <Row
                label="연장 계약"
                value={
                  contract.isExtension
                    ? `예 (${staffPct}% · ${getEligibilityMessage(contract)})`
                    : "아니오"
                }
                tone={contract.isExtension ? "success" : "muted"}
              />
              <Row
                label="소개 프로모"
                value={contract.hasReferralPromo ? "예 (10%)" : "아니오"}
                tone={contract.hasReferralPromo ? "referral" : "muted"}
              />
              {contract.hasReferralPromo && (
                <Row
                  label="리셀러"
                  value={getPartnerName(data.partners, contract.referrerPartnerId)}
                  pillClassName={TASK_CHANNEL_BADGE_CLASSES.rose}
                />
              )}
            </dl>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader title="진행 타임라인" subtitle="실행 · 원가 · 연장 이력" />
            {activity.length === 0 ? (
              <EmptyState message="아직 진행 내역이 없습니다" />
            ) : (
              <div className="space-y-2">
                {activity.slice(0, 12).map((item) => {
                  const isExecution = item.kind === "execution";
                  const isSelected =
                    isExecution && selectedExecutionId === item.id;

                  return (
                    <div key={item.id}>
                      <button
                        type="button"
                        disabled={!isExecution}
                        onClick={() => {
                          if (!isExecution) return;
                          setSelectedExecutionId((prev) =>
                            prev === item.id ? null : item.id,
                          );
                        }}
                        className={cn(
                          "flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-colors",
                          isExecution
                            ? "cursor-pointer hover:border-emerald-500/30 hover:bg-zinc-900/60"
                            : "cursor-default",
                          isSelected
                            ? "border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                            : "border-zinc-800/60 bg-zinc-950/30",
                        )}
                      >
                        <KindBadge kind={item.kind} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-200">
                            {item.title}
                          </p>
                          <p className="text-xs text-zinc-500">{item.detail}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {item.date && (
                            <span className="text-xs text-zinc-600">
                              {item.date}
                            </span>
                          )}
                          {isExecution && (
                            <ChevronRight
                              className={cn(
                                "h-4 w-4 text-zinc-600 transition-transform",
                                isSelected && "rotate-90 text-emerald-400",
                              )}
                            />
                          )}
                        </div>
                      </button>

                      {isSelected && (
                        <ExecutionTimelineDetail
                          execution={executions.find((e) => e.id === item.id)!}
                          onEdit={() => {
                            const exec = executions.find((e) => e.id === item.id);
                            if (exec) openExecEdit(exec);
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {(contract.hasPlaceSetting ||
          getPlaceCredentialsForContract(data, contract.id) ||
          data.qaThreads.some((t) => t.contractId === contract.id)) && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <PlaceCredentialsPanel contractId={contract.id} />
            <QaConversationPanel contractId={contract.id} />
          </div>
        )}
        </>
      )}

      {tab === "executions" && contract && (
        <ExecutionSection
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
        <ExpenseSection
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
        <Card>
          <CardHeader
            title="연장 전환 신청"
            subtitle="팀장 승인 후 재계약 · 3개월 이상 경과 시 4월차부터 성과급 지급 신청"
          />
          {contract.isExtension ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
                <p className="font-medium text-emerald-300">연장 계약 확정</p>
                <p className="mt-1 text-sm text-zinc-500">
                  재계약 {contract.renewalMonthCount}월차 ·{" "}
                  {getEligibilityMessage(contract)}
                </p>
                {bonusEligible && scheduledBonusPayDate && (
                  <p className="mt-2 text-sm text-emerald-400/80">
                    월 {formatKRW(contract.monthlyFee)} × {staffPct}% ={" "}
                    {formatKRW(staffBonus)} (예상) · 지급 예정{" "}
                    {scheduledBonusPayDate}
                  </p>
                )}
              </div>
              {canEditTerms && (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setTermsModalMode("amend")}
                  >
                    <Pencil className="h-4 w-4" />
                    중간 조건 변경
                  </Button>
                  <Button onClick={() => setTermsModalMode("renewal")}>
                    <RefreshCw className="h-4 w-4" />
                    재계약 · 조건 설정
                  </Button>
                </div>
              )}
            </div>
          ) : extensionApproval?.status === "pending" ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
              <Badge variant="warning">승인 대기 중</Badge>
              <p className="mt-2 text-sm text-zinc-400">
                {extensionApproval.createdAt} 신청 · 팀장 검토 중
              </p>
            </div>
          ) : extensionApproval?.status === "rejected" ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-rose-400">최근 신청이 반려되었습니다.</p>
              <Button onClick={handleExtensionRequest}>다시 신청</Button>
            </div>
          ) : (
            <div className="space-y-4 text-center py-6">
              <p className="text-sm text-zinc-500">
                연장 전환 후 재계약 3개월 이상 경과 시 4월차부터 성과급 지급
                신청이 가능합니다. (팀장 설정 % 적용)
              </p>
              <Button onClick={handleExtensionRequest}>
                <RefreshCw className="h-4 w-4" />
                연장 전환 신청
              </Button>
            </div>
          )}
        </Card>
      )}

      {tab === "history" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="계약 기록"
              subtitle="회차별 당시 담당자 · 해지 사유"
            />
            {contractRecords.length === 0 ? (
              <EmptyState message="계약 기록이 없습니다" />
            ) : (
              <div className="space-y-3">
                {contractRecords.map((record) => (
                  <div
                    key={record.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-zinc-200">
                          {record.period} 회차
                          {record.isExtension && (
                            <Badge variant="success" className="ml-2">
                              연장
                            </Badge>
                          )}
                        </p>
                        <p className="mt-1 text-sm text-zinc-400">
                          당시 담당 ·{" "}
                          <span className="text-zinc-200">
                            {getUserName(data, record.assignedStaffId)}
                          </span>
                          {" · "}
                          {getTeamName(data, record.teamId)}
                        </p>
                      </div>
                      <p className="font-mono text-sm text-emerald-400">
                        {formatKRW(record.monthlyFee)}
                      </p>
                    </div>
                    <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                      <div>
                        <dt className="text-zinc-600">시작일</dt>
                        <dd className="text-zinc-300">{record.startedAt}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-600">종료일</dt>
                        <dd className="text-zinc-300">
                          {record.endedAt ?? "진행 중"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-600">해지 사유</dt>
                        <dd className="text-zinc-300">
                          {record.terminationReason
                            ? TERMINATION_REASON_LABELS[record.terminationReason]
                            : "-"}
                        </dd>
                      </div>
                    </dl>
                    {record.note && (
                      <p className="mt-2 text-xs text-zinc-500">{record.note}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="메모"
              subtitle="업무 메모 · 날짜·담당자 자동 기록"
            />
            {canWriteMemo && (
              <form onSubmit={handleAddMemo} className="mb-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                    <p className="text-[11px] text-zinc-600">날짜</p>
                    <p className="text-sm text-zinc-200">{memoToday}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                    <p className="text-[11px] text-zinc-600">담당</p>
                    <p className="text-sm text-zinc-200">
                      {getUserName(data, contract.assignedStaffId)}
                    </p>
                  </div>
                </div>
                <Textarea
                  label="메모 내용"
                  value={memoDraft}
                  onChange={(e) => setMemoDraft(e.target.value)}
                  rows={3}
                  placeholder="고객사 미팅, 연장 협의, 특이사항 등"
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={!memoDraft.trim()}>
                    <MessageSquare className="h-3.5 w-3.5" />
                    메모 저장
                  </Button>
                </div>
              </form>
            )}

            {contractMemos.length === 0 ? (
              <EmptyState message="등록된 메모가 없습니다" />
            ) : (
              <div className="space-y-3">
                {contractMemos.map((memo) => {
                  const canDelete =
                    canWriteMemo &&
                    (memo.authorUserId === currentUser.id ||
                      activeRole === "team_leader" ||
                      activeRole === "executive" ||
                      activeRole === "ceo");

                  return (
                    <div
                      key={memo.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <dl className="grid gap-1 text-xs sm:grid-cols-2">
                          <div>
                            <dt className="text-zinc-600">날짜</dt>
                            <dd className="text-zinc-300">{memo.createdAt}</dd>
                          </div>
                          <div>
                            <dt className="text-zinc-600">담당</dt>
                            <dd className="text-zinc-300">
                              {getUserName(data, memo.assignedStaffId)}
                            </dd>
                          </div>
                        </dl>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMemo(memo.id)}
                            className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-rose-400"
                            title="메모 삭제"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">
                        {memo.body}
                      </p>
                      {memo.authorUserId !== memo.assignedStaffId && (
                        <p className="mt-2 text-[11px] text-zinc-600">
                          작성 · {getUserName(data, memo.authorUserId)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
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
            {(
              Object.keys(TERMINATION_REASON_LABELS) as TerminationReason[]
            ).map((key) => (
              <option key={key} value={key}>
                {TERMINATION_REASON_LABELS[key]}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <Button
              variant="secondary"
              onClick={() => setTerminateModal(false)}
            >
              취소
            </Button>
            <Button variant="danger" onClick={handleTerminate}>
              해지 확인
            </Button>
          </div>
        </div>
      </Modal>

      <ExecutionModal
        open={execModal}
        onClose={() => setExecModal(false)}
        editing={editingExec}
        form={execForm}
        setForm={setExecForm}
        onSubmit={submitExec}
      />

      <ExpenseModal
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

type RowTone =
  | "default"
  | "muted"
  | "success"
  | "warning"
  | "info"
  | "fee"
  | "leader"
  | "referral";

const ROW_VALUE_TONE_CLASSES: Record<RowTone, string> = {
  default: "text-zinc-100",
  muted: "text-zinc-500",
  success: "text-emerald-400",
  warning: "text-amber-400",
  info: "text-cyan-400",
  fee: "font-mono text-emerald-400",
  leader: "text-cyan-400",
  referral: "text-rose-400",
};

function Row({
  icon: Icon,
  label,
  value,
  tone = "default",
  pillClassName,
}: {
  icon?: typeof Building2;
  label: string;
  value: string;
  tone?: RowTone;
  pillClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800/40 py-2 last:border-0">
      <dt className="flex items-center gap-2 text-zinc-500">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />}
        {label}
      </dt>
      <dd
        className={cn(
          "text-right font-medium",
          pillClassName
            ? cn(
                "rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                pillClassName,
              )
            : ROW_VALUE_TONE_CLASSES[tone],
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function KindBadge({ kind }: { kind: ActivityItem["kind"] }) {
  const map = {
    execution: { label: "실행", variant: "info" as const },
    expense: { label: "원가", variant: "warning" as const },
    extension: { label: "연장", variant: "success" as const },
  };
  const { label, variant } = map[kind];
  return <Badge variant={variant}>{label}</Badge>;
}

type ActivityItem = ReturnType<typeof getContractActivity>[number];

function ExecutionTimelineDetail({
  execution,
  onEdit,
}: {
  execution: Execution;
  onEdit: () => void;
}) {
  const data = useData();
  const links = getValidPostLinks(execution.postLinks, execution.dueDate);
  const progressPct =
    execution.targetCount > 0
      ? (execution.completedCount / execution.targetCount) * 100
      : 0;

  const statusVariant =
    execution.status === "completed"
      ? "success"
      : execution.status === "delayed"
        ? "danger"
        : execution.status === "in_progress"
          ? "warning"
          : "default";

  return (
    <div className="mt-2 ml-2 border-l-2 border-emerald-500/30 pl-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              실행 내역
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-100">
              <TaskChannelBadge data={data} executionType={execution.type} />
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant}>
              {EXECUTION_STATUS_LABELS[execution.status]}
            </Badge>
            <Button size="sm" variant="secondary" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              수정
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
            <span>진행률</span>
            <span className="font-mono text-zinc-300">
              {execution.completedCount}/{execution.targetCount}
            </span>
          </div>
          <ProgressBar value={progressPct} max={100} showValue={false} size="sm" />
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          <DetailField label="마감일" value={execution.dueDate || "-"} />
          <DetailField label="완료일" value={execution.completedDate || "-"} />
          <DetailField label="입력일" value={execution.enteredAt || "-"} />
        </dl>

        {execution.memo && (
          <div className="mt-4 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              메모
            </p>
            <p className="mt-1 text-sm text-zinc-300">{execution.memo}</p>
          </div>
        )}

        <div className="mt-4">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            포스팅 링크 ({links.length}건)
          </p>
          {links.length === 0 ? (
            <p className="text-sm text-zinc-600">등록된 링크 없음</p>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-2"
                >
                  <a
                    href={
                      link.url.startsWith("http")
                        ? link.url
                        : `https://${link.url}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sm text-emerald-400 hover:underline"
                  >
                    {link.url}
                  </a>
                  <p className="mt-1 text-[10px] text-zinc-600">
                    마감 {link.dueDate || "-"} · 완료 {link.completedDate || "-"} ·
                    입력 {link.enteredAt || "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-zinc-200">{value}</dd>
    </div>
  );
}

function ExecutionSection({
  executions,
  onEdit,
  onDelete,
}: {
  executions: Execution[];
  onEdit: (e: Execution) => void;
  onDelete: (id: string) => void;
}) {
  const data = useData();
  return (
    <Card>
      <CardHeader
        title={`실행 진행 (${executions.length}건)`}
        subtitle="계약 집행 목표에 따라 자동 생성 · 유형별 색상 구분"
      />
      {executions.length === 0 ? (
        <EmptyState message="계약 목표가 없거나 집행 항목이 비활성 상태입니다" />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>유형</Th>
              <Th>진행</Th>
              <Th>포스팅 링크</Th>
              <Th>상태</Th>
              <Th>마감</Th>
              <Th>메모</Th>
              <Th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {executions.map((e) => (
              <Tr key={e.id}>
                <Td>
                  <TaskChannelBadge
                    data={data}
                    taskType={e.taskChannelId}
                    executionType={e.type}
                  />
                </Td>
                <Td className="font-mono">
                  {e.completedCount}/{e.targetCount}
                </Td>
                <Td>
                  <PostLinksCell links={e.postLinks} fallbackDueDate={e.dueDate} />
                </Td>
                <Td>
                  <Badge
                    variant={
                      e.status === "completed"
                        ? "success"
                        : e.status === "delayed"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {EXECUTION_STATUS_LABELS[e.status]}
                  </Badge>
                </Td>
                <Td>{e.dueDate ?? "-"}</Td>
                <Td className="max-w-[160px] truncate text-zinc-500">
                  {e.memo ?? "-"}
                </Td>
                <Td>
                  <div className="flex gap-1">
                    <IconBtn onClick={() => onEdit(e)} icon={Pencil} />
                    <IconBtn onClick={() => onDelete(e.id)} icon={Trash2} danger />
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </Card>
  );
}

function ExpenseSection({
  expenses,
  data,
  currentUserId,
  activeRole,
  onAdd,
  onEdit,
  onRequestPayout,
  onDelete,
}: {
  expenses: Expense[];
  data: AppData;
  currentUserId: string;
  activeRole: UserRole;
  onAdd: () => void;
  onEdit: (e: Expense) => void;
  onRequestPayout: (e: Expense) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader
        title={`집행 원가 (${expenses.length}건)`}
        action={
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            등록
          </Button>
        }
      />
      {expenses.length === 0 ? (
        <EmptyState message="등록된 원가가 없습니다" />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>카테고리</Th>
              <Th>내용</Th>
              <Th>입금마감일</Th>
              <Th>금액</Th>
              <Th>계좌</Th>
              <Th>상태</Th>
              <Th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => {
              const canRequest = canUserRequestExpense(
                data,
                e,
                currentUserId,
                activeRole,
              );
              return (
                <Tr key={e.id}>
                  <Td>{getExpenseCategoryLabel(data.expenseCategories, e.category)}</Td>
                  <Td>{e.description}</Td>
                  <Td className="whitespace-nowrap text-xs text-zinc-300">
                    {e.paymentDueDate || "-"}
                  </Td>
                  <Td className="font-mono">{formatKRW(e.amount)}</Td>
                  <Td className="text-xs">
                    {e.bankAccount}
                    <br />
                    <span className="text-zinc-600">{e.accountHolder}</span>
                  </Td>
                  <Td>
                    <Badge variant={PAYOUT_VARIANT[e.payoutStatus]}>
                      {PAYOUT_LABELS[e.payoutStatus]}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      {canRequest && (
                        <IconBtn
                          onClick={() => onRequestPayout(e)}
                          icon={Send}
                          title="입금 요청"
                        />
                      )}
                      <IconBtn onClick={() => onEdit(e)} icon={Pencil} />
                      {e.payoutStatus === "unpaid" && (
                        <IconBtn
                          onClick={() => onDelete(e.id)}
                          icon={Trash2}
                          danger
                        />
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </DataTable>
      )}
    </Card>
  );
}

function IconBtn({
  onClick,
  icon: Icon,
  danger,
  title,
}: {
  onClick: () => void;
  icon: typeof Pencil;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800",
        danger
          ? "hover:text-rose-400"
          : title === "입금 요청"
            ? "hover:text-cyan-400"
            : "hover:text-emerald-400",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ExecutionModal({
  open,
  onClose,
  editing,
  form,
  setForm,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  editing: Execution | null;
  form: ExecutionInput;
  setForm: (f: ExecutionInput) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const data = useData();
  const typeLabels = getExecutionTypeLabels(data);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "실행 수정" : "실행 등록"}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="유형"
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value as ExecutionType })
            }
          >
            {(Object.keys(typeLabels) as ExecutionType[]).map((t) => (
              <option key={t} value={t}>
                {typeLabels[t]}
              </option>
            ))}
          </Select>
          <Select
            label="상태"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as ExecutionStatus })
            }
          >
            {(Object.keys(EXECUTION_STATUS_LABELS) as ExecutionStatus[]).map(
              (s) => (
                <option key={s} value={s}>
                  {EXECUTION_STATUS_LABELS[s]}
                </option>
              ),
            )}
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="완료 수"
            type="number"
            min={0}
            value={form.completedCount}
            onChange={(e) =>
              setForm({ ...form, completedCount: Number(e.target.value) })
            }
          />
          <Input
            label="목표 수"
            type="number"
            min={0}
            value={form.targetCount}
            onChange={(e) =>
              setForm({ ...form, targetCount: Number(e.target.value) })
            }
          />
          <Input
            label="마감일"
            type="date"
            value={form.dueDate ?? ""}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
        </div>
        <Textarea
          label="메모"
          value={form.memo ?? ""}
          onChange={(e) => setForm({ ...form, memo: e.target.value })}
        />
        <PostLinksField
          links={form.postLinks ?? []}
          onChange={(postLinks) => setForm({ ...form, postLinks })}
        />
        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit">{editing ? "저장" : "등록"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ExpenseModal({
  open,
  onClose,
  editing,
  form,
  setForm,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  editing: Expense | null;
  form: ExpenseInput;
  setForm: (f: ExpenseInput) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const { expenseCategories } = useData();
  const categories = getActiveExpenseCategories(expenseCategories);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "원가 수정" : "원가 등록"}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="카테고리"
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as ExpenseCategory })
            }
          >
            {(categories.length ? categories : expenseCategories).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
          <div>
            <p className="mb-1.5 text-xs font-medium text-zinc-400">지급 상태</p>
            <Badge
              variant={PAYOUT_VARIANT[editing?.payoutStatus ?? "unpaid"]}
            >
              {PAYOUT_LABELS[editing?.payoutStatus ?? "unpaid"]}
            </Badge>
            <p className="mt-1 text-[11px] text-zinc-600">
              담당 입금요청 → 대표·임원 승인 → 재무 지급
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="입금마감일"
            type="date"
            value={form.paymentDueDate}
            onChange={(e) =>
              setForm({ ...form, paymentDueDate: e.target.value })
            }
          />
          <Input
            label="금액"
            type="number"
            min={0}
            value={form.amount || ""}
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
          />
        </div>
        <Input
          label="내용"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="계좌번호"
            value={form.bankAccount}
            onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
          />
          <Input
            label="예금주"
            value={form.accountHolder}
            onChange={(e) =>
              setForm({ ...form, accountHolder: e.target.value })
            }
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit">{editing ? "저장" : "등록"}</Button>
        </div>
      </form>
    </Modal>
  );
}
