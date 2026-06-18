import { cn } from "@/lib/cn";
import { GlossaryHint } from "@/components/ui/GlossaryHint";
import { lookupMarketingGlossary } from "@/lib/marketing-glossary";

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  size = "md",
  color = "emerald",
  glossaryLabel,
}: {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md";
  color?: "emerald" | "cyan" | "amber";
  /** true면 label로 용어 설명 조회 */
  glossaryLabel?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const colors = {
    emerald: "bg-emerald-500",
    cyan: "bg-cyan-500",
    amber: "bg-amber-500",
  };

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label && (
            <span className="text-zinc-400">
              {glossaryLabel && lookupMarketingGlossary(label) ? (
                <GlossaryHint text={label} />
              ) : (
                label
              )}
            </span>
          )}
          {showValue && (
            <span className="font-mono font-medium text-zinc-300">
              {pct.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-zinc-800",
          size === "sm" ? "h-1.5" : "h-2.5",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            colors[color],
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
