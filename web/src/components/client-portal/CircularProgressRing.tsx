import { cn } from "@/lib/cn";

const TONE_STROKE = {
  excellent: "stroke-emerald-400",
  good: "stroke-cyan-400",
  attention: "stroke-amber-400",
};

export function CircularProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  tone = "good",
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  tone?: keyof typeof TONE_STROKE;
  label?: string;
  sublabel?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-zinc-800"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={cn("transition-all duration-700", TONE_STROKE[tone])}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-zinc-50">
            {Math.round(clamped)}%
          </span>
          {label && (
            <span className="text-[10px] font-medium text-zinc-500">{label}</span>
          )}
        </div>
      </div>
      {sublabel && (
        <p className="max-w-[10rem] text-center text-[11px] text-zinc-500">
          {sublabel}
        </p>
      )}
    </div>
  );
}
