"use client";

import { Building2, Calendar, ChevronRight, Pencil, RefreshCw, User } from "lucide-react";
import { BonusPayDateLine } from "@/components/bonus/BonusPayScheduleNotice";
import { ClientLinksPanel } from "@/components/contracts/ClientLinksPanel";
import { ContractDetailRow } from "@/components/contracts/detail/ContractDetailRow";
import type { ContractDetailTab } from "@/components/contracts/detail/constants";
import { PlaceCredentialsPanel } from "@/components/place-qa/PlaceCredentialsPanel";
import { QaConversationPanel } from "@/components/place-qa/QaConversationPanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SaveButton } from "@/components/ui/SaveButton";
import { useSaveMeta } from "@/hooks/useSaveMeta";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/FormFields";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import { useData } from "@/context/DataContext";
import { CLIENT_BUSINESS_INFO_FIELDS } from "@/lib/client-business-info-utils";
import { isLeaderManagedContract } from "@/lib/contract-access-utils";
import { getEligibilityMessage } from "@/lib/bonus-utils";
import { getValidPostLinks } from "@/lib/execution-utils";
import { getPartnerName } from "@/lib/partner-utils";
import { getPlaceCredentialsForContract } from "@/lib/place-qa-utils";
import type { getContractActivity } from "@/lib/selectors";
import { getTeamName, getUserName } from "@/lib/selectors";
import type { AppData, ClientLinksInput, Contract, Execution } from "@/lib/types";
import { CONTRACT_STATUS_LABELS, EXECUTION_STATUS_LABELS } from "@/lib/types";
import {
  getContractChannelProgress,
  formatContractTargetSummary,
  TASK_CHANNEL_BADGE_CLASSES,
} from "@/lib/task-channel-utils";
import type { TaskChannelDefinition } from "@/lib/types";
import { cn } from "@/lib/cn";

type ActivityItem = ReturnType<typeof getContractActivity>[number];

export function ContractOverviewTab({
  data,
  contract,
  contractId,
  canViewFinancials,
  canEditTerms,
  depositDraft,
  onDepositDraftChange,
  depositDirty,
  onSaveDeposit,
  scheduledBonusPayDate,
  scheduledBonusClosingDate,
  completionRate,
  progressChannels,
  targetChannels,
  activity,
  executions,
  selectedExecutionId,
  onSelectExecution,
  onOpenExecEdit,
  onNavigateTab,
  onUpdateClientLinks,
  onOpenTermsModal,
  expectedPct,
}: {
  data: AppData;
  contract: Contract;
  contractId: string;
  canViewFinancials: boolean;
  canEditTerms: boolean;
  depositDraft: string;
  onDepositDraftChange: (value: string) => void;
  depositDirty: boolean;
  onSaveDeposit: () => void;
  scheduledBonusPayDate?: string;
  scheduledBonusClosingDate?: string;
  completionRate: number;
  progressChannels: TaskChannelDefinition[];
  targetChannels: TaskChannelDefinition[];
  activity: ActivityItem[];
  executions: Execution[];
  selectedExecutionId: string | null;
  onSelectExecution: (id: string | null) => void;
  onOpenExecEdit: (e: Execution) => void;
  onNavigateTab: (tab: ContractDetailTab) => void;
  onUpdateClientLinks: (input: ClientLinksInput) => void;
  onOpenTermsModal: (mode: "amend" | "renewal") => void;
  expectedPct: number | null;
}) {
  const saveMeta = useSaveMeta();

  function handleSaveDeposit() {
    const date = depositDraft || contract.lastClientDepositDate;
    if (!date) {
      onSaveDeposit();
      return;
    }
    onSaveDeposit();
    saveMeta.recordSave();
  }

  return (
    <>
      {canViewFinancials && contract.status === "active" && (
        <Card className="border-cyan-500/15">
          <CardHeader
            title="업체 입금일 등록"
            subtitle="15일 마감 · 25일 급여 합산(세전)"
          />
          <div className="flex flex-wrap items-end gap-3 px-4 pb-4">
            <Input
              label="입금일"
              type="date"
              value={depositDraft || contract.lastClientDepositDate || ""}
              onChange={(e) => onDepositDraftChange(e.target.value)}
              className="max-w-xs"
            />
            <SaveButton
              size="sm"
              dirty={depositDirty}
              onClick={handleSaveDeposit}
              savedAt={saveMeta.savedAt}
              savedBy={saveMeta.savedBy}
            >
              저장
            </SaveButton>
            {contract.lastClientDepositDate && scheduledBonusPayDate && (
              <BonusPayDateLine
                clientDepositDate={contract.lastClientDepositDate}
                closingDeadline={scheduledBonusClosingDate}
                scheduledPayDate={scheduledBonusPayDate}
              />
            )}
          </div>
        </Card>
      )}

      <QaConversationPanel contractId={contract.id} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="min-w-0 space-y-6">
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
                  glossaryLabel
                  color={index % 2 === 0 ? "cyan" : "amber"}
                />
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="진행 타임라인"
              subtitle="실행 · 원가 · 연장 — 클릭하여 상세"
              action={
                activity.length > 0 ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onNavigateTab("executions")}
                  >
                    전체 실행
                  </Button>
                ) : undefined
              }
            />
            {activity.length === 0 ? (
              <EmptyState message="아직 진행 내역이 없습니다" />
            ) : (
              <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
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
                          onSelectExecution(
                            selectedExecutionId === item.id ? null : item.id,
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
                        <ActivityKindBadge kind={item.kind} />
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
                          execution={
                            executions.find((e) => e.id === item.id)!
                          }
                          onEdit={() => {
                            const exec = executions.find(
                              (e) => e.id === item.id,
                            );
                            if (exec) onOpenExecEdit(exec);
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

        <aside className="space-y-6">
          <Card>
            <CardHeader
              title="계약 정보"
              action={
                canEditTerms ? (
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onOpenTermsModal("amend")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onOpenTermsModal("renewal")}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : undefined
              }
            />
            <dl className="space-y-1 text-sm">
              <ContractDetailRow
                icon={Building2}
                label="상호명"
                value={contract.clientName}
                tone="default"
              />
              {contract.companyName && (
                <ContractDetailRow
                  label="회사명"
                  value={contract.companyName}
                  tone="info"
                />
              )}
              {CLIENT_BUSINESS_INFO_FIELDS.map((field) => {
                const value = contract[field.key];
                if (!value) return null;
                return (
                  <ContractDetailRow
                    key={field.key}
                    label={field.label}
                    value={value}
                    tone="info"
                  />
                );
              })}
              <ContractDetailRow
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
              <ContractDetailRow
                icon={Calendar}
                label="계약 기간"
                value={`${contract.contractStartDate} ~ ${contract.contractEndDate}`}
                tone="muted"
              />
              <ContractDetailRow
                label="상태"
                value={CONTRACT_STATUS_LABELS[contract.status]}
                tone={contract.status === "active" ? "success" : "muted"}
              />
              <ContractDetailRow
                label="플레이스세팅"
                value={contract.hasPlaceSetting ? "포함" : "미포함"}
                tone={contract.hasPlaceSetting ? "success" : "muted"}
                labelGlossary="플레이스"
              />
              <ContractDetailRow
                label="연장 계약"
                value={
                  contract.isExtension
                    ? `예 (${expectedPct ?? "-"}% · ${getEligibilityMessage(contract)})`
                    : "아니오"
                }
                tone={contract.isExtension ? "success" : "muted"}
              />
              {contract.hasReferralPromo && (
                <ContractDetailRow
                  label="리셀러"
                  value={getPartnerName(
                    data.partners,
                    contract.referrerPartnerId,
                  )}
                  pillClassName={TASK_CHANNEL_BADGE_CLASSES.rose}
                />
              )}
            </dl>
            {targetChannels.length > 0 && (
              <div className="mt-4 border-t border-zinc-800 pt-4">
                <p className="mb-2 text-xs font-medium text-zinc-500">
                  집행 채널 · 월 목표
                </p>
                <div className="flex flex-wrap gap-2">
                  {targetChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-2.5 py-1.5"
                    >
                      <TaskChannelBadge data={data} taskType={channel.id} />
                      <span className="text-xs font-medium text-zinc-300">
                        {formatContractTargetSummary(contract, channel)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <ClientLinksPanel
            contract={contract}
            onSave={(input) => onUpdateClientLinks(input)}
          />

          {(contract.hasPlaceSetting ||
            getPlaceCredentialsForContract(data, contract.id)) && (
            <PlaceCredentialsPanel contractId={contract.id} />
          )}
        </aside>
      </div>
    </>
  );
}

function ActivityKindBadge({ kind }: { kind: ActivityItem["kind"] }) {
  const map = {
    execution: { label: "실행", variant: "info" as const },
    expense: { label: "원가", variant: "warning" as const },
    extension: { label: "연장", variant: "success" as const },
  };
  const { label, variant } = map[kind];
  return <Badge variant={variant}>{label}</Badge>;
}

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
          <TimelineDetailField label="마감일" value={execution.dueDate || "-"} />
          <TimelineDetailField
            label="완료일"
            value={execution.completedDate || "-"}
          />
          <TimelineDetailField
            label="입력일"
            value={execution.enteredAt || "-"}
          />
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
                    마감 {link.dueDate || "-"} · 완료 {link.completedDate || "-"}{" "}
                    · 입력 {link.enteredAt || "-"}
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

function TimelineDetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-zinc-200">{value}</dd>
    </div>
  );
}
