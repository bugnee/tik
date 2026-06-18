"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { ExperienceRegistryPanel } from "@/components/experience/ExperienceRegistryPanel";
import { PageHeader } from "@/components/ui/DataTable";
import type { UserRole } from "@/lib/types";

const EXPERIENCE_REGISTRY_ROLES: UserRole[] = [
  "staff",
  "team_leader",
  "executive",
  "ceo",
  "finance_manager",
];

export function ExperiencePage() {
  const data = useData();
  const { activeRole } = useRole();

  // 체험단 대장은 역할과 무관하게 전체 고객사 조회
  const contractIds = useMemo(
    () => new Set(data.contracts.map((c) => c.id)),
    [data.contracts],
  );

  if (!EXPERIENCE_REGISTRY_ROLES.includes(activeRole)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="체험단"
        description="전체 고객사 체험단 · 파트너 · 전화번호 · 일정 조회"
        action={
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-cyan-400"
          >
            <ArrowLeft className="h-4 w-4" />
            대시보드
          </Link>
        }
      />

      <ExperienceRegistryPanel contractIds={contractIds} />
    </div>
  );
}
