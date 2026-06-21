"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  Ban,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  PackageCheck,
  Pause,
  Play,
  Send,
  Users,
} from "lucide-react";
import { OrderReadyQueue } from "@/components/work-orders/OrderReadyQueue";
import { WorkOrderCostBreakdown } from "@/components/work-orders/WorkOrderCostBreakdown";
import { WorkOrderTimelineDeliverables } from "@/components/work-orders/WorkOrderTimelineDeliverables";
import { ContractProgressPanel } from "@/components/work-orders/ContractProgressPanel";
import { ContractWorkCalendar } from "@/components/experience/ContractWorkCalendar";
import { ExperienceCampaignPanel } from "@/components/experience/ExperienceCampaignPanel";
import { ContractExecutionDashboardPanel } from "@/components/contracts/ContractExecutionDashboardPanel";
import { StaffWorkConfirmPanel } from "@/components/work-orders/StaffWorkConfirmPanel";
import { StaffWorkDeliverCard } from "@/components/work-orders/StaffWorkDeliverCard";
import { useData } from "@/context/DataContext";
import { useWorkOrders } from "@/features/work-orders/useWorkOrders";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import { Button } from "@/components/ui/Button";
import { SaveButton } from "@/components/ui/SaveButton";
import { useSaveMeta } from "@/hooks/useSaveMeta";
import { valuesEqual } from "@/lib/form-dirty";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader, SearchBar } from "@/components/ui/DataTable";
import { Input, Select, Checkbox } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { TabBar } from "@/components/ui/TabBar";
import { formatKRW } from "@/lib/finance";
import {
  applyPartnerUnitPriceToCostLines,
  formatPartnerSelectLabel,
} from "@/lib/partner-utils";
import { getPartnerFilterLabel } from "@/lib/partner-filter-utils";
import { filterExecutionWorkContracts } from "@/lib/contract-access-utils";
import { filterContractsByRole, getUserName } from "@/lib/selectors";
import type { WorkOrder, WorkOrderCostLine, WorkOrderTaskType } from "@/lib/types";
import {
  calcContractWorkProgress,
  buildReferralCostLines,
  calcWorkOrderTotal,
  canSubmitWorkOrderToPartner,
  canWaiveWorkOrderCost,
  emptyCostLines,
  enrichWorkOrder,
  filterWorkOrdersByContract,
  getWorkOrderStageLabel,
  isReferralCommissionWorkOrder,
  sortWorkOrdersTimeline,
  WORK_ORDER_COST_LABELS,
  WORK_ORDER_STAGE_LABELS,
  taskTypeToPartnerCategory,
} from "@/lib/work-order-utils";
import {
  formatContractTargetSummary,
  getContractTargetChannels,
  getWorkOrderTaskLabel,
} from "@/lib/task-channel-utils";
import {
  formatParticipantLabel,
  getContractExperienceCampaigns,
  getExperienceTimelineEntries,
} from "@/lib/experience-campaign-utils";
import { isClientDepositBlockingWork } from "@/lib/client-deposit-utils";
import { canConfirmReferralCommissionPayout } from "@/lib/referral-commission-utils";
import { ClientDepositRequestPanel } from "@/components/client-portal/ClientDepositRequestPanel";
import { ExecutionPeriodFilterBar } from "@/components/work-orders/ExecutionPeriodFilterBar";
import {
  createDefaultExecutionPeriodFilter,
  filterWorkOrdersInExecutionPeriod,
  resolveExecutionPeriod,
  experienceEntryInExecutionPeriod,
  type ExecutionPeriodFilterValue,
} from "@/lib/execution-period-utils";
import { skipPartnerApprovalStages } from "@/lib/partner-workflow-config";
import { getWorkOrderNextActionHint } from "@/lib/staff-daily-workflow-utils";

const STAGE_VARIANT: Record<
  WorkOrder["stage"],
  "default" | "warning" | "success" | "danger" | "info"
> = {
  draft: "default",
  pending_approval: "warning",
  pending_staff_confirm: "warning",
  approved: "info",
  delivered: "warning",
  paid: "success",
  order_ready: "success",
  rejected: "danger",
  cancelled: "default",
  on_hold: "warning",
  postponed: "warning",
};

/** 취소·보류·연기 가능 단계 */
const PAUSABLE_STAGES: WorkOrder["stage"][] = [
  "pending_approval",
  "pending_staff_confirm",
  "approved",
  "delivered",
];

export function ExecutionProgressManager() {
  const data = useData();
  const {
    workOrders,
    ensureContractWorkOrders,
    updateWorkOrder,
    submitWorkOrder,
    confirmWorkOrderPayment,
    cancelWorkOrder,
    holdWorkOrder,
    postponeWorkOrder,
    resumeWorkOrder,
    syncReferralCommissionSchedules,
  } = useWorkOrders();
  const { currentUser } = useRole();
  const searchParams = useSearchParams();
  const { contracts, partners, partnerFilterDefinitions } = data;

  const [tab, setTab] = useState<"timeline" | "order_ready" | "experience">(
    "timeline",
  );
  const [contractId, setContractId] = useState(
    () => searchParams.get("contract") ?? "",
  );
  const [contractSearch, setContractSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState<WorkOrderTaskType | null>(null);
  const [editOrder, setEditOrder] = useState<WorkOrder | null>(null);
  const [editBaseline, setEditBaseline] = useState<{
    partnerId: string;
    costLines: WorkOrderCostLine[];
  } | null>(null);
  const [postponeOrder, setPostponeOrder] = useState<WorkOrder | null>(null);
  const [postponeDate, setPostponeDate] = useState("");
  const [postponeReason, setPostponeReason] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [costLines, setCostLines] = useState<WorkOrderCostLine[]>(emptyCostLines());
  const [noCost, setNoCost] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<ExecutionPeriodFilterValue | null>(
    null,
  );

  const visibleContracts = useMemo(
    () =>
      filterExecutionWorkContracts(
        data,
        currentUser.role,
        currentUser.id,
      ).filter((c) => c.status === "active"),
    [data, currentUser],
  );

  const filteredContracts = useMemo(() => {
    const q = contractSearch.trim().toLowerCase();
    if (!q) return visibleContracts;
    return visibleContracts.filter(
      (c) =>
        c.clientName.toLowerCase().includes(q) ||
        getUserName(data, c.assignedStaffId).toLowerCase().includes(q),
    );
  }, [visibleContracts, contractSearch, data]);

  const selectContracts = useMemo(() => {
    if (!contractId || filteredContracts.some((c) => c.id === contractId)) {
      return filteredContracts;
    }
    const selected = visibleContracts.find((c) => c.id === contractId);
    return selected ? [selected, ...filteredContracts] : filteredContracts;
  }, [filteredContracts, contractId, visibleContracts]);

  useEffect(() => {
    const fromUrl = searchParams.get("contract");
    if (fromUrl && visibleContracts.some((c) => c.id === fromUrl)) {
      setContractId(fromUrl);
    }
  }, [searchParams, visibleContracts]);

  useEffect(() => {
    if (!contractId && selectContracts[0]) {
      setContractId(selectContracts[0].id);
    }
  }, [selectContracts, contractId]);

  useEffect(() => {
    if (contractId) ensureContractWorkOrders(contractId);
  }, [contractId, ensureContractWorkOrders]);

  useEffect(() => {
    setFieldFilter(null);
  }, [contractId]);

  const contract = visibleContracts.find((c) => c.id === contractId);

  useEffect(() => {
    if (!contractId) return;
    syncReferralCommissionSchedules(contractId);
  }, [
    contractId,
    contract?.lastClientDepositDate,
    contract?.clientDepositStatus,
    contract?.monthlyFee,
    contract?.referrerPartnerId,
    contract?.hasReferralPromo,
    syncReferralCommissionSchedules,
  ]);

  useEffect(() => {
    if (contract) {
      setPeriodFilter(createDefaultExecutionPeriodFilter(contract));
    } else {
      setPeriodFilter(null);
    }
  }, [contract?.id, contract?.contractStartDate, contract?.contractEndDate]);

  const resolvedPeriod = useMemo(() => {
    if (!contract || !periodFilter) return null;
    return resolveExecutionPeriod(periodFilter, contract);
  }, [contract, periodFilter]);

  const targetChannels = useMemo(
    () => getContractTargetChannels(data.taskChannels),
    [data.taskChannels],
  );
  const depositBlocked = contract ? isClientDepositBlockingWork(contract) : false;
  const workBlockTitle = "고객사 광고비 입금 확인 후 이용 가능합니다";
  const timeline = useMemo(() => {
    const list = filterWorkOrdersByContract(workOrders, contractId);
    const scoped = resolvedPeriod
      ? filterWorkOrdersInExecutionPeriod(list, resolvedPeriod)
      : list;
    return sortWorkOrdersTimeline(scoped).map((o) => enrichWorkOrder(data, o));
  }, [workOrders, contractId, data, resolvedPeriod]);

  const filteredTimeline = useMemo(() => {
    if (!fieldFilter) return timeline;
    return timeline.filter((item) => item.taskType === fieldFilter);
  }, [timeline, fieldFilter]);

  const experienceTimeline = useMemo(
    () => {
      if (!contractId) return [];
      const entries = getExperienceTimelineEntries(
        data.experienceCampaigns ?? [],
        contractId,
      );
      if (!resolvedPeriod) return entries;
      return entries.filter((entry) => {
        const participant = entry.participant;
        const date =
          participant.experienceDate ||
          participant.postRegisteredAt ||
          participant.registeredAt;
        return experienceEntryInExecutionPeriod(date, resolvedPeriod);
      });
    },
    [data.experienceCampaigns, contractId, resolvedPeriod],
  );

  type ProgressTimelineRow =
    | {
        kind: "work";
        key: string;
        sortKey: string;
        order: (typeof filteredTimeline)[number];
      }
    | {
        kind: "experience";
        key: string;
        sortKey: string;
        entry: (typeof experienceTimeline)[number];
      };

  const progressTimeline = useMemo(() => {
    const rows: ProgressTimelineRow[] = filteredTimeline.map((order) => ({
      kind: "work",
      key: order.id,
      sortKey: order.dueDate,
      order,
    }));

    if (fieldFilter === "experience") {
      for (const entry of experienceTimeline) {
        const participant = entry.participant;
        rows.push({
          kind: "experience",
          key: `exp-${participant.id}`,
          sortKey:
            participant.experienceDate ||
            participant.postRegisteredAt ||
            participant.registeredAt,
          entry,
        });
      }
    }

    return rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredTimeline, experienceTimeline, fieldFilter]);

  const progress = useMemo(
    () =>
      calcContractWorkProgress(
        resolvedPeriod
          ? filterWorkOrdersInExecutionPeriod(
              filterWorkOrdersByContract(workOrders, contractId),
              resolvedPeriod,
            )
          : filterWorkOrdersByContract(workOrders, contractId),
        data.taskChannels,
      ),
    [workOrders, contractId, data.taskChannels, resolvedPeriod],
  );

  const fieldFilterLabel = useMemo(() => {
    if (!fieldFilter) return null;
    return (
      progress.fields.find((field) => field.taskType === fieldFilter)?.label ??
      getWorkOrderTaskLabel(data, fieldFilter)
    );
  }, [fieldFilter, progress.fields, data]);

  const partnerOptions = useMemo(() => {
    if (!editOrder) return [];
    const cat = taskTypeToPartnerCategory(editOrder.taskType, data.taskChannels);
    const active = partners.filter((p) => p.status === "active");

    if (editOrder.taskType === "referral") {
      return active.filter((p) => p.categories.includes(cat));
    }

    // 비용 없음 — 분야 제한 없이 전체 파트너 (기자단·체험단·인플루언서·유튜브 등)
    if (noCost) {
      return [...active].sort((a, b) =>
        a.companyName.localeCompare(b.companyName, "ko"),
      );
    }

    return active.filter((p) => p.categories.includes(cat));
  }, [editOrder, partners, data.taskChannels, noCost]);

  const assignCategory = editOrder
    ? taskTypeToPartnerCategory(editOrder.taskType, data.taskChannels)
    : null;
  const editCanWaiveCost = editOrder
    ? canWaiveWorkOrderCost(editOrder.taskType, data.taskChannels)
    : false;
  const editCostTotal = calcWorkOrderTotal(
    noCost ? emptyCostLines() : costLines,
  );

  function selectPartner(id: string) {
    setPartnerId(id);
    if (noCost) return;
    const partner = partners.find((p) => p.id === id);
    if (partner && editOrder?.taskType !== "referral") {
      setCostLines((prev) => applyPartnerUnitPriceToCostLines(partner, prev));
    }
  }

  function openEdit(order: WorkOrder) {
    const linkedContract = visibleContracts.find((c) => c.id === order.contractId);
    const pid = order.partnerId ?? linkedContract?.referrerPartnerId ?? "";
    const lines =
      order.costLines.some((l) => l.amount > 0)
        ? order.costLines
        : order.taskType === "referral" && linkedContract
          ? buildReferralCostLines(linkedContract.monthlyFee)
          : emptyCostLines();
    setEditOrder(order);
    setPartnerId(pid);
    setCostLines(lines);
    const waive = canWaiveWorkOrderCost(order.taskType, data.taskChannels);
    setNoCost(waive && calcWorkOrderTotal(lines) <= 0 && Boolean(pid));
    setEditBaseline({ partnerId: pid, costLines: lines });
  }

  const editDirty = Boolean(
    editOrder &&
      editBaseline &&
      (partnerId !== editBaseline.partnerId ||
        !valuesEqual(costLines, editBaseline.costLines)),
  );
  const draftSaveMeta = useSaveMeta();

  function saveDraft() {
    if (!editOrder) return;
    updateWorkOrder(editOrder.id, {
      partnerId,
      costLines: noCost ? emptyCostLines() : costLines,
    });
    draftSaveMeta.recordSave();
    setEditOrder(null);
  }

  function sendToPartner() {
    if (!editOrder) return;
    if (isReferralCommissionWorkOrder(editOrder)) {
      alert(
        "리셀러 수수료는 업무 배정 없이 자동 처리됩니다. 고객사 입금 확인 후 10일 뒤 지급 가능합니다.",
      );
      return;
    }
    const payload = {
      partnerId,
      costLines: noCost ? emptyCostLines() : costLines,
    };
    updateWorkOrder(editOrder.id, payload);
    const ok = submitWorkOrder(editOrder.id, currentUser.id);
    if (!ok) {
      if (!partnerId) {
        alert("파트너를 선택해 주세요.");
      } else if (
        !canSubmitWorkOrderToPartner(
          { ...editOrder, ...payload },
          data.taskChannels,
        )
      ) {
        alert("리셀러 업무는 비용 1원 이상 입력이 필요합니다.");
      } else {
        alert(
          skipPartnerApprovalStages()
            ? "업무를 배정할 수 없습니다. 입금 확인 상태를 확인해 주세요."
            : "파트너 승인 요청을 보낼 수 없습니다. 입금 확인 상태를 확인해 주세요.",
        );
      }
    } else setEditOrder(null);
  }

  function markPaid(order: WorkOrder) {
    if (
      isReferralCommissionWorkOrder(order) &&
      !canConfirmReferralCommissionPayout(contract, order)
    ) {
      alert(
        "리셀러 수수료는 고객사 입금 확인 후 10일이 지나야 지급할 수 있습니다.",
      );
      return;
    }
    const ok = confirmWorkOrderPayment(order.id, currentUser.id);
    if (!ok) {
      alert("완료 처리할 수 없습니다.");
      return;
    }
  }

  function handleCancel(order: WorkOrder) {
    const reason = window.prompt("취소 사유 (선택)");
    if (reason === null) return;
    const ok = cancelWorkOrder(order.id, reason || undefined);
    if (!ok) alert("취소할 수 없는 단계입니다.");
  }

  function handleHold(order: WorkOrder) {
    const reason = window.prompt("보류 사유 (선택)");
    if (reason === null) return;
    const ok = holdWorkOrder(order.id, reason || undefined);
    if (!ok) alert("보류할 수 없는 단계입니다.");
  }

  function openPostpone(order: WorkOrder) {
    setPostponeOrder(order);
    setPostponeDate(order.dueDate);
    setPostponeReason("");
  }

  function confirmPostpone() {
    if (!postponeOrder || !postponeDate.trim()) return;
    const ok = postponeWorkOrder(
      postponeOrder.id,
      postponeDate.trim(),
      postponeReason.trim() || undefined,
    );
    if (!ok) alert("연기할 수 없는 단계입니다.");
    else setPostponeOrder(null);
  }

  function handleResume(order: WorkOrder) {
    const ok = resumeWorkOrder(order.id);
    if (!ok) alert("재개할 수 없는 단계입니다.");
  }

  const contractCampaigns = useMemo(
    () =>
      contractId
        ? getContractExperienceCampaigns(
            data.experienceCampaigns ?? [],
            contractId,
          )
        : [],
    [data.experienceCampaigns, contractId],
  );

  return (
    <>
      <PageHeader
        title="실행 진행"
        description="계약 KPI · 실행 목록 · 업무 타임라인 · 파트너 배정"
        action={
          contract && (
            <Link href={`/contracts/${contract.id}`}>
              <Button variant="secondary" size="sm">
                계약 상세
              </Button>
            </Link>
          )
        }
      />

      <TabBar
        className="mb-4"
        active={tab}
        onChange={setTab}
        items={[
          {
            id: "timeline",
            label: "진행 타임라인",
            shortLabel: "타임라인",
            icon: ClipboardList,
            accent: "emerald",
          },
          {
            id: "experience",
            label: "체험단 모집",
            shortLabel: "체험단",
            icon: Users,
            accent: "amber",
          },
          {
            id: "order_ready",
            label: "오더준",
            shortLabel: "오더준",
            icon: PackageCheck,
            accent: "cyan",
          },
        ]}
      />

      {tab === "order_ready" ? (
        <OrderReadyQueue />
      ) : tab === "experience" ? (
        <>
          <Card className="mb-4 p-4">
            <Select
              label="계약 업체"
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
            >
              {selectContracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientName}
                </option>
              ))}
            </Select>
          </Card>
          {contractId ? (
            <div className="grid gap-6 xl:grid-cols-2">
              {contract && depositBlocked && (
                <ClientDepositRequestPanel
                  contract={contract}
                  fundBudget={data.fundBudget}
                  variant="staff"
                  className="xl:col-span-2"
                />
              )}
              <ExperienceCampaignPanel
                contractId={contractId}
                mode="staff"
                readOnly={depositBlocked}
              />
              <ContractWorkCalendar
                data={data}
                contractId={contractId}
                experienceCampaigns={contractCampaigns}
              />
            </div>
          ) : (
            <Card className="py-12 text-center text-sm text-zinc-500">
              계약 업체를 선택해 주세요.
            </Card>
          )}
        </>
      ) : (
        <>
          <Card className="mb-4 p-4">
            <div className="space-y-3">
              <div className="w-full [&_input]:max-w-none">
                <SearchBar
                  value={contractSearch}
                  onChange={setContractSearch}
                  placeholder="업체명 · 담당자 검색"
                />
              </div>
              <Select
                label="계약 업체"
                value={contractId}
                onChange={(e) => setContractId(e.target.value)}
                disabled={selectContracts.length === 0}
              >
                {selectContracts.length === 0 ? (
                  <option value="">검색 결과 없음</option>
                ) : (
                  selectContracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientName} ·{" "}
                      {targetChannels
                        .map((channel) =>
                          `${channel.label}${formatContractTargetSummary(c, channel)}`,
                        )
                        .join(" ")}
                    </option>
                  ))
                )}
              </Select>
            </div>
            {contractSearch.trim() && (
              <p className="mt-2 text-xs text-zinc-600">
                검색 결과 {filteredContracts.length}곳 / 전체{" "}
                {visibleContracts.length}곳
              </p>
            )}
            {contract && (
              <p className="mt-2 text-xs text-zinc-500">
                {resolvedPeriod?.label ?? "계약기간"} · 업무 {timeline.length}건
                · 체험단 {experienceTimeline.length}명
              </p>
            )}
            {contract && (
              <div className="mt-3 border-t border-zinc-800 pt-3">
                <Link href={`/contracts/${contract.id}/client-portal`}>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 border-cyan-500/25 text-cyan-300 hover:border-cyan-500/40 hover:text-cyan-200"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    고객사 포털 대시보드
                  </Button>
                </Link>
              </div>
            )}
          </Card>

          {contract && periodFilter && resolvedPeriod && (
            <ExecutionPeriodFilterBar
              className="mb-4"
              value={periodFilter}
              onChange={setPeriodFilter}
              resolved={resolvedPeriod}
            />
          )}

          {contract && depositBlocked && (
            <ClientDepositRequestPanel
              contract={contract}
              fundBudget={data.fundBudget}
              variant="staff"
              className="mb-4"
            />
          )}

          {contract && (
            <ContractExecutionDashboardPanel
              contract={contract}
              period={resolvedPeriod ?? undefined}
              className="mb-4"
            />
          )}

          {contract && progress.total > 0 && (
            <ContractProgressPanel
              clientName={contract.clientName}
              progress={progress}
              selectedField={fieldFilter}
              onFieldSelect={setFieldFilter}
            />
          )}

          {!skipPartnerApprovalStages() && (
            <StaffWorkConfirmPanel className="mb-4" />
          )}

          {skipPartnerApprovalStages() &&
            contractId &&
            progressTimeline.some(
              (row) =>
                row.kind === "work" &&
                row.order.stage === "approved" &&
                !isReferralCommissionWorkOrder(row.order),
            ) && (
              <Card className="mb-4" glow>
                <CardHeader
                  title="결과 등록 (담당)"
                  subtitle="집행 업무는 결과 URL · 리셀러 수수료는 계약 기준 처리"
                />
                <div className="space-y-3 px-4 pb-4">
                  {progressTimeline
                    .filter(
                      (row): row is Extract<typeof row, { kind: "work" }> =>
                        row.kind === "work" &&
                        row.order.stage === "approved" &&
                        !isReferralCommissionWorkOrder(row.order),
                    )
                    .map((row) => (
                      <StaffWorkDeliverCard
                        key={row.order.id}
                        data={data}
                        order={row.order}
                      />
                    ))}
                </div>
              </Card>
            )}

          <Card className="mb-4" glow>
            <CardHeader
              title="업무 타임라인 (건당)"
              subtitle="건당 업무 · 노출채널 · 키워드 · 피드백 링크 · 파트너·비용 · 오더준 시 집행 실행에 합산"
            />
          </Card>

          {fieldFilter && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-xs">
              <span className="text-zinc-400">
                필터:{" "}
                <span className="font-medium text-zinc-200">
                  {fieldFilterLabel}
                </span>{" "}
                · {filteredTimeline.length}건
              </span>
              <button
                type="button"
                onClick={() => setFieldFilter(null)}
                className="text-emerald-400 hover:underline"
              >
                전체 보기
              </button>
            </div>
          )}

          <div className="relative space-y-0 pl-6 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-zinc-800">
            {progressTimeline.map((row) =>
              row.kind === "work" ? (
                <div key={row.key} className="relative pb-6 last:pb-0">
                  <div className="absolute -left-6 top-1.5 h-[9px] w-[9px] rounded-full border-2 border-emerald-500 bg-zinc-950" />
                  <Card className="ml-2">
                    <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-zinc-100">
                            {row.order.title}
                          </span>
                          <TaskChannelBadge
                            data={data}
                            taskType={row.order.taskType}
                          />
                          <Badge variant={STAGE_VARIANT[row.order.stage]}>
                            {getWorkOrderStageLabel(row.order, contract)}
                          </Badge>
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                          <Calendar className="h-3 w-3" />
                          마감 {row.order.dueDate}
                        </p>
                        {(() => {
                          const nextHint = getWorkOrderNextActionHint(
                            row.order,
                            contract,
                          );
                          return nextHint ? (
                            <p className="mt-1 text-xs text-cyan-400/90">
                              {nextHint}
                            </p>
                          ) : null;
                        })()}
                        {row.order.partnerName !== "-" && (
                          <p className="mt-1 text-xs text-cyan-400/90">
                            파트너 {row.order.partnerName}
                            {row.order.totalAmount > 0 &&
                              ` · ${formatKRW(row.order.totalAmount)}`}
                            {row.order.totalAmount <= 0 &&
                              row.order.partnerId && (
                                <span className="text-zinc-500">
                                  {" "}
                                  · 비용 없음
                                </span>
                              )}
                          </p>
                        )}
                        {row.order.costLines.some((l) => l.amount > 0) && (
                          <WorkOrderCostBreakdown
                            lines={row.order.costLines}
                            align="start"
                            className="mt-1"
                            variant={
                              isReferralCommissionWorkOrder(row.order)
                                ? "referral"
                                : "default"
                            }
                          />
                        )}
                        <WorkOrderTimelineDeliverables order={row.order} />
                        {row.order.rejectedReason && (
                          <p className="mt-1 text-xs text-rose-400">
                            반려: {row.order.rejectedReason}
                          </p>
                        )}
                        {row.order.stage === "postponed" &&
                          row.order.postponedDueDate && (
                            <p className="mt-1 text-xs text-orange-400">
                              연기 마감 {row.order.postponedDueDate}
                            </p>
                          )}
                        {(row.order.stage === "cancelled" ||
                          row.order.stage === "on_hold" ||
                          row.order.stage === "postponed") &&
                          row.order.memo && (
                            <p className="mt-1 text-xs text-zinc-500">
                              {row.order.memo}
                            </p>
                          )}
                        {row.order.partnerApprovalNote && (
                          <p className="mt-1 text-xs text-violet-300">
                            파트너 피드백: {row.order.partnerApprovalNote}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {["draft", "rejected"].includes(row.order.stage) &&
                          !isReferralCommissionWorkOrder(row.order) && (
                          <Button
                            size="sm"
                            disabled={depositBlocked}
                            title={depositBlocked ? workBlockTitle : undefined}
                            onClick={() => openEdit(row.order)}
                          >
                            파트너·비용 설정
                          </Button>
                        )}
                        {row.order.stage === "delivered" && (
                          <Button
                            size="sm"
                            disabled={
                              depositBlocked ||
                              (isReferralCommissionWorkOrder(row.order) &&
                                !canConfirmReferralCommissionPayout(
                                  contract,
                                  row.order,
                                ))
                            }
                            title={
                              depositBlocked
                                ? workBlockTitle
                                : isReferralCommissionWorkOrder(row.order) &&
                                    !canConfirmReferralCommissionPayout(
                                      contract,
                                      row.order,
                                    )
                                  ? "고객사 입금 확인 후 10일 경과 시 지급 가능"
                                  : undefined
                            }
                            onClick={() => markPaid(row.order)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {isReferralCommissionWorkOrder(row.order)
                              ? "리셀러 지급 확인"
                              : row.order.totalAmount > 0
                                ? "입금 확인"
                                : "완료 확인"}
                          </Button>
                        )}
                        {row.order.stage === "order_ready" && (
                          <Badge variant="success">오더준 반영됨</Badge>
                        )}
                        {PAUSABLE_STAGES.includes(row.order.stage) && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={depositBlocked}
                              title={depositBlocked ? workBlockTitle : undefined}
                              onClick={() => handleHold(row.order)}
                            >
                              <Pause className="h-3.5 w-3.5" />
                              보류
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={depositBlocked}
                              title={depositBlocked ? workBlockTitle : undefined}
                              onClick={() => openPostpone(row.order)}
                            >
                              <Clock className="h-3.5 w-3.5" />
                              연기
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={depositBlocked}
                              title={depositBlocked ? workBlockTitle : undefined}
                              onClick={() => handleCancel(row.order)}
                            >
                              <Ban className="h-3.5 w-3.5" />
                              취소
                            </Button>
                          </>
                        )}
                        {(row.order.stage === "on_hold" ||
                          row.order.stage === "postponed") && (
                          <Button
                            size="sm"
                            disabled={depositBlocked}
                            title={depositBlocked ? workBlockTitle : undefined}
                            onClick={() => handleResume(row.order)}
                          >
                            <Play className="h-3.5 w-3.5" />
                            재개
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              ) : (
                <div key={row.key} className="relative pb-6 last:pb-0">
                  <div className="absolute -left-6 top-1.5 h-[9px] w-[9px] rounded-full border-2 border-amber-500 bg-zinc-950" />
                  <Card className="ml-2 border-amber-500/20">
                    <div className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-zinc-100">
                          {row.entry.campaignTitle}
                        </span>
                        <Badge variant="warning">체험단</Badge>
                      </div>
                      <p className="mt-1 text-sm text-zinc-200">
                        {formatParticipantLabel(row.entry.participant)}
                      </p>
                      <div className="mt-2 grid gap-1 text-xs text-zinc-500 sm:grid-cols-2">
                        {(row.entry.participant.blogName ||
                          row.entry.participant.snsHandle) && (
                          <p>
                            블로그{" "}
                            {row.entry.participant.blogName ||
                              row.entry.participant.snsHandle}
                          </p>
                        )}
                        {row.entry.participant.contact && (
                          <p>연락처 {row.entry.participant.contact}</p>
                        )}
                        {row.entry.participant.experienceDate && (
                          <p className="flex items-center gap-1 text-amber-200/80">
                            <Calendar className="h-3 w-3" />
                            체험일 {row.entry.participant.experienceDate}
                          </p>
                        )}
                        <p>
                          인원 {row.entry.participant.headcount ?? 1}명 · 접수{" "}
                          {row.entry.participant.registeredAt}
                        </p>
                        {row.entry.participant.memo && (
                          <p className="sm:col-span-2">
                            메모 {row.entry.participant.memo}
                          </p>
                        )}
                      </div>
                      {row.entry.participant.postUrl && (
                        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs">
                          <p className="text-amber-200/90">포스팅</p>
                          <a
                            href={row.entry.participant.postUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-amber-300 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {row.entry.participant.postUrl}
                          </a>
                          {row.entry.participant.postRegisteredAt && (
                            <p className="mt-1 text-zinc-500">
                              등록일 {row.entry.participant.postRegisteredAt}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              ),
            )}
            {progressTimeline.length === 0 && (
              <p className="py-12 text-center text-sm text-zinc-500">
                {fieldFilter
                  ? "해당 분야의 업무가 없습니다"
                  : "계약을 선택하면 업무·체험단 타임라인이 표시됩니다"}
              </p>
            )}
          </div>
        </>
      )}

      <Modal
        open={!!editOrder}
        onClose={() => setEditOrder(null)}
        title={editOrder?.title ?? "업무 설정"}
        size="lg"
      >
        {editOrder && (
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
              <p className="text-[11px] text-zinc-600">업무 분야</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <TaskChannelBadge data={data} taskType={editOrder.taskType} />
                <span className="text-sm text-zinc-300">
                  {getWorkOrderTaskLabel(data, editOrder.taskType)}
                </span>
              </div>
            </div>

            {editOrder.taskType === "referral" && (
              <p className="rounded-lg border border-sky-400/35 bg-sky-500/10 px-3 py-2 text-xs text-sky-100/90">
                리셀러 업무 · 월 광고비 10% 수수료 (계약에 연결된 리셀러
                파트너 기본 배정)
              </p>
            )}

            {editOrder.taskType !== "referral" && assignCategory && !noCost && (
              <p className="text-xs text-zinc-500">
                {getPartnerFilterLabel(partnerFilterDefinitions, assignCategory)}{" "}
                분야 파트너사만
                표시 · 선택 시 참고 단가가 원고료에 반영됩니다
              </p>
            )}

            {editOrder.taskType !== "referral" && noCost && (
              <p className="text-xs text-zinc-500">
                비용 없음 · 기자단·체험단·인플루언서·유튜브 등 전체 파트너 표시
                (분야 제한 없음)
              </p>
            )}

            <Select
              label={
                editOrder.taskType === "referral" ? "리셀러 *" : "파트너사 *"
              }
              value={partnerId}
              onChange={(e) => selectPartner(e.target.value)}
            >
              <option value="">선택</option>
              {partnerOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatPartnerSelectLabel(
                    p,
                    noCost ? undefined : (assignCategory ?? undefined),
                    partnerFilterDefinitions,
                  )}
                </option>
              ))}
            </Select>

            {editCanWaiveCost && (
              <Checkbox
                label="비용 없음 (체험단·기자단·인플루언서 등 — 파트너만 배정)"
                checked={noCost}
                onChange={(checked) => {
                  setNoCost(checked);
                  if (checked) {
                    setCostLines(emptyCostLines());
                  } else if (editOrder && partnerId) {
                    const cat = taskTypeToPartnerCategory(
                      editOrder.taskType,
                      data.taskChannels,
                    );
                    const partner = partners.find((p) => p.id === partnerId);
                    if (partner && !partner.categories.includes(cat)) {
                      setPartnerId("");
                    }
                  }
                }}
              />
            )}

            <div>
              <p className="mb-2 text-xs font-medium text-zinc-400">
                비용 항목 (원)
                {noCost && (
                  <span className="ml-2 font-normal text-zinc-500">
                    · 비용 없음으로 처리됩니다
                  </span>
                )}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {costLines.map((line, idx) => (
                  <Input
                    key={line.type}
                    label={WORK_ORDER_COST_LABELS[line.type]}
                    type="number"
                    min={0}
                    disabled={noCost}
                    value={noCost ? "" : line.amount || ""}
                    onChange={(e) => {
                      if (noCost) return;
                      const next = [...costLines];
                      next[idx] = {
                        ...line,
                        amount: Number(e.target.value) || 0,
                      };
                      setCostLines(next);
                      setNoCost(false);
                    }}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-emerald-400">
                {noCost ? (
                  <span className="text-zinc-400">합계 비용 없음</span>
                ) : (
                  <>합계 {formatKRW(editCostTotal)}</>
                )}
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
              <Button variant="secondary" onClick={() => setEditOrder(null)}>
                취소
              </Button>
              <SaveButton
                variant="secondary"
                dirty={editDirty}
                disabled={depositBlocked}
                title={depositBlocked ? workBlockTitle : undefined}
                onClick={saveDraft}
                savedAt={draftSaveMeta.savedAt}
                savedBy={draftSaveMeta.savedBy}
              >
                임시 저장
              </SaveButton>
              <Button
                disabled={depositBlocked}
                title={depositBlocked ? workBlockTitle : undefined}
                onClick={sendToPartner}
              >
                <Send className="h-3.5 w-3.5" />
                {skipPartnerApprovalStages() ? "업무 배정" : "파트너 승인 요청"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!postponeOrder}
        onClose={() => setPostponeOrder(null)}
        title={postponeOrder?.title ?? "일정 연기"}
        size="sm"
      >
        {postponeOrder && (
          <div className="space-y-4">
            <Input
              label="변경 마감일"
              type="date"
              value={postponeDate}
              onChange={(e) => setPostponeDate(e.target.value)}
            />
            <Input
              label="연기 사유 (선택)"
              value={postponeReason}
              onChange={(e) => setPostponeReason(e.target.value)}
              placeholder="일정 조율 · 고객 요청 등"
            />
            <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
              <Button variant="secondary" onClick={() => setPostponeOrder(null)}>
                닫기
              </Button>
              <Button onClick={confirmPostpone} disabled={!postponeDate.trim()}>
                <Clock className="h-3.5 w-3.5" />
                연기 적용
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
