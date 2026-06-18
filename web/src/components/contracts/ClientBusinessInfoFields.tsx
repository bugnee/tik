"use client";

import { Building2 } from "lucide-react";
import { Input } from "@/components/ui/FormFields";
import {
  CLIENT_BUSINESS_INFO_FIELDS,
  type ClientBusinessInfoInput,
} from "@/lib/client-business-info-utils";

/** 계약 생성·수정 — 고객사 사업자·연락처 입력 */
export function ClientBusinessInfoFields({
  value,
  onChange,
}: {
  value: ClientBusinessInfoInput;
  onChange: (next: ClientBusinessInfoInput) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-sky-500/15 bg-sky-500/5 p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sky-300/90">
        <Building2 className="h-3.5 w-3.5" />
        고객사 사업자 · 연락처
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CLIENT_BUSINESS_INFO_FIELDS.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            type={field.type ?? "text"}
            value={value[field.key] ?? ""}
            onChange={(e) =>
              onChange({ ...value, [field.key]: e.target.value })
            }
            placeholder={field.placeholder}
          />
        ))}
      </div>
    </div>
  );
}
