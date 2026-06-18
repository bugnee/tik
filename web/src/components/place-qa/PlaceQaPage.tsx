"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { PlaceCredentialsPanel } from "@/components/place-qa/PlaceCredentialsPanel";
import { PlaceQaDashboardPanel } from "@/components/place-qa/PlaceQaDashboardPanel";
import { QaConversationPanel } from "@/components/place-qa/QaConversationPanel";
import { PageHeader } from "@/components/ui/DataTable";
import { Select } from "@/components/ui/FormFields";
import {
  getPlaceCredentialsForContract,
  getQaScopeHint,
  threadNeedsStaffReply,
} from "@/lib/place-qa-utils";
import { filterContractsByRole } from "@/lib/selectors";

export function PlaceQaPage() {
  const data = useData();
  const { currentUser, activeRole } = useRole();

  const contracts = useMemo(
    () =>
      filterContractsByRole(data, activeRole, currentUser.id).filter(
        (c) => c.status === "active",
      ),
    [data, activeRole, currentUser.id],
  );

  const defaultId =
    contracts.find((c) =>
      data.qaThreads.some(
        (t) => t.contractId === c.id && threadNeedsStaffReply(data, t),
      ),
    )?.id ?? contracts[0]?.id ?? "";

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
          <Select
            label="업체 선택"
            value={selected.id}
            onChange={(e) => setContractId(e.target.value)}
          >
            {contracts.map((c) => {
              const needs = data.qaThreads.filter(
                (t) =>
                  t.contractId === c.id && threadNeedsStaffReply(data, t),
              ).length;
              const hasPlace = !!getPlaceCredentialsForContract(data, c.id);
              return (
                <option key={c.id} value={c.id}>
                  {c.clientName}
                  {needs > 0 ? ` · 미답변 ${needs}` : ""}
                  {hasPlace ? " · 플레이스 등록" : ""}
                </option>
              );
            })}
          </Select>

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
