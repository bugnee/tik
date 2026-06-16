"use client";

import { Select } from "@/components/ui/FormFields";
import { cn } from "@/lib/cn";
import {
  CONTRACT_PERIOD_MODE_LABELS,
  getBillingCycles,
  type BillingCycle,
  type ContractPeriodSelection,
  type ContractPeriodViewMode,
  type ResolvedContractPeriod,
} from "@/lib/contract-period-utils";
import type { Contract, ContractRecord } from "@/lib/types";

const MODES: ContractPeriodViewMode[] = ["cycle30", "month", "year"];

type ContractPeriodSelectorProps = {
  contract: Contract;
  records: ContractRecord[];
  value: ContractPeriodSelection;
  onChange: (value: ContractPeriodSelection) => void;
  resolved: ResolvedContractPeriod;
  className?: string;
};

export function ContractPeriodSelector({
  contract,
  records,
  value,
  onChange,
  resolved,
  className,
}: ContractPeriodSelectorProps) {
  const cycles = getBillingCycles(contract, records);

  function setMode(mode: ContractPeriodViewMode) {
    onChange({ ...value, mode });
  }

  function patch(partial: Partial<ContractPeriodSelection>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 sm:p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          계약 기간 조회
        </span>
        <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMode(mode)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                value.mode === mode
                  ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30"
                  : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300",
              )}
            >
              {CONTRACT_PERIOD_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-cyan-400/90">{resolved.label}</span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {value.mode === "cycle30" && (
          <CycleSelect
            cycles={cycles}
            cycleIndex={value.cycleIndex}
            onChange={(cycleIndex) => patch({ cycleIndex })}
          />
        )}
        {value.mode === "month" && (
          <Select
            label="월 선택"
            value={value.month}
            onChange={(e) => patch({ month: e.target.value })}
            className="w-44"
          >
            {buildMonthOptions(contract, records).map((month) => (
              <option key={month} value={month}>
                {month.replace("-", "년 ")}월
              </option>
            ))}
          </Select>
        )}
        {value.mode === "year" && (
          <Select
            label="년 선택"
            value={value.year}
            onChange={(e) => patch({ year: e.target.value.slice(0, 4) })}
            className="w-32"
          >
            {buildYearOptions(contract, records).map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </Select>
        )}
        <p className="text-xs text-zinc-600">
          월단위 계약 · {resolved.start} ~ {resolved.end}
        </p>
      </div>
    </div>
  );
}

function CycleSelect({
  cycles,
  cycleIndex,
  onChange,
}: {
  cycles: BillingCycle[];
  cycleIndex: number;
  onChange: (index: number) => void;
}) {
  return (
    <Select
      label="30일 회차"
      value={String(cycleIndex)}
      onChange={(e) => onChange(Number(e.target.value))}
      className="min-w-[280px]"
    >
      {cycles.map((cycle) => (
        <option key={cycle.index} value={cycle.index}>
          {cycle.label}
        </option>
      ))}
    </Select>
  );
}

function buildMonthOptions(
  contract: Contract,
  records: ContractRecord[],
): string[] {
  const fromRecords = [...new Set(records.map((r) => r.period))].sort();
  if (fromRecords.length > 0) return fromRecords;

  const months = new Set<string>();
  const startYear = Number(contract.contractStartDate.slice(0, 4));
  const startMonth = Number(contract.contractStartDate.slice(5, 7));
  const count = Math.max(contract.renewalMonthCount, 1);
  for (let i = 0; i < count; i++) {
    const d = new Date(startYear, startMonth - 1 + i, 1);
    months.add(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return [...months].sort();
}

function buildYearOptions(
  contract: Contract,
  records: ContractRecord[],
): string[] {
  const years = new Set<string>();
  records.forEach((r) => years.add(r.period.slice(0, 4)));
  years.add(contract.contractStartDate.slice(0, 4));
  years.add(contract.contractEndDate.slice(0, 4));
  return [...years].sort();
}
