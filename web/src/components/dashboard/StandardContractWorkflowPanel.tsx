"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Lock,
  Route,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { cn } from "@/lib/cn";
import {
  getStandardContract,
  getStandardWorkflowProgress,
  resolveWorkflowContractId,
  type StandardWorkflowStepState,
  type StandardWorkflowStepStatus,
} from "@/lib/standard-contract-workflow";

const STATUS_ICON: Record<
  StandardWorkflowStepStatus,
  { icon: typeof CheckCircle2; className: string; emoji: string }
> = {
  completed: {
    icon: CheckCircle2,
    className: "text-emerald-400",
    emoji: "✅",
  },
  current: {
    icon: Circle,
    className: "text-amber-400",
    emoji: "⏳",
  },
  locked: {
    icon: Lock,
    className: "text-zinc-600",
    emoji: "🔒",
  },
};

/** 담당·교육용 계약 기준 운영 흐름 — 매뉴얼형 체크리스트 */
export function StandardContractWorkflowPanel({
  className,
  contractId: contractIdProp,
}: {
  className?: string;
  /** 미지정 시 현재 사용자 담당 계약 → 교육용 c-1 순으로 자동 선택 */
  contractId?: string;
}) {
  const data = useData();
  const { currentUser, activeRole } = useRole();

  const resolved = useMemo(() => {
    if (contractIdProp) {
      return { contractId: contractIdProp, isTrainingFallback: false };
    }
    return resolveWorkflowContractId(data, currentUser.id, activeRole);
  }, [contractIdProp, data, currentUser.id, activeRole]);

  const contractId = resolved?.contractId;
  const contract = contractId
    ? getStandardContract(data, contractId)
    : undefined;

  const progress = useMemo(
    () =>
      contractId
        ? getStandardWorkflowProgress(data, contractId)
        : null,
    [data, contractId],
  );

  if (!contract || contract.status !== "active" || !progress || !contractId) {
    return null;
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-[var(--card-muted)] to-[var(--card-muted)] p-3 sm:p-4",
        className,
      )}
      aria-label="표준 운영 흐름"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
            <Route className="h-4 w-4 text-cyan-300" />
            표준 운영 흐름
          </span>
          <p className="mt-1 text-xs text-zinc-400">
            {resolved?.isTrainingFallback ? (
              <>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-200">
                  교육용
                </span>{" "}
                기준 계약{" "}
              </>
            ) : (
              <>내 담당 계약 </>
            )}
            <span className="font-medium text-zinc-200">
              {progress.contractName}
            </span>
            · 매뉴얼 순서대로 진행합니다
          </p>
        </div>
        <Link
          href={`/contracts/${contractId}`}
          className="text-xs text-cyan-400 hover:underline"
        >
          계약 상세
        </Link>
      </div>

      <ol className="relative space-y-0">
        {progress.steps.map((step, index) => (
          <WorkflowStepRow
            key={step.id}
            step={step}
            contractId={contractId}
            isLast={index === progress.steps.length - 1}
          />
        ))}
      </ol>
    </section>
  );
}

function WorkflowStepRow({
  step,
  contractId,
  isLast,
}: {
  step: StandardWorkflowStepState;
  contractId: string;
  isLast: boolean;
}) {
  const meta = STATUS_ICON[step.status];
  const href = step.href(contractId);
  const isClickable = step.status !== "locked";

  const content = (
    <>
      <span className="mt-0.5 shrink-0 text-base leading-none" aria-hidden>
        {meta.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              step.status === "completed"
                ? "text-zinc-400 line-through decoration-zinc-600"
                : step.status === "current"
                  ? "text-zinc-100"
                  : "text-zinc-500",
            )}
          >
            {step.label}
          </span>
          <span className="rounded-md bg-zinc-900/60 px-1.5 py-0.5 text-[10px] text-zinc-500">
            {step.roleLabel}
          </span>
        </div>
        {step.status === "current" && step.blocker && (
          <p className="mt-1 text-xs text-amber-200/90">{step.blocker}</p>
        )}
        {step.status === "locked" && step.blocker && (
          <p className="mt-1 text-xs text-zinc-600">{step.blocker}</p>
        )}
        {step.status === "completed" && (
          <p className="mt-0.5 text-[11px] text-zinc-600">{step.manualHint}</p>
        )}
      </div>
      {isClickable && (
        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
      )}
    </>
  );

  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!isLast && (
        <span
          className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-zinc-800"
          aria-hidden
        />
      )}
      {isClickable ? (
        <Link
          href={href}
          className="flex w-full items-start gap-3 rounded-lg border border-transparent px-1 py-1 transition-colors hover:border-cyan-500/30 hover:bg-cyan-500/5"
        >
          {content}
        </Link>
      ) : (
        <div className="flex w-full items-start gap-3 px-1 py-1 opacity-70">
          {content}
        </div>
      )}
    </li>
  );
}
