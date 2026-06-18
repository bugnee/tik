import { cn } from "@/lib/cn";
import { GlossaryFieldLabel, GlossaryHint } from "@/components/ui/GlossaryHint";
import {
  formatNumberWithCommas,
  sanitizeNumericInput,
} from "@/lib/finance";
import { forwardRef } from "react";

const fieldLabelClass =
  "block text-xs font-semibold tracking-wide text-zinc-500";
const fieldControlClass =
  "h-10 w-full rounded-xl border border-zinc-700/80 bg-zinc-950/90 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30";
const textareaControlClass =
  "min-h-[80px] w-full rounded-xl border border-zinc-700/80 bg-zinc-950/90 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    /** label에 마케팅 용어 설명(호버) 연결 */
    labelGlossary?: boolean;
    error?: string;
    /** type="number"일 때 천 단위 콤마 비활성 (연도 등) */
    commaFormat?: boolean;
  }
>(
  (
    {
      className,
      label,
      labelGlossary,
      error,
      id,
      type,
      value,
      onChange,
      step,
      min,
      max,
      commaFormat = true,
      ...props
    },
    ref,
  ) => {
    const isNumeric = type === "number";
    const allowDecimal =
      step !== undefined &&
      !Number.isInteger(Number(step)) &&
      !Number.isNaN(Number(step));
    const useCommaFormat = isNumeric && commaFormat;
    const displayValue = useCommaFormat
      ? formatNumberWithCommas(value as string | number)
      : value;

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      if (!useCommaFormat || !onChange) {
        onChange?.(e);
        return;
      }

      const sanitized = sanitizeNumericInput(e.target.value, allowDecimal);
      onChange({
        ...e,
        target: { ...e.target, value: sanitized },
        currentTarget: { ...e.currentTarget, value: sanitized },
      });
    }

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className={fieldLabelClass}>
            {labelGlossary ? <GlossaryFieldLabel label={label} /> : label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            fieldControlClass,
            error && "border-rose-500/50",
            useCommaFormat && "font-mono tabular-nums",
            className,
          )}
          {...props}
          type={useCommaFormat ? "text" : type}
          inputMode={
            useCommaFormat ? (allowDecimal ? "decimal" : "numeric") : props.inputMode
          }
          min={useCommaFormat ? undefined : min}
          max={useCommaFormat ? undefined : max}
          step={useCommaFormat ? undefined : step}
          value={displayValue ?? ""}
          onChange={handleChange}
        />
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }
>(({ className, label, id, children, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && (
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
    )}
    <select
      ref={ref}
      id={id}
      className={cn(fieldControlClass, className)}
      {...props}
    >
      {children}
    </select>
  </div>
));
Select.displayName = "Select";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }
>(({ className, label, id, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && (
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
    )}
    <textarea
      ref={ref}
      id={id}
      className={cn(textareaControlClass, className)}
      {...props}
    />
  </div>
));
Textarea.displayName = "Textarea";

export function Checkbox({
  label,
  labelGlossary,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  labelGlossary?: boolean | string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const glossaryKey = typeof labelGlossary === "string" ? labelGlossary : label;

  return (
    <label
      className={cn(
        "flex items-center gap-2 text-sm text-[var(--foreground-secondary)]",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30 disabled:cursor-not-allowed"
      />
      {labelGlossary ? (
        <GlossaryHint text={glossaryKey}>{label}</GlossaryHint>
      ) : (
        label
      )}
    </label>
  );
}
