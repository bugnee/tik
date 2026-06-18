"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { PlaceCredentialsPanel } from "@/components/place-qa/PlaceCredentialsPanel";
import { PlaceQaDashboardPanel } from "@/components/place-qa/PlaceQaDashboardPanel";
import { QaConversationPanel } from "@/components/place-qa/QaConversationPanel";
import { QaContractTodoTags } from "@/components/place-qa/QaContractTodoTags";
import { PageHeader } from "@/components/ui/DataTable";
import {
  getPlaceCredentialsForContract,
  getQaContractRows,
  getQaScopeHint,
  threadNeedsStaffReply,
} from "@/lib/place-qa-utils";
import { filterContractsByRole } from "@/lib/selectors";
import { cn } from "@/lib/cn";

export function PlaceQaPage() {
  const data = useData();
  const { currentUser, activeRole } = useRole();
  const searchParams = useSearchParams();

  const contracts = useMemo(
    () =>
      filterContractsByRole(data, activeRole, currentUser.id).filter(
        (c) => c.status === "active",
      ),
    [data, activeRole, currentUser.id],
  );

  const contractRows = useMemo(
    () =>
      getQaContractRows(
        data,
        contracts.map((contract) => contract.id),
      ),
    [data, contracts],
  );

  const defaultId =
    searchParams.get("contract") ??
    contracts.find((c) =>
      data.qaThreads.some(
        (t) => t.contractId === c.id && threadNeedsStaffReply(data, t),
      ),
    )?.id ??
    contracts[0]?.id ??
    "";

  const [contractId, setContractId] = useState(defaultId);

  const selected =
    contracts.find((c) => c.id === contractId) ?? contracts[0];

  if (activeRole === "client") {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="고객사 Q&A"
        description={`고객사 질문 · ${getQaScopeHint(activeRole)}`}
        action={
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            대시보드
          </Link>
        }
      />

      <PlaceQaDashboardPanel showAllLink={false} />

      {contracts.length > 0 && selected && (
        <>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              업체 선택
            </p>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/40 p-1">
              {contractRows.map((row) => (
                <button
                  key={row.contractId}
                  type="button"
                  onClick={() => setContractId(row.contractId)}
                  className={cn(
                    "flex w-full flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    selected.id === row.contractId
                      ? "bg-cyan-500/10 text-cyan-100 ring-1 ring-cyan-500/25"
                      : "text-zinc-300 hover:bg-zinc-900/80",
                  )}
                >
                  <span className="font-medium">{row.clientName}</span>
                  <span className="text-zinc-600">·</span>
                  <QaContractTodoTags row={row} />
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {(selected.hasPlaceSetting ||
              getPlaceCredentialsForContract(data, selected.id)) && (
              <PlaceCredentialsPanel contractId={selected.id} />
            )}
            <QaConversationPanel contractId={selected.id} />
          </div>
        </>
      )}
    </div>
  );
}
