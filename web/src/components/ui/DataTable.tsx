import { cn } from "@/lib/cn";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { LIST_SEARCH_PLACEHOLDERS } from "@/lib/list-ui-consistency";

export { LIST_SORT_HINT } from "@/lib/list-ui-consistency";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end">
          {action}
        </div>
      )}
    </div>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder = LIST_SEARCH_PLACEHOLDERS.default,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full max-w-xs sm:w-64", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
      />
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center text-sm text-[var(--muted)]">{message}</div>
  );
}

export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-[var(--border)] sm:rounded-2xl", className)}>
      <table className="w-full min-w-[480px] text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-[var(--border)] bg-[var(--card-muted)] px-2 py-2 text-left text-xs font-medium text-[var(--muted)] sm:px-4 sm:py-3",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function SortableTh({
  children,
  className,
  active,
  direction,
  onClick,
}: {
  children?: React.ReactNode;
  className?: string;
  active?: boolean;
  direction?: "asc" | "desc";
  onClick?: () => void;
}) {
  const Icon = active
    ? direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <th
      className={cn(
        "border-b border-[var(--border)] bg-[var(--card-muted)] px-2 py-2 text-left text-xs font-medium sm:px-4 sm:py-3",
        className,
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-emerald-400",
          active ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--muted)]",
        )}
      >
        {children}
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
      </button>
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-[var(--border)] px-2 py-2 text-[var(--foreground-secondary)] sm:px-4 sm:py-3", className)}>
      {children}
    </td>
  );
}

export function Tr({ children }: { children: React.ReactNode }) {
  return (
    <tr className="transition-colors hover:bg-[var(--card-muted)]">{children}</tr>
  );
}
