import { Suspense } from "react";
import MyPageClient from "./MyPageClient";

export default function MyPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-[var(--muted)]">
          불러오는 중…
        </div>
      }
    >
      <MyPageClient />
    </Suspense>
  );
}
