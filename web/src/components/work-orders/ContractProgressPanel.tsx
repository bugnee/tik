"use client";

import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatCard } from "@/components/ui/StatCard";
import { useData } from "@/context/DataContext";
import {
  getTaskChannelAccent,
  getTaskChannelProgressBarColor,
} from "@/lib/task-channel-utils";
import type { ContractWorkProgress } from "@/lib/work-order-utils";

export function ContractProgressPanel({
  clientName,
  progress,
}: {
  clientName: string;
  progress: ContractWorkProgress;
}) {
  const data = useData();

  if (progress.total === 0) return null;

  return (
    <Card className="mb-4" glow>
      <CardHeader
        title={`${clientName} · 실행 진행 현황`}
        subtitle={`전체 ${progress.total}건 · 오더준 ${progress.completed}건 · 가중 진행 ${progress.weightedPercent}%`}
      />

      <div className="space-y-5 px-1 pb-1">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="오더준 완료"
            value={`${progress.completed}/${progress.total}`}
            subValue={`${progress.overallPercent}% 완료`}
            icon={CheckCircle2}
            accent="emerald"
          />
          <StatCard
            label="진행 중"
            value={`${progress.inProgress}건`}
            subValue="승인·제출·입금 단계"
            icon={Loader2}
            accent="cyan"
          />
          <StatCard
            label="대기"
            value={`${progress.pending}건`}
            subValue="업무 생성·반려"
            icon={Clock}
            accent="amber"
          />
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <ProgressBar
            label="전체 진행률 (단계 가중)"
            value={progress.weightedPercent}
            color="emerald"
          />
          <p className="mt-2 text-[11px] text-zinc-600">
            오더준 {progress.completed}건 ({progress.overallPercent}%) ·
            진행 {progress.inProgress}건 · 대기 {progress.pending}건
          </p>
        </div>

        {progress.fields.length > 0 && (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              분야별 진행
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {progress.fields.map((field) => {
                const accent = getTaskChannelAccent(
                  data.taskChannels,
                  field.taskType,
                );
                return (
                  <div
                    key={field.taskType}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-950/30 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <TaskChannelBadge
                        data={data}
                        taskType={field.taskType}
                        label={field.label}
                      />
                      <span className="font-mono text-xs text-emerald-400">
                        {field.completed}/{field.total}
                      </span>
                    </div>
                    <ProgressBar
                      value={field.weightedPercent}
                      size="sm"
                      color={getTaskChannelProgressBarColor(accent)}
                      showValue
                    />
                    <p className="mt-2 text-[10px] text-zinc-600">
                      완료 {field.completed} · 진행 {field.inProgress} · 대기{" "}
                      {field.pending}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
