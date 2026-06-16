"use client";

import { Link2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/FormFields";
import { createEmptyPostLink, getValidPostLinks, migratePostLinks, todayISO } from "@/lib/execution-utils";
import type { PostLinkEntry } from "@/lib/types";

export function PostLinksField({
  links,
  onChange,
  defaultDueDate,
}: {
  links: PostLinkEntry[];
  onChange: (links: PostLinkEntry[]) => void;
  defaultDueDate?: string;
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
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
          <Link2 className="h-3.5 w-3.5" />
          포스팅 링크 · 업무별 일정
        </label>
        <span className="text-[10px] text-zinc-600">
          링크 입력 시 입력일·완료일 자동 기록
        </span>
      </div>
      <div className="space-y-3">
        {items.map((link, i) => (
          <div
            key={link.id}
            className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 space-y-2"
          >
            <Input
              type="url"
              label={`포스팅 URL ${i + 1}`}
              placeholder="https://blog.naver.com/..."
              value={link.url}
              onChange={(e) => updateUrl(i, e.target.value)}
            />
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                label="마감일"
                type="date"
                value={link.dueDate ?? defaultDueDate ?? ""}
                onChange={(e) => update(i, { dueDate: e.target.value })}
              />
              <Input
                label="완료일"
                type="date"
                value={link.completedDate ?? ""}
                onChange={(e) => update(i, { completedDate: e.target.value })}
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
        ))}
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
      {valid.map((link) => (
        <div key={link.id} className="text-xs">
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
          <p className="text-[10px] text-zinc-600">
            마감 {link.dueDate || "-"} · 완료 {link.completedDate || "-"}
          </p>
        </div>
      ))}
    </div>
  );
}
