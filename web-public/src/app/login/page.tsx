import { Suspense } from "react";
import LoginPageClient from "./LoginPageClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm">불러오는 중…</div>}>
      <LoginPageClient />
    </Suspense>
  );
}
