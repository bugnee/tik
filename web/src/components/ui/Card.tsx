import { cn } from "@/lib/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export function Card({ children, className, glow }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--card-muted)] p-4 backdrop-blur-sm sm:rounded-2xl sm:p-5",
        glow && "shadow-[0_0_40px_-12px_rgba(16,185,129,0.25)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-[var(--muted)]">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
