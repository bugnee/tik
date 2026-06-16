import { cn } from "@/lib/cn";
import { forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }
>(({ className, label, error, id, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && (
      <label htmlFor={id} className="block text-xs font-medium text-zinc-400">
        {label}
      </label>
    )}
    <input
      ref={ref}
      id={id}
      className={cn(
        "h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 text-sm text-zinc-100",
        "placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30",
        error && "border-rose-500/50",
        className,
      )}
      {...props}
    />
    {error && <p className="text-xs text-rose-400">{error}</p>}
  </div>
));
Input.displayName = "Input";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }
>(({ className, label, id, children, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && (
      <label htmlFor={id} className="block text-xs font-medium text-zinc-400">
        {label}
      </label>
    )}
    <select
      ref={ref}
      id={id}
      className={cn(
        "h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 text-sm text-zinc-100",
        "focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30",
        className,
      )}
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
      <label htmlFor={id} className="block text-xs font-medium text-zinc-400">
        {label}
      </label>
    )}
    <textarea
      ref={ref}
      id={id}
      className={cn(
        "min-h-[80px] w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100",
        "placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30",
        className,
      )}
      {...props}
    />
  </div>
));
Textarea.displayName = "Textarea";

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/30"
      />
      {label}
    </label>
  );
}
