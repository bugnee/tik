"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { ContractBriefListModal } from "@/components/contracts/ContractBriefListModal";
import {
  countPipeline,
  filterByPipeline,
} from "@/lib/contract-lifecycle";
import { filterContractsByRole } from "@/lib/selectors";
import { cn } from "@/lib/cn";
import {
  PIPELINE_CATEGORY_LABELS,
  type PipelineCategory,
} from "@/lib/types";

const CATEGORY_CONFIG: Record<
  PipelineCategory,
  {
    icon: typeof Building2;
    accent: string;
    badge: "success" | "warning" | "danger";
    description: string;
  }
> = {
  in_progress: {
    icon: Building2,
    accent: "text-emerald-400",
    badge: "success",
    description: "정상 진행 중인 고객사",
  },
  extension_imminent: {
    icon: RefreshCw,
    accent: "text-amber-400",
    badge: "warning",
    description: "계약 만료 14일 이내 · 연장 미확정",
  },
  contract_ending: {
    icon: AlertTriangle,
    accent: "text-rose-400",
    badge: "danger",
    description: "만료 7일 이내 또는 해지 완료",
  },
};

type ClientPipelineWidgetProps = {
  compact?: boolean;
};

export function ClientPipelineWidget({ compact }: ClientPipelineWidgetProps) {
  const data = useData();
  const { activeRole, currentUser } = useRole();
  const [modalCategory, setModalCategory] = useState<PipelineCategory | null>(
    null,
  );

  const scopedContracts = useMemo(
    () => filterContractsByRole(data, activeRole, currentUser.id),
    [data, activeRole, currentUser.id],
  );

  const counts = useMemo(
    () => countPipeline(scopedContracts),
    [scopedContracts],
  );

  const modalContracts = useMemo(() => {
    if (!modalCategory) return [];
    return filterByPipeline(scopedContracts, modalCategory);
  }, [scopedContracts, modalCategory]);

  function openCategory(category: PipelineCategory) {
    if (counts[category] === 0) return;
    setModalCategory(category);
  }

  const pipelineModal =
    modalCategory !== null ? (
      <ContractBriefListModal
        open
        onClose={() => setModalCategory(null)}
        title={`${PIPELINE_CATEGORY_LABELS[modalCategory]} 고객사 (${modalContracts.length}곳)`}
        description={CATEGORY_CONFIG[modalCategory].description}
        contracts={modalContracts}
        data={data}
        showReferralFee={activeRole === "partner"}
      />
    ) : null;

  const categories: PipelineCategory[] = [
    "in_progress",
    "extension_imminent",
    "contract_ending",
  ];

  if (compact) {
    return (
      <>
        <div className="hidden items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 md:flex">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => openCategory(cat)}
              disabled={counts[cat] === 0}
              className={cn(
                "flex items-center gap-1 rounded-lg px-1.5 py-1.5 text-xs transition-colors lg:gap-1.5 lg:px-2.5",
                counts[cat] > 0
                  ? "hover:bg-zinc-800 text-zinc-300"
                  : "cursor-default text-zinc-600",
              )}
              title={PIPELINE_CATEGORY_LABELS[cat]}
            >
              <span className="hidden text-zinc-500 lg:inline">
                {PIPELINE_CATEGORY_LABELS[cat]}
              </span>
              <span className="text-zinc-500 lg:hidden">
                {PIPELINE_CATEGORY_LABELS[cat].slice(0, 2)}
              </span>
              <span
                className={cn(
                  "font-mono font-bold",
                  CATEGORY_CONFIG[cat].accent,
                )}
              >
                {counts[cat]}
              </span>
            </button>
          ))}
        </div>
        {pipelineModal}
      </>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {categories.map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const Icon = cfg.icon;
          const count = counts[cat];

          return (
            <button
              key={cat}
              type="button"
              onClick={() => openCategory(cat)}
              disabled={count === 0}
              className={cn(
                "group rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-left transition-all",
                count > 0
                  ? "hover:border-zinc-700 hover:bg-zinc-900 cursor-pointer"
                  : "cursor-default opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800/80",
                    cfg.accent,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <Badge variant={cfg.badge}>{PIPELINE_CATEGORY_LABELS[cat]}</Badge>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight text-zinc-50">
                {count}
                <span className="ml-1 text-sm font-normal text-zinc-500">곳</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">{cfg.description}</p>
              {count > 0 && (
                <p className="mt-2 flex items-center gap-1 text-xs text-emerald-400/80 opacity-0 transition-opacity group-hover:opacity-100">
                  고객사 목록 보기
                  <ChevronRight className="h-3 w-3" />
                </p>
              )}
            </button>
          );
        })}
      </div>

      {pipelineModal}
    </>
  );
}

export function ClientPipelineBanner() {
  const { activeRole } = useRole();
  const isPartner = activeRole === "partner";

  return (
    <Card className="border-zinc-800/80 bg-zinc-900/40">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">고객사 현황</h2>
          <p className="text-xs text-zinc-500">
            {isPartner
              ? "리셀러 수수료 대상 고객사 — 숫자 클릭 시 목록 → 계약 상세"
              : "진행 · 연장임박 · 계약종료 — 숫자 클릭 시 목록 → 계약 상세"}
          </p>
        </div>
        {!isPartner && (
          <Link
            href="/contracts"
            className="text-xs text-emerald-400 hover:underline"
          >
            전체 계약
          </Link>
        )}
      </div>
      <ClientPipelineWidget />
    </Card>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border p-4 lg:p-5", className)}>
      {children}
    </div>
  );
}
