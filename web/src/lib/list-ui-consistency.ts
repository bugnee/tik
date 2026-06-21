import type { ClientDepositStatus, PayoutStatus } from "@/lib/types";

/** 목록·테이블 공통 안내 */
export const LIST_SORT_HINT = "열 헤더 클릭 · 정렬";

/** 화면별 검색 placeholder — 통일된 문구 */
export const LIST_SEARCH_PLACEHOLDERS = {
  default: "검색...",
  contracts: "상호명 · 회사명 · 담당자 · 지역 검색",
  expenses: "업체 · 수취인 · 계좌 검색",
  executions: "업체 · 유형 검색",
  partners: "업체명 · 담당 · 메모 · 계좌 · 지역 검색",
  workOrders: "업체명 · 담당자 · 업무 검색",
  experience: "고객사 · 파트너 · 체험단명 · 전화번호 검색",
  activity: "채널 · 이름 · 활동 검색",
  payoutQueue: "업체 · 수취인 · 계좌 검색",
} as const;

export type ListAccentTone =
  | "emerald"
  | "amber"
  | "rose"
  | "cyan"
  | "violet"
  | "sky"
  | "orange"
  | "zinc";

export type FilterChipStyleSet = {
  count: string;
  idle: string;
  active: string;
  empty: string;
};

/** 필터 칩 — 상태별 구분색 (입금·지급·파이프라인 공통 패턴) */
export const LIST_ACCENT_CHIP_STYLES: Record<ListAccentTone, FilterChipStyleSet> =
  {
    emerald: {
      count: "text-emerald-400",
      idle: "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 hover:bg-emerald-500/10",
      active:
        "border-emerald-400 bg-emerald-500/15 ring-1 ring-emerald-400/70 text-emerald-50",
      empty: "border-zinc-800/60 bg-zinc-950/30 text-zinc-600",
    },
    amber: {
      count: "text-amber-400",
      idle: "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 hover:bg-amber-500/10",
      active:
        "border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/70 text-amber-50",
      empty: "border-zinc-800/60 bg-zinc-950/30 text-zinc-600",
    },
    rose: {
      count: "text-rose-400",
      idle: "border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50 hover:bg-rose-500/10",
      active:
        "border-rose-400 bg-rose-500/15 ring-1 ring-rose-400/70 text-rose-50",
      empty: "border-zinc-800/60 bg-zinc-950/30 text-zinc-600",
    },
    cyan: {
      count: "text-cyan-400",
      idle: "border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500/50 hover:bg-cyan-500/10",
      active:
        "border-cyan-400 bg-cyan-500/15 ring-1 ring-cyan-400/70 text-cyan-50",
      empty: "border-zinc-800/60 bg-zinc-950/30 text-zinc-600",
    },
    violet: {
      count: "text-violet-400",
      idle: "border-violet-500/30 bg-violet-500/5 hover:border-violet-500/50 hover:bg-violet-500/10",
      active:
        "border-violet-400 bg-violet-500/15 ring-1 ring-violet-400/70 text-violet-50",
      empty: "border-zinc-800/60 bg-zinc-950/30 text-zinc-600",
    },
    sky: {
      count: "text-sky-400",
      idle: "border-sky-500/30 bg-sky-500/5 hover:border-sky-500/50 hover:bg-sky-500/10",
      active:
        "border-sky-400 bg-sky-500/15 ring-1 ring-sky-400/70 text-sky-50",
      empty: "border-zinc-800/60 bg-zinc-950/30 text-zinc-600",
    },
    orange: {
      count: "text-orange-400",
      idle: "border-orange-500/30 bg-orange-500/5 hover:border-orange-500/50 hover:bg-orange-500/10",
      active:
        "border-orange-400 bg-orange-500/15 ring-1 ring-orange-400/70 text-orange-50",
      empty: "border-zinc-800/60 bg-zinc-950/30 text-zinc-600",
    },
    zinc: {
      count: "text-zinc-400",
      idle: "border-zinc-700 bg-zinc-950/40 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200",
      active:
        "border-zinc-300 bg-zinc-800/80 text-zinc-100 ring-1 ring-zinc-300/60",
      empty: "border-zinc-800/60 bg-zinc-950/30 text-zinc-600",
    },
  };

export const FILTER_CHIP_ALL_STYLES = LIST_ACCENT_CHIP_STYLES.zinc;

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

/** 원가 지급 상태 → Badge variant */
export const PAYOUT_BADGE_VARIANT: Record<PayoutStatus, BadgeVariant> = {
  unpaid: "danger",
  pending_approval: "info",
  pending_transfer: "warning",
  paid: "success",
};

/** 원가 지급 상태 → 필터 칩 색상 */
export const PAYOUT_FILTER_TONE: Record<PayoutStatus, ListAccentTone> = {
  unpaid: "rose",
  pending_approval: "cyan",
  pending_transfer: "amber",
  paid: "emerald",
};

/** 입금 확인 상태 → 필터 칩 색상 (client-deposit-utils와 동일 체계) */
export const CLIENT_DEPOSIT_FILTER_TONE: Record<
  ClientDepositStatus,
  ListAccentTone
> = {
  pending: "amber",
  completed: "emerald",
  overdue: "rose",
  other: "cyan",
};

/** 다중 필드 검색 — 대소문자 무시 */
export function matchesListSearch(
  query: string,
  ...fields: (string | number | undefined | null)[]
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) =>
    String(field ?? "")
      .toLowerCase()
      .includes(q),
  );
}

export function compareStrings(
  a: string,
  b: string,
  locale: string | string[] = "ko",
): number {
  return a.localeCompare(b, locale);
}

export function compareNumbers(a: number, b: number): number {
  return a - b;
}
