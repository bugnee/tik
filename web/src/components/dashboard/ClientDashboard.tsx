"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  Link2,
  Target,
  TrendingUp,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import { ContractPeriodSelector } from "@/components/contracts/ContractPeriodSelector";
import { PlaceCredentialsPanel } from "@/components/place-qa/PlaceCredentialsPanel";
import { QaConversationPanel } from "@/components/place-qa/QaConversationPanel";
import { PostLinkOpinionButton } from "@/components/executions/PostLinkOpinionButton";
import { Card, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatCard } from "@/components/ui/StatCard";
import {
  DEMO_TODAY,
  getContractStatusDisplay,
} from "@/lib/contract-lifecycle";
import {
  contractRecordsForPeriod,
  createDefaultContractPeriodSelection,
  dateInContractPeriod,
  filterActivityByContractPeriod,
  filterLinksByContractPeriod,
  filterWorkOrdersByContractPeriod,
  getPeriodProgressRate,
  getPeriodRemainingDays,
  resolveContractPeriod,
  type ContractPeriodSelection,
} from "@/lib/contract-period-utils";
import {
  getClientContractForUser,
  getClientReportLinks,
  getCompletionRate,
  getContractActivity,
  getContractExecutions,
  getContractRecords,
  getMonthlyProgressRate,
  getTeamName,
  getUserName,
} from "@/lib/selectors";
import {
  getContractDoneCount,
  getContractTargetChannels,
  getContractTargetCount,
  getContractTargetUnit,
  getExecutionTypeLabel,
  shouldShowContractTargetRow,
  taskChannelToExecutionType,
} from "@/lib/task-channel-utils";
import {
  CLIENT_WORK_STAGE_LABELS,
} from "@/lib/work-order-utils";
import {
  CONTRACT_STATUS_LABELS,
  EXECUTION_STATUS_LABELS,
  type AppData,
  type ExecutionType,
} from "@/lib/types";
import type { ClientReportLink } from "@/lib/selectors";
import { cn } from "@/lib/cn";

export function ClientDashboard() {
  const data = useData();
  const { currentUser } = useRole();

  const contract = useMemo(
    () => getClientContractForUser(data, currentUser.id),
    [data, currentUser.id],
  );

  const executions = useMemo(
    () => (contract ? getContractExecutions(data, contract.id) : []),
    [data, contract],
  );

  const workOrders = useMemo(
    () =>
      contract
        ? data.workOrders.filter(
            (o) =>
              o.contractId === contract.id &&
              o.stage !== "draft" &&
              o.stage !== "rejected",
          )
        : [],
    [data.workOrders, contract],
  );

  const links = useMemo(
    () => (contract ? getClientReportLinks(data, contract.id) : []),
    [data, contract],
  );

  const records = useMemo(
    () => (contract ? getContractRecords(data, contract.id) : []),
    [data, contract],
  );

  const activity = useMemo(
    () =>
      contract
        ? getContractActivity(data, contract.id)
            .filter((a) => a.kind !== "expense")
            .slice(0, 12)
        : [],
    [data, contract],
  );

  const targetChannels = useMemo(
    () => getContractTargetChannels(data.taskChannels),
    [data.taskChannels],
  );

  const completionChannels = useMemo(
    () => targetChannels.filter((c) => c.contractDoneField),
    [targetChannels],
  );

  const completion = contract ? getCompletionRate(data, contract) : 0;
  const [linkFilter, setLinkFilter] = useState<string>("all");
  const [periodSelection, setPeriodSelection] = useState<ContractPeriodSelection>(
    () => ({
      mode: "cycle30",
      cycleIndex: 1,
      month: DEMO_TODAY.slice(0, 7),
      year: DEMO_TODAY.slice(0, 4),
    }),
  );

  useEffect(() => {
    if (contract) {
      setPeriodSelection(createDefaultContractPeriodSelection(contract, records));
    }
  }, [contract, records]);

  const resolvedPeriod = useMemo(() => {
    if (!contract) {
      return {
        start: DEMO_TODAY,
        end: DEMO_TODAY,
        label: DEMO_TODAY,
      };
    }
    return resolveContractPeriod(periodSelection, contract, records);
  }, [contract, periodSelection, records]);

  const periodWorkOrders = useMemo(
    () => filterWorkOrdersByContractPeriod(workOrders, resolvedPeriod),
    [workOrders, resolvedPeriod],
  );

  const periodLinks = useMemo(
    () => filterLinksByContractPeriod(links, resolvedPeriod),
    [links, resolvedPeriod],
  );

  const periodActivity = useMemo(
    () => filterActivityByContractPeriod(activity, resolvedPeriod),
    [activity, resolvedPeriod],
  );

  const periodRecords = useMemo(
    () => contractRecordsForPeriod(records, resolvedPeriod),
    [records, resolvedPeriod],
  );

  const periodProgress = useMemo(
    () =>
      contract
        ? getPeriodProgressRate(
            workOrders,
            data.taskChannels,
            resolvedPeriod,
            getMonthlyProgressRate(data, contract),
          )
        : 0,
    [contract, workOrders, data, resolvedPeriod],
  );

  const periodRemaining = getPeriodRemainingDays(resolvedPeriod);

  const periodExecutions = useMemo(
    () =>
      executions.filter((exec) =>
        dateInContractPeriod(exec.dueDate, resolvedPeriod),
      ),
    [executions, resolvedPeriod],
  );

  useEffect(() => {
    setLinkFilter("all");
  }, [resolvedPeriod.start, resolvedPeriod.end]);

  const filterOptions = useMemo(() => {
    if (!contract) return [{ id: "all", label: "전체", count: 0 }];
    const opts: { id: string; label: string; count: number; executionType?: ExecutionType }[] = [
      { id: "all", label: "전체", count: periodLinks.length },
    ];
    for (const exec of executions) {
      const id = `exec:${exec.type}`;
      if (opts.some((o) => o.id === id)) continue;
      opts.push({
        id,
        label: getExecutionTypeLabel(data, exec.type),
        count: periodLinks.filter((l) => linkMatchesFilter(l, id, data)).length,
        executionType: exec.type,
      });
    }
    return opts;
  }, [contract, executions, periodLinks, data]);

  const filteredLinks = useMemo(
    () => periodLinks.filter((l) => linkMatchesFilter(l, linkFilter, data)),
    [periodLinks, linkFilter, data],
  );

  if (!contract) {
    return (
      <Card className="py-16 text-center">
        <p className="text-sm text-zinc-400">
          연결된 계약 정보가 없습니다. 관리자에게 계약 연결을 요청해 주세요.
        </p>
      </Card>
    );
  }

  const monthlyProgress = periodProgress;
  const status = getContractStatusDisplay(contract);
  const remaining = periodRemaining;
  const publishedCount = periodLinks.length;
  const activeOrders = periodWorkOrders.filter((o) =>
    ["pending_approval", "approved", "delivered"].includes(o.stage),
  ).length;
  const periodModeLabel =
    periodSelection.mode === "cycle30"
      ? "선택 회차"
      : periodSelection.mode === "month"
        ? "선택 월"
        : "선택 연도";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-zinc-900/40 to-zinc-950 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-300/80">
              TRIP IT KOREA · 고객사 포털
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
              {contract.clientName}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              계약 · 진행 · 링크 통합 보고서 · {resolvedPeriod.label}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {contract.isExtension && <Badge variant="success">연장 계약</Badge>}
            {contract.hasPlaceSetting && (
              <Badge variant="info">플레이스 세팅</Badge>
            )}
            {status.isInProgress ? (
              <Badge variant="success">진행중</Badge>
            ) : (
              <Badge variant="default">
                {CONTRACT_STATUS_LABELS[contract.status]}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <ContractPeriodSelector
        contract={contract}
        records={records}
        value={periodSelection}
        onChange={setPeriodSelection}
        resolved={resolvedPeriod}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="전체 달성률"
          value={`${completion.toFixed(0)}%`}
          subValue={completionChannels.map((c) => c.label).join(" · ") || "집행 목표 기준"}
          icon={TrendingUp}
          accent="emerald"
        />
        <StatCard
          label={`${periodModeLabel} 진행율`}
          value={`${monthlyProgress}%`}
          subValue={`${resolvedPeriod.start} ~ ${resolvedPeriod.end}`}
          icon={Target}
          accent="cyan"
        />
        <StatCard
          label="게시 링크"
          value={`${publishedCount}건`}
          subValue={`${periodModeLabel} 집계`}
          icon={Link2}
          accent="amber"
        />
        <StatCard
          label="진행 업무"
          value={`${activeOrders}건`}
          subValue={
            periodRemaining >= 0
              ? `기간 D-${periodRemaining}`
              : `기간 종료 ${resolvedPeriod.end}`
          }
          icon={Calendar}
          accent="rose"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader
            title="계약 내용"
            subtitle="당사와 체결한 마케팅 집행 범위"
          />
          <dl className="space-y-4 text-sm">
            <Row label="조회 기간">
              <span className="text-cyan-400">
                {resolvedPeriod.start} ~ {resolvedPeriod.end}
              </span>
            </Row>
            <Row label="전체 계약">
              {contract.contractStartDate} ~ {contract.contractEndDate}
            </Row>
            <Row label="계약 현황">
              {status.isInProgress ? (
                <span className="text-emerald-400">진행중</span>
              ) : (
                status.label
              )}
            </Row>
            <Row label="재계약 회차">{contract.renewalMonthCount}월차</Row>
            <Row label="담당 팀">{getTeamName(data, contract.teamId)}</Row>
            <Row label="담당 매니저">
              {getUserName(data, contract.assignedStaffId)}
            </Row>
          </dl>

          <div className="mt-6 border-t border-zinc-800 pt-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
              월 집행 목표
            </p>
            <div className="space-y-3">
              {targetChannels
                .filter((channel) => shouldShowContractTargetRow(contract, channel))
                .map((channel) => (
                  <TargetRow
                    key={channel.id}
                    label={channel.label}
                    done={getContractDoneCount(contract, channel)}
                    target={getContractTargetCount(contract, channel)}
                    note={
                      channel.contractDoneField ? undefined : "실행 집계"
                    }
                  />
                ))}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader
            title="진행 현황"
            subtitle={`${periodModeLabel} · ${resolvedPeriod.start} ~ ${resolvedPeriod.end}`}
          />
          <div className="mb-6">
            <ProgressBar
              label={`${periodModeLabel} 종합 진행율`}
              value={monthlyProgress}
              color="emerald"
            />
          </div>

          {periodExecutions.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              선택한 기간에 등록된 실행 진행 데이터가 없습니다.
            </p>
          ) : (
            <div className="space-y-3">
              {periodExecutions.map((exec) => {
                const pct =
                  exec.targetCount > 0
                    ? (exec.completedCount / exec.targetCount) * 100
                    : 0;
                const filterId = `exec:${exec.type}`;
                const isSelected = linkFilter === filterId;
                return (
                  <button
                    key={exec.id}
                    type="button"
                    onClick={() =>
                      setLinkFilter(isSelected ? "all" : filterId)
                    }
                    className={cn(
                      "w-full rounded-xl border p-4 text-left transition-all",
                      isSelected
                        ? "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                        : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/50",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <TaskChannelBadge
                        data={data}
                        executionType={exec.type}
                      />
                      <Badge
                        variant={
                          exec.status === "completed"
                            ? "success"
                            : exec.status === "delayed"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {EXECUTION_STATUS_LABELS[exec.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {exec.completedCount} / {exec.targetCount}건
                      {exec.dueDate && ` · 마감 ${exec.dueDate}`}
                    </p>
                    <div className="mt-3">
                      <ProgressBar value={pct} size="sm" showValue />
                    </div>
                    <p className="mt-2 text-[10px] text-zinc-600">
                      {isSelected
                        ? "선택됨 · 아래 링크 보고서에만 표시"
                        : "클릭하면 아래 링크 보고서 필터"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div id="client-link-report">
      <Card glow>
        <CardHeader
          title="게시 · 링크 보고서"
          subtitle={
            linkFilter === "all"
              ? `${periodModeLabel} ${periodLinks.length}건 · 실행 및 집행 결과물`
              : `${filteredLinks.length}건 표시 · ${
                  filterOptions.find((o) => o.id === linkFilter)?.label ?? ""
                } 필터`
          }
        />

        {periodLinks.length > 0 && filterOptions.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-2 px-1">
            {filterOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLinkFilter(opt.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  linkFilter === opt.id
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                    : "border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300",
                )}
              >
                {opt.executionType ? (
                  <TaskChannelBadge
                    data={data}
                    executionType={opt.executionType}
                    className="px-2 py-0 text-[10px]"
                  />
                ) : (
                  <span>{opt.label}</span>
                )}
                <span className="font-mono text-[10px] opacity-80">
                  {opt.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {periodLinks.length === 0 ? (
          <p className="pb-6 text-center text-sm text-zinc-500">
            선택한 기간에 등록된 링크가 없습니다.
          </p>
        ) : filteredLinks.length === 0 ? (
          <p className="pb-6 text-center text-sm text-zinc-500">
            선택한 유형에 해당하는 링크가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {filteredLinks.map((link) => (
              <div
                key={link.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500/80" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <TaskChannelBadge
                      data={data}
                      taskType={link.taskType}
                      executionType={link.executionType}
                      label={link.channel}
                    />
                    <span className="text-[10px] text-zinc-600">
                      {link.source}
                    </span>
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center gap-1 truncate text-sm text-emerald-400 hover:underline"
                  >
                    {link.url}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  <p className="mt-1 text-xs text-zinc-600">
                    {link.completedDate && `완료 ${link.completedDate}`}
                    {link.dueDate && ` · 마감 ${link.dueDate}`}
                  </p>
                </div>
                <PostLinkOpinionButton contractId={contract.id} link={link} />
              </div>
            ))}
          </div>
        )}
      </Card>
      </div>

      <Card>
        <CardHeader
          title="집행 업무 현황"
          subtitle="채널별 업무 단계 · 고객사 공개 범위"
        />
        {periodWorkOrders.length === 0 ? (
          <p className="pb-6 text-center text-sm text-zinc-500">
            선택한 기간에 진행 중인 집행 업무가 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                  <th className="pb-3 pr-4 font-medium">채널</th>
                  <th className="pb-3 pr-4 font-medium">회차</th>
                  <th className="pb-3 pr-4 font-medium">단계</th>
                  <th className="pb-3 pr-4 font-medium">마감일</th>
                  <th className="pb-3 font-medium">링크</th>
                </tr>
              </thead>
              <tbody>
                {periodWorkOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-zinc-800/50 text-zinc-400"
                  >
                    <td className="py-3 pr-4">
                      <TaskChannelBadge data={data} taskType={order.taskType} />
                    </td>
                    <td className="py-3 pr-4">{order.sequence}회차</td>
                    <td className="py-3 pr-4">
                      <Badge variant="default">
                        {CLIENT_WORK_STAGE_LABELS[order.stage]}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-xs">
                      {order.dueDate}
                    </td>
                    <td className="py-3">
                      {order.postLinks.filter((l) => l.url).length > 0 ? (
                        <span className="text-emerald-400">
                          {order.postLinks.filter((l) => l.url).length}건
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <PlaceCredentialsPanel contractId={contract.id} />
        <QaConversationPanel contractId={contract.id} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="최근 활동"
            subtitle={`${periodModeLabel} · 실행 · 연장 이력`}
          />
          {periodActivity.length === 0 ? (
            <p className="pb-6 text-center text-sm text-zinc-500">
              선택한 기간의 활동 기록이 없습니다.
            </p>
          ) : (
            <ul className="space-y-3">
              {periodActivity.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 border-b border-zinc-800/50 pb-3 last:border-0"
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {item.title}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {item.date} · {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="계약 이력"
            subtitle={`${periodModeLabel} 회차 · 서비스 기간`}
          />
          {periodRecords.length === 0 ? (
            <p className="pb-6 text-center text-sm text-zinc-500">
              선택한 기간의 계약 이력이 없습니다.
            </p>
          ) : (
            <ul className="space-y-3">
              {periodRecords.map((record) => (
                <li
                  key={record.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-zinc-200">
                      {record.period} 회차
                    </p>
                    {record.isExtension && (
                      <Badge variant="success">연장</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {record.startedAt}
                    {record.endedAt ? ` ~ ${record.endedAt}` : " ~ 진행중"}
                  </p>
                  {record.note && (
                    <p className="mt-1 text-xs text-zinc-600">{record.note}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-center text-xs text-zinc-600">
        담당: {getUserName(data, contract.assignedStaffId)} ·{" "}
        {getTeamName(data, contract.teamId)} · 플레이스 · 질의응답에서 문의와 링크 의견을 확인할 수 있습니다.
      </p>
    </div>
  );
}

function linkMatchesFilter(
  link: ClientReportLink,
  filter: string,
  data: AppData,
): boolean {
  if (filter === "all") return true;
  if (filter.startsWith("exec:")) {
    const execType = filter.slice(5) as ExecutionType;
    if (link.executionType === execType) return true;
    if (
      link.taskType &&
      taskChannelToExecutionType(data.taskChannels, link.taskType) === execType
    ) {
      return true;
    }
  }
  return false;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-200">{children}</dd>
    </div>
  );
}

function TargetRow({
  label,
  done,
  target,
  note,
}: {
  label: string;
  done: number;
  target: number;
  note?: string;
}) {
  const pct = target > 0 ? (done / target) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-mono text-zinc-300">
          {done} / {target}
          {note && <span className="ml-1 text-zinc-600">({note})</span>}
        </span>
      </div>
      <ProgressBar value={pct} size="sm" showValue={false} />
    </div>
  );
}
