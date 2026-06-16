"use client";

import { useMemo, useState } from "react";
import { Building2, ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import {
  countDepositByStatus,
  DEPOSIT_STATUS_ORDER,
  getDepositConfirmContracts,
  resolveClientDepositStatus,
} from "@/lib/client-deposit-utils";
import { calcBonusAmounts, calcScheduledPayDate } from "@/lib/bonus-utils";
import { isLeaderManagedContract } from "@/lib/contract-access-utils";
import { formatKRW } from "@/lib/finance";
import { getTeamName, getUserName } from "@/lib/selectors";
import { cn } from "@/lib/cn";
import type { AppData, ClientDepositStatus, Contract } from "@/lib/types";
import {
  CLIENT_DEPOSIT_STATUS_LABELS,
  CLIENT_DEPOSIT_STATUS_VARIANT,
} from "@/lib/types";

function BonusDepositAmountBlock({
  contract,
  data,
}: {
  contract: Contract;
  data: AppData;
}) {
  const amounts = calcBonusAmounts(contract, data.bonusPolicy, data);
  const leaderManaged = isLeaderManagedContract(data, contract);

  return (
    <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
      <p className="text-xs font-semibold text-emerald-300">
        성과급 지급 예정액 {formatKRW(amounts.totalAmount)}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
        {leaderManaged ? (
          <>
            <span className="text-cyan-500/90">팀장 직접 담당</span>
            {" · "}팀장 {formatKRW(amounts.teamLeaderBonusAmount)} (
            {amounts.teamLeaderPercentApplied}%)
            {" · "}임원 {formatKRW(amounts.executiveBonusAmount)} (
            {amounts.executivePercentApplied}%)
          </>
        ) : (
          <>
            담당 {formatKRW(amounts.staffBonusAmount)} (
            {amounts.staffPercentApplied}%)
            {" · "}팀장 {formatKRW(amounts.teamLeaderBonusAmount)} (
            {amounts.teamLeaderPercentApplied}%)
            {" · "}임원 {formatKRW(amounts.executiveBonusAmount)} (
            {amounts.executivePercentApplied}%)
          </>
        )}
      </p>
    </div>
  );
}

function ClientDepositModal({
  open,
  onClose,
  contracts,
  filter,
  canEdit,
  depositDates,
  onDepositDateChange,
  onSetStatus,
  data,
}: {
  open: boolean;
  onClose: () => void;
  contracts: Contract[];
  filter: ClientDepositStatus | "all";
  canEdit: boolean;
  depositDates: Record<string, string>;
  onDepositDateChange: (contractId: string, date: string) => void;
  onSetStatus: (contract: Contract, status: ClientDepositStatus) => void;
  data: AppData;
}) {
  const title =
    filter === "all"
      ? `입금확인 고객사 (${contracts.length}곳)`
      : `${CLIENT_DEPOSIT_STATUS_LABELS[filter]} (${contracts.length}곳)`;

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <p className="mb-4 text-sm text-zinc-500">
        연장 계약으로 전환된 고객사의 광고비 입금 여부를 확인합니다.
      </p>
      <div className="max-h-[min(60vh,480px)] space-y-3 overflow-y-auto">
        {contracts.map((c) => {
          const status = resolveClientDepositStatus(c);
          const scheduled = c.lastClientDepositDate
            ? calcScheduledPayDate(c.lastClientDepositDate)
            : null;

          return (
            <div
              key={c.id}
              className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 font-medium text-zinc-100">
                    <Building2 className="h-4 w-4 text-zinc-500" />
                    {c.clientName}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {getTeamName(data, c.teamId)} ·{" "}
                    {getUserName(data, c.assignedStaffId)} · 재계약{" "}
                    {c.renewalMonthCount}월차
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    월 광고비 {formatKRW(c.monthlyFee)} · 계약{" "}
                    {c.contractStartDate} ~ {c.contractEndDate}
                  </p>
                  {c.lastClientDepositDate && scheduled && (
                    <p className="mt-1 text-xs text-cyan-400/90">
                      입금일 {c.lastClientDepositDate} → 성과급 지급 예정{" "}
                      {scheduled}
                    </p>
                  )}
                  <BonusDepositAmountBlock contract={c} data={data} />
                </div>
                <Badge variant={CLIENT_DEPOSIT_STATUS_VARIANT[status]}>
                  {CLIENT_DEPOSIT_STATUS_LABELS[status]}
                </Badge>
              </div>

              {canEdit && (
                <div className="mt-3 space-y-2 border-t border-zinc-800/80 pt-3">
                  <div className="flex flex-wrap gap-1.5">
                    {DEPOSIT_STATUS_ORDER.map((s) => (
                      <Button
                        key={s}
                        type="button"
                        size="sm"
                        variant={status === s ? "primary" : "secondary"}
                        onClick={() => onSetStatus(c, s)}
                      >
                        {CLIENT_DEPOSIT_STATUS_LABELS[s]}
                      </Button>
                    ))}
                  </div>
                  {status === "completed" && (
                    <Input
                      label="입금 확인일"
                      type="date"
                      value={
                        depositDates[c.id] ||
                        c.lastClientDepositDate ||
                        new Date().toISOString().slice(0, 10)
                      }
                      onChange={(e) => onDepositDateChange(c.id, e.target.value)}
                      className="max-w-xs"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
        {contracts.length === 0 && (
          <p className="py-12 text-center text-sm text-zinc-500">
            해당 상태의 고객사가 없습니다
          </p>
        )}
      </div>
    </Modal>
  );
}

export function ClientDepositConfirmPanel() {
  const data = useData();
  const { canManageFinanceOps } = useRole();
  const { updateClientDepositStatus } = data;

  const contracts = useMemo(() => getDepositConfirmContracts(data), [data]);
  const counts = useMemo(() => countDepositByStatus(contracts), [contracts]);

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<ClientDepositStatus | "all">("all");
  const [depositDates, setDepositDates] = useState<Record<string, string>>({});

  const modalContracts = useMemo(() => {
    if (filter === "all") return contracts;
    return contracts.filter((c) => resolveClientDepositStatus(c) === filter);
  }, [contracts, filter]);

  function openModal(status?: ClientDepositStatus) {
    setFilter(status ?? "all");
    setOpen(true);
  }

  function setStatus(contract: Contract, status: ClientDepositStatus) {
    if (!canManageFinanceOps) return;
    const date =
      status === "completed"
        ? depositDates[contract.id] || contract.lastClientDepositDate
        : undefined;
    updateClientDepositStatus(contract.id, status, date);
  }

  return (
    <>
      <Card glow={counts.pending > 0}>
        <CardHeader
          title="입금확인 업무"
          subtitle="연장 계약 전환 고객 · 재무담당 입금 여부 확인"
          action={
            counts.pending > 0 ? (
              <Badge variant="warning">{counts.pending}건 확인 필요</Badge>
            ) : undefined
          }
        />
        <div className="flex flex-wrap gap-2">
          {DEPOSIT_STATUS_ORDER.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => openModal(status)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors hover:border-emerald-500/30 hover:bg-zinc-900",
                counts[status] > 0
                  ? "border-zinc-700 bg-zinc-950/50"
                  : "border-zinc-800/60 bg-zinc-950/30 text-zinc-600",
              )}
            >
              <span>{CLIENT_DEPOSIT_STATUS_LABELS[status]}</span>
              <span className="font-mono text-base font-bold text-emerald-400">
                {counts[status]}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => openModal()}
            className="rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
          >
            전체 {contracts.length}곳 보기
          </button>
        </div>
        {!canManageFinanceOps && (
          <p className="mt-3 text-xs text-zinc-600">
            상태 변경은 재무담당 권한이 필요합니다.
          </p>
        )}
      </Card>

      <ClientDepositModal
        open={open}
        onClose={() => setOpen(false)}
        contracts={modalContracts}
        filter={filter}
        canEdit={canManageFinanceOps}
        depositDates={depositDates}
        onDepositDateChange={(id, date) =>
          setDepositDates((prev) => ({ ...prev, [id]: date }))
        }
        onSetStatus={setStatus}
        data={data}
      />
    </>
  );
}

/** 성과급 결재 카드 — 입금확인 업무 + 숫자 클릭 시 고객사 목록 */
export function ClientDepositTaskLine({
  contractId,
  scheduledPayDate,
  paidAt,
}: {
  contractId: string;
  scheduledPayDate?: string;
  paidAt?: string;
}) {
  const data = useData();
  const { canManageFinanceOps } = useRole();
  const { updateClientDepositStatus } = data;
  const [open, setOpen] = useState(false);
  const [depositDates, setDepositDates] = useState<Record<string, string>>({});

  const contract = data.contracts.find((c) => c.id === contractId);
  const pendingCount = useMemo(
    () => countDepositByStatus(getDepositConfirmContracts(data)).pending,
    [data],
  );

  if (!contract) return null;

  const status = resolveClientDepositStatus(contract);

  function setStatus(c: Contract, next: ClientDepositStatus) {
    if (!canManageFinanceOps) return;
    const date =
      next === "completed"
        ? depositDates[c.id] || c.lastClientDepositDate
        : undefined;
    updateClientDepositStatus(c.id, next, date);
  }

  if (paidAt) {
    return (
      <p className="text-xs text-emerald-400/90">
        입금확인 완료 · 실제 지급일 {paidAt}
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <ClipboardCheck className="h-3.5 w-3.5 text-zinc-500" />
        <span className="text-zinc-500">입금확인 업무</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md bg-zinc-800/80 px-1.5 py-0.5 font-medium text-amber-400 hover:bg-zinc-800"
        >
          {CLIENT_DEPOSIT_STATUS_LABELS[status]}
        </button>
        {pendingCount > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-mono font-semibold text-amber-400 hover:underline"
          >
            ({pendingCount})
          </button>
        )}
        {scheduledPayDate && status === "completed" && (
          <span className="text-zinc-500">
            · 입금 확인 → 지급 예정{" "}
            <span className="font-medium text-cyan-400">{scheduledPayDate}</span>
            {contract && (
              <>
                {" "}
                ·{" "}
                <span className="font-medium text-emerald-400">
                  {formatKRW(
                    calcBonusAmounts(contract, data.bonusPolicy, data)
                      .totalAmount,
                  )}
                </span>
              </>
            )}
          </span>
        )}
      </div>

      <ClientDepositModal
        open={open}
        onClose={() => setOpen(false)}
        contracts={[contract]}
        filter="all"
        canEdit={canManageFinanceOps}
        depositDates={depositDates}
        onDepositDateChange={(id, date) =>
          setDepositDates((prev) => ({ ...prev, [id]: date }))
        }
        onSetStatus={setStatus}
        data={data}
      />
    </>
  );
}
