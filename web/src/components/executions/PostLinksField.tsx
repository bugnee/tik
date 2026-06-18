"use client";

import { Link2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/FormFields";
import { cn } from "@/lib/cn";
import {
  createEmptyPostLink,
  DEADLINE_STAGE_DESC,
  DEADLINE_STAGE_STYLES,
  getDeadlineStage,
  getDeadlineStageBadgeVariant,
  getDeadlineStageLabel,
  getValidPostLinks,
  migratePostLinks,
  todayISO,
} from "@/lib/execution-utils";
import { applySelectedClientLinksToPostLinks } from "@/lib/client-links-utils";
import { ClientLinkMultiSelect } from "@/components/contracts/ClientLinkMultiSelect";
import type { Contract, PostLinkEntry } from "@/lib/types";

const STAGE_DOT: Record<keyof typeof DEADLINE_STAGE_STYLES, string> = {
  safe: "bg-emerald-400",
  warning: "bg-amber-400",
  urgent: "bg-orange-400",
  overdue: "bg-rose-400",
  completed: "bg-cyan-400",
};

const STAGE_LEGEND: Array<{
  stage: keyof typeof DEADLINE_STAGE_STYLES;
  label: string;
}> = [
  { stage: "safe", label: "여유" },
  { stage: "warning", label: "주의" },
  { stage: "urgent", label: "임박" },
  { stage: "overdue", label: "지연" },
  { stage: "completed", label: "완료" },
];

export function PostLinksField({
  links,
  onChange,
  defaultDueDate,
  contract,
}: {
  links: PostLinkEntry[];
  onChange: (links: PostLinkEntry[]) => void;
  defaultDueDate?: string;
  /** 연결 계약 — 고객사 채널 링크 다중 선택 제공 */
  contract?: Contract | null;
}) {
  const normalized = migratePostLinks(links, defaultDueDate);
  const items =
    normalized.length > 0 ? normalized : [createEmptyPostLink(defaultDueDate)];

  function update(index: number, patch: Partial<PostLinkEntry>) {
    const next = items.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );
    onChange(next);
  }

  function updateUrl(index: number, url: string) {
    const item = items[index];
    update(index, {
      url,
      enteredAt: item.enteredAt || todayISO(),
      completedDate: url.trim() ? item.completedDate || todayISO() : "",
    });
  }

  function addRow() {
    onChange([...items, createEmptyPostLink(defaultDueDate)]);
  }

  function removeRow(index: number) {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [createEmptyPostLink(defaultDueDate)]);
  }

  return (
    <div className="space-y-3">
      {contract && (
        <ClientLinkMultiSelect
          contract={contract}
          onApply={(_urls, selectedKeys) => {
            onChange(
              applySelectedClientLinksToPostLinks(
                selectedKeys,
                contract,
                items,
                defaultDueDate,
              ),
            );
          }}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
          <Link2 className="h-3.5 w-3.5" />
          포스팅 링크 · 업무별 일정
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {STAGE_LEGEND.map(({ stage, label }) => {
            const style = DEADLINE_STAGE_STYLES[stage];
            return (
              <span
                key={stage}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
                  style.bg,
                  style.text,
                  style.border,
                )}
                title={stage === "completed" ? "완료" : DEADLINE_STAGE_DESC[stage as keyof typeof DEADLINE_STAGE_DESC]}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", STAGE_DOT[stage])} />
                {label}
              </span>
            );
          })}
        </div>
      </div>
      <p className="text-[10px] text-zinc-600">
        링크 입력 시 입력일·완료일 자동 기록 · 마감일 기준 색상 구분
      </p>
      <div className="space-y-3">
        {items.map((link, i) => {
          const dueDate = link.dueDate ?? defaultDueDate ?? "";
          const stage = getDeadlineStage(dueDate, link.completedDate);
          const style = DEADLINE_STAGE_STYLES[stage];

          return (
          <div
            key={link.id}
            className={cn(
              "rounded-xl border p-3 space-y-2",
              style.border,
              style.bg,
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-zinc-300">
                포스팅 URL {i + 1}
              </p>
              <Badge variant={getDeadlineStageBadgeVariant(stage)}>
                {getDeadlineStageLabel(stage)}
              </Badge>
            </div>
            <Input
              type="url"
              placeholder="https://blog.naver.com/..."
              value={link.url}
              onChange={(e) => updateUrl(i, e.target.value)}
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                label="마감일"
                type="date"
                value={dueDate}
                onChange={(e) => update(i, { dueDate: e.target.value })}
                className={cn(style.border, stage !== "completed" && style.bg)}
              />
              <Input
                label="완료일"
                type="date"
                value={link.completedDate ?? ""}
                onChange={(e) => update(i, { completedDate: e.target.value })}
                className={cn(
                  link.completedDate && DEADLINE_STAGE_STYLES.completed.border,
                  link.completedDate && DEADLINE_STAGE_STYLES.completed.bg,
                )}
              />
              <Input
                label="입력일"
                type="date"
                value={link.enteredAt ?? ""}
                readOnly
                className="opacity-70"
              />
            </div>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                삭제
              </button>
            )}
          </div>
          );
        })}
      </div>
      <Button type="button" size="sm" variant="secondary" onClick={addRow}>
        <Plus className="h-3.5 w-3.5" />
        링크 · 업무 추가
      </Button>
    </div>
  );
}

export function PostLinksCell({
  links,
  fallbackDueDate,
}: {
  links?: PostLinkEntry[] | string[] | unknown;
  fallbackDueDate?: string;
}) {
  const valid = getValidPostLinks(links, fallbackDueDate);
  if (valid.length === 0) {
    return <span className="text-zinc-600">-</span>;
  }

  return (
    <div className="flex max-w-[240px] flex-col gap-2">
      {valid.map((link) => {
        const stage = getDeadlineStage(
          link.dueDate || fallbackDueDate,
          link.completedDate,
        );
        const style = DEADLINE_STAGE_STYLES[stage];

        return (
        <div
          key={link.id}
          className={cn(
            "rounded-lg border px-2 py-1.5 text-xs",
            style.border,
            style.bg,
          )}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <Badge
              variant={getDeadlineStageBadgeVariant(stage)}
              className="text-[10px]"
            >
              {getDeadlineStageLabel(stage)}
            </Badge>
          </div>
          <a
            href={
              link.url.startsWith("http") ? link.url : `https://${link.url}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-emerald-400 hover:underline"
            title={link.url}
          >
            {link.url.replace(/^https?:\/\//, "").slice(0, 36)}
            {link.url.length > 36 ? "…" : ""}
          </a>
          <p className={cn("text-[10px]", style.text)}>
            마감 {link.dueDate || "-"} · 완료 {link.completedDate || "-"}
          </p>
        </div>
        );
      })}
    </div>
  );
}
