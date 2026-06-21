"use client";

import Link from "next/link";
import { useState } from "react";
import { usePublicPortal } from "@/context/PublicPortalContext";

/** ERP 카탈로그 JSON 가져오기 — 운영자·개발용 */
export default function SyncPage() {
  const { importCatalogJson } = usePublicPortal();
  const [json, setJson] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--accent)]">
        ← 홈
      </Link>
      <h1 className="text-2xl font-bold">카탈로그 동기화</h1>
      <p className="text-sm text-[var(--muted)]">
        ERP(내부)에서 「공개 카탈로그 내보내기」로 복사한 JSON을 붙여 넣으세요.
      </p>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        rows={12}
        placeholder='{"campaigns":[...]}'
        className="w-full rounded-xl border border-[var(--border)] px-3 py-2 font-mono text-xs"
      />
      {message ? <p className="text-sm text-[var(--foreground-secondary)]">{message}</p> : null}
      <button
        type="button"
        onClick={() => {
          const result = importCatalogJson(json);
          setMessage(result.ok ? "카탈로그를 반영했습니다." : result.reason);
        }}
        className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white"
      >
        가져오기
      </button>
    </div>
  );
}
