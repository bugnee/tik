"use client";

import { useId, useMemo } from "react";
import { fieldControlClass, fieldLabelClass } from "@/components/ui/FormFields";
import { cn } from "@/lib/cn";
import {
  clampDay,
  daysInMonth,
  formatDateValue,
  parseDateValue,
} from "@/lib/date-input-utils";

type DatePickerInputProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  /** 연도 선택 범위 (기본 2020–2100) */
  minYear?: number;
  maxYear?: number;
};

const selectClass = cn(fieldControlClass, "px-2");

export function DatePickerInput({
  label,
  value,
  onChange,
  className,
  id: idProp,
  minYear = 2020,
  maxYear = 2100,
}: DatePickerInputProps) {
  const autoId = useId();
  const baseId = idProp ?? autoId;
  const parsed = parseDateValue(value);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);
    return years;
  }, [minYear, maxYear]);

  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => i + 1),
    [],
  );

  const dayOptions = useMemo(() => {
    const maxDay = daysInMonth(parsed.year, parsed.month);
    return Array.from({ length: maxDay }, (_, i) => i + 1);
  }, [parsed.year, parsed.month]);

  function patch(partial: Partial<typeof parsed>) {
    const next = {
      year: partial.year ?? parsed.year,
      month: partial.month ?? parsed.month,
      day: partial.day ?? parsed.day,
    };
    next.day = clampDay(next.year, next.month, next.day);
    onChange(formatDateValue(next.year, next.month, next.day));
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <span id={`${baseId}-label`} className={fieldLabelClass}>
          {label}
        </span>
      )}
      <div
        role="group"
        aria-labelledby={label ? `${baseId}-label` : undefined}
        className="flex items-center gap-1.5"
      >
        <select
          id={`${baseId}-year`}
          aria-label="연도"
          value={parsed.year}
          onChange={(e) => patch({ year: Number(e.target.value) })}
          className={cn(selectClass, "w-[5.5rem]")}
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-500">년</span>

        <select
          id={`${baseId}-month`}
          aria-label="월"
          value={parsed.month}
          onChange={(e) => patch({ month: Number(e.target.value) })}
          className={cn(selectClass, "w-[4rem]")}
        >
          {monthOptions.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-500">월</span>

        <select
          id={`${baseId}-day`}
          aria-label="일"
          value={clampDay(parsed.year, parsed.month, parsed.day)}
          onChange={(e) => patch({ day: Number(e.target.value) })}
          className={cn(selectClass, "w-[4rem]")}
        >
          {dayOptions.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-500">일</span>
      </div>
    </div>
  );
}
