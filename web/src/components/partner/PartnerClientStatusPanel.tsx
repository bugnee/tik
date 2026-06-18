"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronRight, Plus, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SaveButton } from "@/components/ui/SaveButton";
import { Input, Textarea } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { PeriodFilterBar } from "@/components/ui/PeriodFilterBar";
import { StatCard } from "@/components/ui/StatCard";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { formatKRW } from "@/lib/finance";
import {
  buildPartnerReferralRows,
  createDefaultPeriodFilter,
  filterPartnerReferralRows,
  partnerReferralRowsForPipeline,
  periodFilterLabel,
  summarizePartnerReferralRows,
  type PartnerReferralRow,
  type PeriodFilterValue,
} from "@/lib/partner-referral-utils";
import { PIPELINE_CATEGORY_LABELS, type PipelineCategory } from "@/lib/types";
import { cn } from "@/lib/cn";

export function PartnerClientStatusPanel({
  periodFilter: controlledPeriod,
}: {
  periodFilter?: PeriodFilterValue;
} = {}) {
  const data = useData();
  const { currentUser } = useRole();
  const { addPartnerReferralLead } = data;
  const partnerId = currentUser.partnerId ?? "";

  const [internalPeriod, setInternalPeriod] = useState(createDefaultPeriodFilter);
  const periodFilter = controlledPeriod ?? internalPeriod;
  const [modalCategory, setModalCategory] = useState<PipelineCategory | "all" | null>(
    null,
  );
  const [clientName, setClientName] = useState("");
  const [memo, setMemo] = useState("");
  const [estimatedFee, setEstimatedFee] = useState("");
  const referralFormDirty = Boolean(
    clientName.trim() || memo.trim() || estimatedFee.trim(),
  );

  const allRows = useMemo(
    () => buildPartnerReferralRows(data, partnerId),
    [data, partnerId],
  );

  const filteredRows = useMemo(
    () => filterPartnerReferralRows(allRows, periodFilter),
    [allRows, periodFilter],
  );

  const summary = useMemo(
    () => summarizePartnerReferralRows(filteredRows),
    [filteredRows],
  );

  const modalRows = useMemo(() => {
    if (!modalCategory || modalCategory === "all") return filteredRows;
    return partnerReferralRowsForPipeline(filteredRows, modalCategory);
  }, [filteredRows, modalCategory]);

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !partnerId) return;
    addPartnerReferralLead({
      partnerId,
      clientName: clientName.trim(),
      memo: memo.trim(),
      introducedAt: new Date().toISOString().slice(0, 10),
      estimatedMonthlyFee: estimatedFee ? Number(estimatedFee) : undefined,
    });
    setClientName("");
    setMemo("");
    setEstimatedFee("");
  }

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 lg:p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-200">고객사 현황</h2>
        <p className="text-xs text-zinc-500">
          리셀러 등록 · 진행 확인 · 계약금액 · 지급 예정 수수료 (10%)
        </p>
      </div>

      {!controlledPeriod && (
        <PeriodFilterBar
          value={periodFilter}
          onChange={setInternalPeriod}
          summary={`${periodFilterLabel(periodFilter)} · ${summary.count}건 · 계약금액 ${formatKRW(summary.totalMonthlyFee)} · 수수료 ${formatKRW(summary.totalCommission)}`}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="리셀러 고객"
          value={`${summary.count}곳`}
          subValue={`계약 연동 ${summary.contracted} · 대기 ${summary.pending}`}
          icon={Building2}
          accent="cyan"
          onValueClick={() => setModalCategory("all")}
        />
        <StatCard
          label="계약금액 합계"
          value={formatKRW(summary.totalMonthlyFee)}
          subValue={`${periodFilterLabel(periodFilter)} 월 광고비`}
          icon={UserPlus}
          accent="emerald"
        />
        <StatCard
          label="지급 예정 수수료"
          value={formatKRW(summary.totalCommission)}
          subValue="월 광고비 × 10%"
          icon={UserPlus}
          accent="rose"
        />
      </div>

      <form
        onSubmit={handleRegister}
        className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
      >
        <p className="mb-3 text-sm font-medium text-zinc-200">리셀러 고객 등록</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="업체명 *"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="예: OO카페"
            required
          />
          <Input
            label="예상 월 광고비"
            type="number"
            step={10000}
            value={estimatedFee}
            onChange={(e) => setEstimatedFee(e.target.value)}
            placeholder="800000"
          />
          <div className="sm:col-span-2">
            <Textarea
              label="메모"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              placeholder="리셀러 경로 · 미팅 내용 · 진행 메모"
            />
          </div>
        </div>
        <SaveButton type="submit" size="sm" className="mt-3" dirty={referralFormDirty}>
          <Plus className="h-4 w-4" />
          등록
        </SaveButton>
      </form>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/60 text-left text-xs text-zinc-500">
              <th className="px-3 py-2.5 font-medium">등록일</th>
              <th className="px-3 py-2.5 font-medium">업체</th>
              <th className="px-3 py-2.5 font-medium">메모</th>
              <th className="px-3 py-2.5 font-medium">진행</th>
              <th className="px-3 py-2.5 font-medium">계약금액</th>
              <th className="px-3 py-2.5 font-medium">예정 수수료</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <PartnerReferralTableRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
        {filteredRows.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-500">
            선택 기간에 등록된 리셀러 고객이 없습니다.
          </p>
        )}
      </div>

      <PartnerReferralListModal
        open={modalCategory !== null}
        onClose={() => setModalCategory(null)}
        title={
          modalCategory === "all"
            ? `리셀러 고객 (${modalRows.length}곳)`
            : `${PIPELINE_CATEGORY_LABELS[modalCategory as PipelineCategory]} (${modalRows.length}곳)`
        }
        rows={modalRows}
      />
    </div>
  );
}

function PartnerReferralTableRow({ row }: { row: PartnerReferralRow }) {
  const router = useRouter();

  return (
    <tr
      className={cn(
        "border-b border-zinc-800/50 text-zinc-300",
        row.contractId && "cursor-pointer hover:bg-zinc-900/60",
      )}
      onClick={() => {
        if (row.contractId) router.push(`/contracts/${row.contractId}`);
      }}
    >
      <td className="whitespace-nowrap px-3 py-2.5 text-xs">{row.introducedAt}</td>
      <td className="px-3 py-2.5 font-medium text-zinc-100">{row.clientName}</td>
      <td className="max-w-[220px] truncate px-3 py-2.5 text-xs text-zinc-500">
        {row.memo || "-"}
      </td>
      <td className="px-3 py-2.5">
        <Badge
          variant={
            row.status === "in_progress"
              ? "success"
              : row.status === "extension_imminent"
                ? "warning"
                : row.status === "registered"
                  ? "info"
                  : "danger"
          }
        >
          {row.statusLabel}
        </Badge>
        {row.progressPercent != null && (
          <span className="ml-1 text-[10px] text-zinc-600">
            {row.progressPercent}%
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs">
        {row.monthlyFee > 0 ? formatKRW(row.monthlyFee) : "-"}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-rose-400/90">
        {row.commission > 0 ? formatKRW(row.commission) : "-"}
      </td>
    </tr>
  );
}

function PartnerReferralListModal({
  open,
  onClose,
  title,
  rows,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  rows: PartnerReferralRow[];
}) {
  const router = useRouter();

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <div className="space-y-2">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            disabled={!row.contractId}
            onClick={() => {
              if (!row.contractId) return;
              onClose();
              router.push(`/contracts/${row.contractId}`);
            }}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-left",
              row.contractId && "hover:border-emerald-500/30 hover:bg-zinc-900",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-100">{row.clientName}</p>
              <p className="mt-1 text-xs text-zinc-500">
                등록 {row.introducedAt} · {row.statusLabel}
              </p>
              {row.memo && (
                <p className="mt-1 text-xs text-zinc-600">{row.memo}</p>
              )}
              <p className="mt-1 text-xs text-zinc-500">
                계약금액 {formatKRW(row.monthlyFee)} · 예정 수수료{" "}
                <span className="text-rose-400/90">
                  {formatKRW(row.commission)}
                </span>
              </p>
            </div>
            {row.contractId && (
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-600" />
            )}
          </button>
        ))}
      </div>
    </Modal>
  );
}
