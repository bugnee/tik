import { cn } from "@/lib/cn";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { SaveMetaHint } from "@/components/ui/SaveMetaHint";

export type SaveButtonProps = ButtonProps & {
  dirty?: boolean;
  /** 최종 저장일 (YYYY-MM-DD) */
  savedAt?: string;
  /** 저장한 사람 표시명 */
  savedBy?: string;
  /** 메타와 버튼 배치 — 기본 가로 */
  metaLayout?: "row" | "stack";
};

/** 저장·등록 버튼 — 앞에 최종 저장 일자·저장자, 변경 시 강조 */
export function SaveButton({
  dirty = false,
  variant,
  className,
  children = "저장",
  savedAt,
  savedBy,
  metaLayout = "row",
  ...props
}: SaveButtonProps) {
  return (
    <div
      className={cn(
        metaLayout === "stack"
          ? "inline-flex flex-col items-end gap-1.5"
          : "inline-flex flex-wrap items-center gap-2",
        className,
      )}
    >
      <SaveMetaHint savedAt={savedAt} savedBy={savedBy} />
      <Button
        variant={dirty ? "primary" : (variant ?? "secondary")}
        dirty={dirty}
        {...props}
      >
        {children}
        {dirty && (
          <span className="ml-1.5 rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-normal leading-none text-amber-200">
            변경됨
          </span>
        )}
      </Button>
    </div>
  );
}
