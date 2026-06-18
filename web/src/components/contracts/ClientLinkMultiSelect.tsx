"use client";

import { useMemo, useState } from "react";
import {
  CheckSquare,
  ClipboardCopy,
  ExternalLink,
  Link2,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  CLIENT_LINK_FIELD_CONFIG,
  getAvailableClientLinks,
  type ClientLinkKey,
} from "@/lib/client-links-utils";
import type { Contract } from "@/lib/types";

/** 클립보드 API 실패 시 textarea fallback (포커스 없음 등) */
async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof document !== "undefined" && document.hasFocus()) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Clipboard API 거부 — fallback
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function ClientLinkMultiSelect({
  contract,
  onApply,
  className,
}: {
  contract: Contract;
  /** 선택한 URL 목록을 실행·포스팅 폼에 반영 */
  onApply: (urls: string[], selectedKeys: ClientLinkKey[]) => void;
  className?: string;
}) {
  const available = useMemo(
    () => getAvailableClientLinks(contract),
    [contract],
  );
  const [selected, setSelected] = useState<Set<ClientLinkKey>>(new Set());
  const [copied, setCopied] = useState(false);

  if (available.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 px-3 py-2.5 text-xs text-zinc-500",
          className,
        )}
      >
        등록된 고객사 링크가 없습니다. 계약 정보에서 플레이스·인스타·유튜브·기타 링크를
        먼저 입력해 주세요.
      </div>
    );
  }

  function toggle(key: ClientLinkKey, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(available.map((item) => item.key)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  const selectedItems = available.filter((item) => selected.has(item.key));

  function handleApply() {
    if (selectedItems.length === 0) return;
    onApply(
      selectedItems.map((item) => item.url),
      selectedItems.map((item) => item.key),
    );
  }

  async function handleCopy() {
    if (selectedItems.length === 0) return;
    const text = selectedItems.map((item) => `${item.label}: ${item.url}`).join("\n");
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-cyan-200/90">
          <Link2 className="h-3.5 w-3.5" />
          고객사 채널 링크 (다중 선택)
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" size="sm" variant="ghost" onClick={selectAll}>
            <CheckSquare className="h-3.5 w-3.5" />
            전체
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={clearAll}>
            <Square className="h-3.5 w-3.5" />
            해제
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {CLIENT_LINK_FIELD_CONFIG.map((field) => {
          const item = available.find((entry) => entry.key === field.key);
          if (!item) return null;

          return (
            <label
              key={field.key}
              className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-2.5 py-2"
            >
              <input
                type="checkbox"
                checked={selected.has(field.key)}
                onChange={(e) => toggle(field.key, e.target.checked)}
                className="mt-0.5 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-zinc-300">
                  {field.label}
                </span>
                <a
                  href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-[11px] text-emerald-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.url.replace(/^https?:\/\//, "")}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-cyan-500/10 pt-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleCopy}
          disabled={selectedItems.length === 0}
        >
          <ClipboardCopy className="h-3.5 w-3.5" />
          {copied ? "복사됨" : "클립보드 복사"}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleApply}
          disabled={selectedItems.length === 0}
        >
          선택 링크 적용 ({selectedItems.length})
        </Button>
      </div>
    </div>
  );
}
