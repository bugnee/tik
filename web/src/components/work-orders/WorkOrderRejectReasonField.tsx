"use client";

import { Input, Select } from "@/components/ui/FormFields";
import {
  WORK_ORDER_REJECT_REASON_OTHER,
  type WorkOrderRejectReasonOption,
} from "@/lib/work-order-reject-utils";

type WorkOrderRejectReasonFieldProps = {
  options: WorkOrderRejectReasonOption[];
  presetId: string;
  onPresetChange: (id: string) => void;
  customText: string;
  onCustomTextChange: (text: string) => void;
  label?: string;
};

/** 반려 사유 — 드롭다운 선택 · 기타 시 추가 입력 */
export function WorkOrderRejectReasonField({
  options,
  presetId,
  onPresetChange,
  customText,
  onCustomTextChange,
  label = "반려 사유",
}: WorkOrderRejectReasonFieldProps) {
  const isOther = presetId === WORK_ORDER_REJECT_REASON_OTHER;

  return (
    <div className="space-y-3">
      <Select
        label={label}
        value={presetId}
        onChange={(event) => onPresetChange(event.target.value)}
      >
        <option value="">사유를 선택해 주세요</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </Select>

      {isOther && (
        <Input
          label="기타 사유"
          value={customText}
          onChange={(event) => onCustomTextChange(event.target.value)}
          placeholder="반려 사유를 입력해 주세요"
          autoFocus
        />
      )}
    </div>
  );
}
