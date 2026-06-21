import Link from "next/link";

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--accent)]">
        ← 홈
      </Link>
      <h1 className="text-2xl font-bold">이용가이드</h1>
      <div className="rounded-2xl border border-[var(--border)] bg-white p-6 text-sm leading-relaxed text-[var(--foreground-secondary)]">
        <ol className="list-decimal space-y-3 pl-5">
          <li>원하는 체험단을 검색하거나 홈 섹션에서 선택합니다.</li>
          <li>상세 페이지에서 제공 혜택과 채널 조건을 확인합니다.</li>
          <li>로그인 후 신청합니다. (MVP — 추후 Supabase 연동)</li>
          <li>선정 결과는 마이페이지에서 확인합니다. (준비 중)</li>
        </ol>
      </div>
    </div>
  );
}
