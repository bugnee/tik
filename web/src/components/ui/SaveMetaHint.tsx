import { formatSaveMetaLine, type SaveMetaSnapshot } from "@/lib/save-meta-utils";
import { cn } from "@/lib/cn";

/** 저장 버튼 앞 — 최종 저장 일자 · 저장자 */
export function SaveMetaHint({
  savedAt,
  savedBy,
  className,
}: SaveMetaSnapshot & { className?: string }) {
  const line = formatSaveMetaLine({ savedAt, savedBy });
  const empty = !savedAt && !savedBy;

  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        empty ? "text-zinc-600" : "text-zinc-500",
        className,
      )}
    >
      {line}
    </span>
  );
}
