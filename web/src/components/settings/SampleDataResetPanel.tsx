"use client";

import { Database, RotateCcw } from "lucide-react";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DEMO_TODAY } from "@/lib/contract-lifecycle";

/** 데모·QA용 — localStorage ERP 데이터를 최신 시드로 되돌림 */
export function SampleDataResetPanel({ compact }: { compact?: boolean }) {
  const { resetData, contracts, users, experienceCampaigns } = useData();

  function handleReset() {
    const ok = confirm(
      [
        "샘플 데이터를 초기 상태로 되돌립니다.",
        "",
        "· 계약·실행·원가·성과급·체험단·Q&A 등 전체 ERP 데이터",
        "· 포털 '확인' 처리·입금 상태 변경 등 테스트 변경분",
        "",
        "로그인 계정은 유지됩니다. 계속하시겠습니까?",
      ].join("\n"),
    );
    if (!ok) return;
    resetData({ reload: true });
  }

  if (compact) {
    return (
      <Card className="border-dashed border-zinc-700/80 bg-zinc-950/40">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-start gap-2 text-xs text-zinc-500">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
            <span>
              테스트 후{" "}
              <span className="text-zinc-400">샘플 데이터 초기화</span> · 기준일{" "}
              {DEMO_TODAY}
            </span>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            초기화
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-amber-500/25 bg-amber-500/5">
      <CardHeader
        title="샘플 데이터 초기화"
        subtitle={`데모·테스트용 · 기준일 ${DEMO_TODAY} · 로그인 계정은 유지`}
        action={
          <Button type="button" variant="secondary" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            시드 데이터로 되돌리기
          </Button>
        }
      />
      <div className="space-y-2 px-4 pb-4 text-xs text-zinc-500">
        <p>
          현재 저장된 데이터: 계약 {contracts.length}건 · 사용자 {users.length}
          명 · 체험단 {experienceCampaigns?.length ?? 0}건
        </p>
        <p>
          초기화하면 입금 확인·성과급·체험단·Q&A 등 테스트 중 변경한 내용이
          모두 사라지고, 최신 시드(입금대기 33건 등) 상태로 복원됩니다.
        </p>
      </div>
    </Card>
  );
}
