import type { QaContractRow } from "@/lib/place-qa-utils";
import { cn } from "@/lib/cn";

/** Q&A 업체 목록 — 할 일 태그 종류 */
export type QaContractTodoTag = {
  id: string;
  label: string;
  tone: "rose" | "amber" | "cyan" | "emerald";
};

const TODO_TONE_CLASSES: Record<QaContractTodoTag["tone"], string> = {
  rose: "border-rose-500/30 bg-rose-500/15 text-rose-300",
  amber: "border-amber-500/30 bg-amber-500/15 text-amber-200",
  cyan: "border-cyan-500/30 bg-cyan-500/15 text-cyan-200",
  emerald: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
};

/** 업체별 Q&A 할 일 태그 목록 */
export function getQaContractTodoTags(row: QaContractRow): QaContractTodoTag[] {
  const tags: QaContractTodoTag[] = [];

  if (row.needsReply > 0) {
    tags.push({
      id: "needs-reply",
      label: `미답변 ${row.needsReply}`,
      tone: "rose",
    });
  }

  if (row.linkOpinionCount > 0) {
    tags.push({
      id: "link-opinion",
      label: `링크 의견 ${row.linkOpinionCount}`,
      tone: "cyan",
    });
  }

  if (row.hasPlaceSetting && !row.hasPlaceCredentials) {
    tags.push({
      id: "place-needed",
      label: "플레이스 등록 필요",
      tone: "amber",
    });
  } else if (row.hasPlaceCredentials) {
    tags.push({
      id: "place-registered",
      label: "플레이스 등록",
      tone: "emerald",
    });
  }

  return tags;
}

export function QaContractTodoTags({
  row,
  className,
}: {
  row: QaContractRow;
  className?: string;
}) {
  const tags = getQaContractTodoTags(row);
  if (tags.length === 0) return null;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      {tags.map((tag) => (
        <span
          key={tag.id}
          className={cn(
            "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
            TODO_TONE_CLASSES[tag.tone],
          )}
        >
          {tag.label}
        </span>
      ))}
    </span>
  );
}
