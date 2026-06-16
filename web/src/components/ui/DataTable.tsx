import { cn } from "@/lib/cn";

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
        <h1 className="text-xl font-bold tracking-tight text-zinc-50 sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
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
  placeholder = "검색...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 w-full max-w-xs rounded-xl border border-zinc-700 bg-zinc-950/60 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none sm:w-64"
    />
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center text-sm text-zinc-500">{message}</div>
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
    <div className={cn("overflow-x-auto rounded-xl border border-zinc-800/80 sm:rounded-2xl", className)}>
      <table className="w-full min-w-[480px] text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-zinc-800 bg-zinc-900/80 px-2 py-2 text-left text-xs font-medium text-zinc-500 sm:px-4 sm:py-3",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-zinc-800/50 px-2 py-2 text-zinc-300 sm:px-4 sm:py-3", className)}>
      {children}
    </td>
  );
}

export function Tr({ children }: { children: React.ReactNode }) {
  return (
    <tr className="transition-colors hover:bg-zinc-900/40">{children}</tr>
  );
}
