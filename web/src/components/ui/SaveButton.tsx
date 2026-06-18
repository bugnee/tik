import { cn } from "@/lib/cn";
import { Button, type ButtonProps } from "@/components/ui/Button";

export type SaveButtonProps = ButtonProps & {
  dirty?: boolean;
};

/** 저장·등록 버튼 — 입력 변경 시 시각적으로 강조 */
export function SaveButton({
  dirty = false,
  variant,
  className,
  children = "저장",
  ...props
}: SaveButtonProps) {
  return (
    <Button
      variant={dirty ? "primary" : (variant ?? "secondary")}
      dirty={dirty}
      className={cn(className)}
      {...props}
    >
      {children}
      {dirty && (
        <span className="ml-1.5 rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-normal leading-none text-amber-200">
          변경됨
        </span>
      )}
    </Button>
  );
}
