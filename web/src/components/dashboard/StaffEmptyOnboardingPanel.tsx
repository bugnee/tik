"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { cn } from "@/lib/cn";
import { filterContractsByRole } from "@/lib/selectors";
import {
  STANDARD_CONTRACT_ID,
  getStandardContract,
} from "@/lib/standard-contract-workflow";

/** 담당 계약이 없을 때 — 신입 실무 담당 안내 */
export function StaffEmptyOnboardingPanel({
  className,
}: {
  className?: string;
}) {
  const data = useData();
  const { currentUser, activeRole } = useRole();

  const assignedCount = useMemo(
    () =>
      filterContractsByRole(data, activeRole, currentUser.id).filter(
        (c) => c.status === "active",
      ).length,
    [data, activeRole, currentUser.id],
  );

  const trainingAvailable = useMemo(() => {
    const demo = getStandardContract(data, STANDARD_CONTRACT_ID);
    return demo?.status === "active";
  }, [data]);

  if (assignedCount > 0) return null;

  return (
    <section
      className={cn(
        "rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[var(--card-muted)] to-[var(--card-muted)] p-4",
        className,
      )}
      aria-label="담당 계약 없음 안내"
    >
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-semibold text-amber-100">
            아직 배정된 활성 계약이 없습니다
          </p>
          <p className="text-xs leading-relaxed text-zinc-400">
            팀장에게 계약 담당 배정을 요청하세요. 배정 전까지는 아래 교육용
            기준 계약으로 ERP 흐름을 연습할 수 있습니다.
          </p>
          <ul className="space-y-1 text-xs text-zinc-500">
            <li>· 계약 배정: 계약 상세 → 담당자 설정 (팀장·임원)</li>
            <li>· 배정 후: 대시보드 「오늘 할 일」에서 실제 업무가 표시됩니다</li>
          </ul>
          {trainingAvailable ? (
            <Link
              href={`/executions?contract=${STANDARD_CONTRACT_ID}`}
              className="inline-flex text-xs font-medium text-amber-300 hover:underline"
            >
              교육용 기준 계약({STANDARD_CONTRACT_ID}) 실행 페이지 →
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
