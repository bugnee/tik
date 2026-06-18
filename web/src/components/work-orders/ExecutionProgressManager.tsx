"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  PackageCheck,
  Send,
  Users,
} from "lucide-react";
import { OrderReadyQueue } from "@/components/work-orders/OrderReadyQueue";
import { ContractProgressPanel } from "@/components/work-orders/ContractProgressPanel";
import { ContractWorkCalendar } from "@/components/experience/ContractWorkCalendar";
import { ExperienceCampaignPanel } from "@/components/experience/ExperienceCampaignPanel";
import { DashboardWorkStatusPanel } from "@/components/dashboard/DashboardWorkStatusPanel";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader, SearchBar } from "@/components/ui/DataTable";
import { Input, Select } from "@/components/ui/FormFields";
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
  emptyCostLines,
  enrichWorkOrder,
  filterWorkOrdersByContract,
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

const STAGE_VARIANT: Record<
  WorkOrder["stage"],
  "default" | "warning" | "success" | "danger" | "info"
> = {
  draft: "default",
  pending_approval: "warning",
  approved: "info",
  delivered: "warning",
  paid: "success",
  order_ready: "success",
  rejected: "danger",
};

export function ExecutionProgressManager() {
  const data = useData();
  const { currentUser } = useRole();
  const {
    contracts,
    partners,
    partnerFilterDefinitions,
    workOrders,
    ensureContractWorkOrders,
    updateWorkOrder,
    submitWorkOrder,
    confirmWorkOrderPayment,
  } = data;

  const [tab, setTab] = useState<"timeline" | "order_ready" | "experience">(
    "timeline",
  );
  const [contractId, setContractId] = useState("");
  const [contractSearch, setContractSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState<WorkOrderTaskType | null>(null);
  const [editOrder, setEditOrder] = useState<WorkOrder | null>(null);
  const [partnerId, setPartnerId] = useState("");
  const [costLines, setCostLines] = useState<WorkOrderCostLine[]>(emptyCostLines());

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

  const targetChannels = useMemo(
    () => getContractTargetChannels(data.taskChannels),
    [data.taskChannels],
  );

  const contract = visibleContracts.find((c) => c.id === contractId);
  const timeline = useMemo(() => {
    const list = filterWorkOrdersByContract(workOrders, contractId);
    return sortWorkOrdersTimeline(list).map((o) => enrichWorkOrder(data, o));
  }, [workOrders, contractId, data]);

  const filteredTimeline = useMemo(() => {
    if (!fieldFilter) return timeline;
    return timeline.filter((item) => item.taskType === fieldFilter);
  }, [timeline, fieldFilter]);

  const experienceTimeline = useMemo(
    () =>
      contractId
        ? getExperienceTimelineEntries(data.experienceCampaigns ?? [], contractId)
        : [],
    [data.experienceCampaigns, contractId],
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

    if (!fieldFilter || fieldFilter === "experience") {
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
        filterWorkOrdersByContract(workOrders, contractId),
        data.taskChannels,
      ),
    [workOrders, contractId, data.taskChannels],
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
    return partners.filter(
      (p) => p.status === "active" && p.categories.includes(cat),
    );
  }, [editOrder, partners, data.taskChannels]);

  const assignCategory = editOrder
    ? taskTypeToPartnerCategory(editOrder.taskType, data.taskChannels)
    : null;

  function selectPartner(id: string) {
    setPartnerId(id);
    const partner = partners.find((p) => p.id === id);
    if (partner && editOrder?.taskType !== "referral") {
      setCostLines((prev) => applyPartnerUnitPriceToCostLines(partner, prev));
    }
  }

  function openEdit(order: WorkOrder) {
    const linkedContract = visibleContracts.find((c) => c.id === order.contractId);
    setEditOrder(order);
    setPartnerId(order.partnerId ?? linkedContract?.referrerPartnerId ?? "");
    setCostLines(
      order.costLines.some((l) => l.amount > 0)
        ? order.costLines
        : order.taskType === "referral" && linkedContract
          ? buildReferralCostLines(linkedContract.monthlyFee)
          : emptyCostLines(),
    );
  }

  function saveDraft() {
    if (!editOrder) return;
    updateWorkOrder(editOrder.id, { partnerId, costLines });
    setEditOrder(null);
  }

  function sendToPartner() {
    if (!editOrder) return;
    updateWorkOrder(editOrder.id, { partnerId, costLines });
    const ok = submitWorkOrder(editOrder.id, currentUser.id);
    if (!ok) alert("파트너·비용(1원 이상)을 확인 후 전송하세요.");
    else setEditOrder(null);
  }

  function markPaid(orderId: string) {
    const ok = confirmWorkOrderPayment(orderId, currentUser.id);
    if (!ok) alert("입금 확인할 수 없습니다.");
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
        description="계약 조건 기준 업무 타임라인 · 파트너 배정 · 원고료/촬영비/출장비/기타"
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
              <ExperienceCampaignPanel contractId={contractId} mode="staff" />
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
                계약기간 {contract.contractStartDate} ~{" "}
                {contract.contractEndDate} · 업무 {timeline.length}건 · 체험단{" "}
                {experienceTimeline.length}명
              </p>
            )}
          </Card>

          <DashboardWorkStatusPanel className="mb-4" />

          {contract && progress.total > 0 && (
            <ContractProgressPanel
              clientName={contract.clientName}
              progress={progress}
              selectedField={fieldFilter}
              onFieldSelect={setFieldFilter}
            />
          )}

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
                            {WORK_ORDER_STAGE_LABELS[row.order.stage]}
                          </Badge>
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                          <Calendar className="h-3 w-3" />
                          마감 {row.order.dueDate}
                        </p>
                        {row.order.partnerName !== "-" && (
                          <p className="mt-1 text-xs text-cyan-400/90">
                            파트너 {row.order.partnerName}
                            {row.order.totalAmount > 0 &&
                              ` · ${formatKRW(row.order.totalAmount)}`}
                          </p>
                        )}
                        {row.order.costSummary && (
                          <p className="mt-0.5 text-xs text-zinc-600">
                            {row.order.costSummary}
                          </p>
                        )}
                        {row.order.rejectedReason && (
                          <p className="mt-1 text-xs text-rose-400">
                            반려: {row.order.rejectedReason}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {["draft", "rejected"].includes(row.order.stage) && (
                          <Button size="sm" onClick={() => openEdit(row.order)}>
                            파트너·비용 설정
                          </Button>
                        )}
                        {row.order.stage === "delivered" && (
                          <Button size="sm" onClick={() => markPaid(row.order.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            입금 확인
                          </Button>
                        )}
                        {row.order.stage === "order_ready" && (
                          <Badge variant="success">오더준 반영됨</Badge>
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
              <p className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-zinc-400">
                리셀러 업무 · 월 광고비 10% 수수료 (계약에 연결된 리셀러
                파트너 기본 배정)
              </p>
            )}

            {editOrder.taskType !== "referral" && assignCategory && (
              <p className="text-xs text-zinc-500">
                {getPartnerFilterLabel(partnerFilterDefinitions, assignCategory)}{" "}
                분야 파트너사만
                표시 · 선택 시 참고 단가가 원고료에 반영됩니다
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
                    assignCategory ?? undefined,
                    partnerFilterDefinitions,
                  )}
                </option>
              ))}
            </Select>

            <div>
              <p className="mb-2 text-xs font-medium text-zinc-400">
                비용 항목 (원)
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {costLines.map((line, idx) => (
                  <Input
                    key={line.type}
                    label={WORK_ORDER_COST_LABELS[line.type]}
                    type="number"
                    min={0}
                    value={line.amount || ""}
                    onChange={(e) => {
                      const next = [...costLines];
                      next[idx] = {
                        ...line,
                        amount: Number(e.target.value) || 0,
                      };
                      setCostLines(next);
                    }}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-emerald-400">
                합계{" "}
                {formatKRW(
                  costLines.reduce((s, l) => s + (l.amount || 0), 0),
                )}
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
              <Button variant="secondary" onClick={() => setEditOrder(null)}>
                취소
              </Button>
              <Button variant="secondary" onClick={saveDraft}>
                임시 저장
              </Button>
              <Button onClick={sendToPartner}>
                <Send className="h-3.5 w-3.5" />
                파트너 승인 요청
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
