"use client";

import { Checkbox } from "@/components/ui/FormFields";
import { cn } from "@/lib/cn";
import {
  canEnableExtensionContractCheckbox,
  getExtensionContractCheckboxGuide,
} from "@/lib/contract-terms-utils";

export function ExtensionContractCheckboxField({
  contractStartDate,
  checked,
  onChange,
  label = "연장 계약 (재계약 · 성과급 정책)",
}: {
  contractStartDate: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  const eligible = canEnableExtensionContractCheckbox(contractStartDate);
  const guide = getExtensionContractCheckboxGuide(contractStartDate);
  const disabled = !eligible && !checked;

  return (
    <div className="flex min-w-[260px] flex-1 flex-wrap items-center gap-x-3 gap-y-1">
      <Checkbox
        label={label}
        checked={checked}
        disabled={disabled}
        onChange={(value) => {
          if (value && !eligible) return;
          onChange(value);
        }}
      />
      <p
        className={cn(
          "text-xs leading-snug",
          eligible ? "text-emerald-400/85" : "text-zinc-500",
        )}
      >
        {guide}
      </p>
    </div>
  );
}
