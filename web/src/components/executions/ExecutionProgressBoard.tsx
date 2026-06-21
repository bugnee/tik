"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useData } from "@/context/DataContext";
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
import { PostLinksCell } from "@/components/executions/PostLinksField";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  countByDeadlineStage,
  DEADLINE_STAGE_DESC,
  DEADLINE_STAGE_LABELS,
  DEADLINE_STAGE_STYLES,
  filterByDeadlineStage,
  getDeadlineStage,
  getExecutionCompletionRate,
  type DeadlineStage,
} from "@/lib/execution-utils";
import type { Execution } from "@/lib/types";
import {
  EXECUTION_STATUS_LABELS,
} from "@/lib/types";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import { cn } from "@/lib/cn";

type StageFilter = DeadlineStage | "completed" | "all";

const STAGE_STYLES: Record<
  StageFilter,
  { border: string; bg: string; text: string }
> = {
  all: {
    border: "border-zinc-700",
    bg: "bg-zinc-900/60",
    text: "text-zinc-300",
  },
  ...DEADLINE_STAGE_STYLES,
};

export function ExecutionProgressBoard({
  executions,
  onAdd,
  onEdit,
  onDelete,
  showClient = false,
  getClientName,
}: {
  executions: Execution[];
  onAdd: () => void;
  onEdit: (e: Execution) => void;
  onDelete: (id: string) => void;
  showClient?: boolean;
  getClientName?: (contractId: string) => string;
}) {
  const data = useData();
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");

  const counts = useMemo(
    () => countByDeadlineStage(executions),
    [executions],
  );
  const completionRate = useMemo(
    () => getExecutionCompletionRate(executions),
    [executions],
  );
  const filtered = useMemo(
    () => filterByDeadlineStage(executions, stageFilter),
    [executions, stageFilter],
  );

  const stageButtons: {
    key: StageFilter;
    label: string;
    desc: string;
    count: number;
  }[] = [
    {
      key: "safe",
      label: DEADLINE_STAGE_LABELS.safe,
      desc: DEADLINE_STAGE_DESC.safe,
      count: counts.safe,
    },
    {
      key: "warning",
      label: DEADLINE_STAGE_LABELS.warning,
      desc: DEADLINE_STAGE_DESC.warning,
      count: counts.warning,
    },
    {
      key: "urgent",
      label: DEADLINE_STAGE_LABELS.urgent,
      desc: DEADLINE_STAGE_DESC.urgent,
      count: counts.urgent,
    },
    {
      key: "overdue",
      label: DEADLINE_STAGE_LABELS.overdue,
      desc: DEADLINE_STAGE_DESC.overdue,
      count: counts.overdue,
    },
    {
      key: "completed",
      label: "완료",
      desc: "마감 내 완료",
      count: counts.completed,
    },
  ];

  return (
    <Card>
      <CardHeader
        title={`집행 실행 · 채널별 (${executions.length}건)`}
        subtitle="분야당 1행 · 진행·마감·포스팅 링크 · 달성률·고객 포털에 반영"
        action={
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            추가
          </Button>
        }
      />

      <div className="mb-6 space-y-4">
        <ProgressBar
          value={completionRate}
          label={`전체 진행율 ${completionRate.toFixed(0)}%`}
          color="emerald"
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          {stageButtons.map(({ key, label, desc, count }) => {
            const active = stageFilter === key;
            const style = STAGE_STYLES[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setStageFilter(active ? "all" : key)
                }
                className={cn(
                  "rounded-xl border p-3 text-left transition-all",
                  style.border,
                  style.bg,
                  active && "ring-2 ring-emerald-500/50",
                  "hover:brightness-110",
                )}
              >
                <p className="text-[10px] text-zinc-500">{desc}</p>
                <p className={cn("mt-1 text-2xl font-bold", style.text)}>
                  {count}
                </p>
                <p className="text-xs font-medium text-zinc-400">{label}</p>
              </button>
            );
          })}
        </div>

        {stageFilter !== "all" && (
          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-xs">
            <span className="text-zinc-400">
              필터:{" "}
              <span className="font-medium text-zinc-200">
                {stageFilter === "completed"
                  ? "완료"
                  : DEADLINE_STAGE_LABELS[stageFilter]}
              </span>{" "}
              · {filtered.length}건
            </span>
            <button
              type="button"
              onClick={() => setStageFilter("all")}
              className="text-emerald-400 hover:underline"
            >
              전체 보기
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          message={
            stageFilter === "all"
              ? "등록된 실행이 없습니다"
              : "해당 단계의 업무가 없습니다"
          }
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              {showClient && <Th>업체</Th>}
              <Th>유형</Th>
              <Th>진행</Th>
              <Th>마감일</Th>
              <Th>완료일</Th>
              <Th>입력일</Th>
              <Th>포스팅 링크</Th>
              <Th>상태</Th>
              <Th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const stage = getDeadlineStage(
                e.dueDate,
                e.completedDate,
                e.status,
              );
              return (
                <Tr key={e.id}>
                  {showClient && (
                    <Td className="font-medium text-zinc-100">
                      {getClientName?.(e.contractId) ?? "-"}
                    </Td>
                  )}
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
                  <Td>{e.dueDate || "-"}</Td>
                  <Td>{e.completedDate || "-"}</Td>
                  <Td className="text-zinc-500">{e.enteredAt || "-"}</Td>
                  <Td>
                    <PostLinksCell links={e.postLinks} fallbackDueDate={e.dueDate} />
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant={
                          e.status === "completed"
                            ? "success"
                            : e.status === "delayed" || stage === "overdue"
                              ? "danger"
                              : stage === "urgent"
                                ? "warning"
                                : "info"
                        }
                      >
                        {EXECUTION_STATUS_LABELS[e.status]}
                      </Badge>
                      {stage !== "completed" && stage !== "safe" && (
                        <span className="text-[10px] text-zinc-600">
                          {DEADLINE_STAGE_LABELS[stage as DeadlineStage]}
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <IconBtn onClick={() => onEdit(e)} icon={Pencil} />
                      <IconBtn
                        onClick={() => onDelete(e.id)}
                        icon={Trash2}
                        danger
                      />
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
}: {
  onClick: () => void;
  icon: typeof Pencil;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800",
        danger ? "hover:text-rose-400" : "hover:text-emerald-400",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
