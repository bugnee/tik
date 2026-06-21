"use client";

import { useEffect, useMemo, useState } from "react";
import { ContractKpiStrip } from "@/components/contracts/ContractKpiStrip";
import { ContractExecutionModal } from "@/components/contracts/detail/ContractDetailModals";
import { emptyExecution } from "@/components/contracts/detail/constants";
import { ExecutionProgressBoard } from "@/components/executions/ExecutionProgressBoard";
import { useData } from "@/context/DataContext";
import {
  sortExecutionsByChannel,
} from "@/lib/execution-generation-utils";
import { prepareExecutionInput } from "@/lib/execution-utils";
import {
  getCompletionRate,
  getContractExecutionsDeduped,
} from "@/lib/selectors";
import { getContractVisibleTargetChannels } from "@/lib/task-channel-utils";
import type { Contract, Execution, ExecutionInput } from "@/lib/types";
import { cn } from "@/lib/cn";
import type { ResolvedContractPeriod } from "@/lib/contract-period-utils";
import {
  filterExecutionsInExecutionPeriod,
  scopeExecutionPostLinksToPeriod,
} from "@/lib/execution-period-utils";
import { getExecutionCompletionRate } from "@/lib/execution-utils";

/** 계약 KPI · 채널별 실행 목록 (계약 상세와 동일 구조) */
export function ContractExecutionDashboardPanel({
  contract,
  period,
  className,
}: {
  contract: Contract;
  /** 설정 시 해당 기간 내 집행·링크만 표시 */
  period?: Pick<ResolvedContractPeriod, "start" | "end">;
  className?: string;
}) {
  const data = useData();
  const {
    ensureContractExecutions,
    addExecution,
    updateExecution,
    deleteExecution,
  } = data;

  const [execModal, setExecModal] = useState(false);
  const [editingExec, setEditingExec] = useState<Execution | null>(null);
  const [execForm, setExecForm] = useState<ExecutionInput>(() =>
    emptyExecution(contract.id),
  );

  useEffect(() => {
    ensureContractExecutions(contract.id);
  }, [contract.id, ensureContractExecutions]);

  const executions = useMemo(() => {
    const sorted = sortExecutionsByChannel(
      getContractExecutionsDeduped(data, contract.id),
      data.taskChannels,
    );
    if (!period) return sorted;
    return filterExecutionsInExecutionPeriod(sorted, period).map((execution) =>
      scopeExecutionPostLinksToPeriod(execution, period),
    );
  }, [data, contract.id, period]);

  const periodCompletionRate = useMemo(
    () => (period ? getExecutionCompletionRate(executions) : null),
    [executions, period],
  );

  const progressChannels = useMemo(
    () => getContractVisibleTargetChannels(contract, data.taskChannels),
    [contract, data.taskChannels],
  );

  const completionRate =
    periodCompletionRate ?? getCompletionRate(data, contract);

  function openExecCreate() {
    setEditingExec(null);
    setExecForm(emptyExecution(contract.id));
    setExecModal(true);
  }

  function openExecEdit(e: Execution) {
    setEditingExec(e);
    setExecForm({
      ...e,
      postLinks: e.postLinks?.length ? e.postLinks : [],
    });
    setExecModal(true);
  }

  function submitExec(ev: React.FormEvent) {
    ev.preventDefault();
    const payload = prepareExecutionInput(execForm);
    if (editingExec) {
      updateExecution(editingExec.id, payload);
    } else {
      addExecution(payload);
    }
    setExecModal(false);
  }

  function handleDelete(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    deleteExecution(id);
  }

  return (
    <div className={cn("space-y-4", className)}>
      <ContractKpiStrip
        contract={contract}
        progressChannels={progressChannels}
        completionRate={completionRate}
      />

      <ExecutionProgressBoard
        executions={executions}
        onAdd={openExecCreate}
        onEdit={openExecEdit}
        onDelete={handleDelete}
      />

      <ContractExecutionModal
        open={execModal}
        onClose={() => setExecModal(false)}
        editing={editingExec}
        form={execForm}
        setForm={setExecForm}
        onSubmit={submitExec}
      />
    </div>
  );
}
