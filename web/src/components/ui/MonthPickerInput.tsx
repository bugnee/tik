"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { fieldControlClass, fieldLabelClass } from "@/components/ui/FormFields";
import { cn } from "@/lib/cn";
import { DEMO_TODAY } from "@/lib/contract-lifecycle";
import {
  formatMonthDisplay,
  formatMonthValue,
  parseMonthValue,
} from "@/lib/date-input-utils";

type MonthPickerInputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function MonthPickerInput({
  label,
  value,
  onChange,
  className,
  id: idProp,
}: MonthPickerInputProps) {
  const autoId = useId();
  const triggerId = idProp ?? autoId;
  const popoverId = `${triggerId}-popover`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const parsed = parseMonthValue(value || DEMO_TODAY.slice(0, 7));
  const [viewYear, setViewYear] = useState(parsed.year);

  // 팝오버 열릴 때 표시 연도를 현재 값과 동기화
  useEffect(() => {
    if (open) {
      setViewYear(parseMonthValue(value || DEMO_TODAY.slice(0, 7)).year);
    }
  }, [open, value]);

  // 바깥 클릭·Escape로 닫기
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function selectMonth(month: number) {
    onChange(formatMonthValue(viewYear, month));
    setOpen(false);
  }

  function goToThisMonth() {
    onChange(DEMO_TODAY.slice(0, 7));
    setOpen(false);
  }

  function resetValue() {
    onChange("");
    setOpen(false);
  }

  const selected = value ? parseMonthValue(value) : null;
  const displayText = value ? formatMonthDisplay(value) : "월 선택";

  return (
    <div ref={containerRef} className={cn("relative space-y-1.5", className)}>
      {label && (
        <label htmlFor={triggerId} className={fieldLabelClass}>
          {label}
        </label>
      )}
      <button
        id={triggerId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          fieldControlClass,
          "flex items-center justify-between gap-2 text-left",
        )}
      >
        <span className={cn(!value && "text-zinc-600")}>{displayText}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={label ?? "월 선택"}
          className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-zinc-700/80 bg-zinc-950 p-3 shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              aria-label="이전 연도"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-zinc-200">
              {viewYear}년
            </span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              aria-label="다음 연도"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {MONTHS.map((month) => {
              const isSelected =
                selected?.year === viewYear && selected?.month === month;
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => selectMonth(month)}
                  aria-pressed={isSelected}
                  className={cn(
                    "rounded-lg py-2 text-sm font-medium tabular-nums transition-colors",
                    isSelected
                      ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                      : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100",
                  )}
                >
                  {month}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2 border-t border-zinc-800 pt-3">
            <button
              type="button"
              onClick={resetValue}
              className="flex-1 rounded-lg border border-zinc-700/80 px-2 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={goToThisMonth}
              className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/20"
            >
              이번 달
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
