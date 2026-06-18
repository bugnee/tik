"use client";

import { useEffect, useState } from "react";
import { Link2, Save } from "lucide-react";
import { SaveButton } from "@/components/ui/SaveButton";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/FormFields";
import {
  CLIENT_LINK_FIELD_CONFIG,
  getContractClientLinksInput,
  getAvailableClientLinks,
  normalizeClientLinksInput,
  type ClientLinksInput,
} from "@/lib/client-links-utils";
import { valuesEqual } from "@/lib/form-dirty";
import { cn } from "@/lib/cn";
import type { Contract } from "@/lib/types";

/** 계약 생성·수정 폼용 링크 입력 필드 */
export function ClientLinksFields({
  value,
  onChange,
}: {
  value: ClientLinksInput;
  onChange: (next: ClientLinksInput) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-cyan-300/90">
        <Link2 className="h-3.5 w-3.5" />
        고객사 채널 링크
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CLIENT_LINK_FIELD_CONFIG.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            type="url"
            value={value[field.field] ?? ""}
            onChange={(e) =>
              onChange({ ...value, [field.field]: e.target.value })
            }
            placeholder={field.placeholder}
          />
        ))}
      </div>
    </div>
  );
}

/** 고객사 포털 · 계약 상세용 링크 편집/조회 패널 */
export function ClientLinksPanel({
  contract,
  readOnly = false,
  onSave,
  className,
}: {
  contract: Contract;
  readOnly?: boolean;
  onSave?: (input: ClientLinksInput) => void;
  className?: string;
}) {
  const value = getContractClientLinksInput(contract);
  const [draft, setDraft] = useState<ClientLinksInput>(value);
  const [baseline, setBaseline] = useState(value);
  const dirty = !valuesEqual(draft, baseline);
  const available = getAvailableClientLinks(contract);

  useEffect(() => {
    setDraft(value);
    setBaseline(value);
  }, [
    contract.placeLink,
    contract.instagramLink,
    contract.youtubeLink,
    contract.otherLink,
  ]);

  function handleSave() {
    const normalized = normalizeClientLinksInput(draft);
    onSave?.(normalized);
    setBaseline(normalized);
    setDraft(normalized);
  }

  return (
    <Card glow className={cn("border-cyan-500/25", className)}>
      <CardHeader
        title="고객사 채널 링크"
        subtitle="플레이스 · 인스타 · 유튜브 · 기타 — 실행 등록 시 다중 선택으로 활용"
      />
      <div className="space-y-4 px-4 pb-4">
        {!readOnly && onSave ? (
          <>
            <ClientLinksFields value={draft} onChange={setDraft} />
            <div className="flex justify-end">
              <SaveButton dirty={dirty} onClick={handleSave} disabled={!dirty}>
                <Save className="h-4 w-4" />
                저장
              </SaveButton>
            </div>
          </>
        ) : available.length === 0 ? (
          <p className="text-sm text-zinc-500">등록된 채널 링크가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {available.map((item) => (
              <li
                key={item.key}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2.5"
              >
                <p className="text-xs font-medium text-zinc-400">{item.label}</p>
                <a
                  href={
                    item.url.startsWith("http") ? item.url : `https://${item.url}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block truncate text-sm text-emerald-400 hover:underline"
                >
                  {item.url}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
