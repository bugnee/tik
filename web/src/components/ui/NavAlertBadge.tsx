/** Navbar·모바일 탭 알림 뱃지 */
export function NavAlertBadge({
  count,
  /** true면 라벨 옆 인라인 배치 (글자 겹침 방지) */
  inline = false,
}: {
  count: number;
  inline?: boolean;
}) {
  if (count <= 0) return null;

  const content = count > 99 ? "99+" : count;

  if (inline) {
    return (
      <span
        className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-zinc-950 shadow-sm"
        aria-label={`${count}건 알림`}
      >
        {content}
      </span>
    );
  }

  return (
    <span
      className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-zinc-950 shadow-sm"
      aria-label={`${count}건 알림`}
    >
      {content}
    </span>
  );
}
