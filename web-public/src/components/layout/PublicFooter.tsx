import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="mt-12 border-t border-[var(--border)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[var(--foreground)]">트립잇코리아 체험단</p>
          <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
            <Link href="/guide" className="hover:text-[var(--foreground)]">
              이용가이드
            </Link>
            <span>고객센터</span>
            <span>개인정보처리방침</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-[var(--muted)]">
          © {new Date().getFullYear()} 트립잇코리아 · 공개 포털
        </p>
      </div>
    </footer>
  );
}
