"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AlertCircle,
  ChevronRight,
  MessageSquare,
  MessagesSquare,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import {
  getQaContractRows,
  getQaDashboardStats,
  getVisibleContractIds,
} from "@/lib/place-qa-utils";

export function PlaceQaDashboardPanel({
  title = "플레이스 · 문의 현황",
  showAllLink = true,
}: {
  title?: string;
  showAllLink?: boolean;
}) {
  const data = useData();
  const { currentUser, activeRole } = useRole();

  const contractIds = useMemo(
    () => getVisibleContractIds(data, activeRole, currentUser.id),
    [data, activeRole, currentUser.id],
  );

  const stats = useMemo(
    () => getQaDashboardStats(data, contractIds),
    [data, contractIds],
  );

  const rows = useMemo(
    () => getQaContractRows(data, contractIds),
    [data, contractIds],
  );

  const placeRegistered = data.placeCredentials.filter((p) =>
    contractIds.includes(p.contractId),
  ).length;

  return (
    <Card glow={stats.needsReply > 0}>
      <CardHeader
        title={title}
        subtitle={`문의 ${stats.totalThreads}건 · 링크 의견 ${stats.linkOpinions}건 · 미답변 ${stats.needsReply}건 · 플레이스 등록 ${placeRegistered}개 업체`}
        action={
          showAllLink ? (
            <Link href="/place-qa">
              <Button size="sm" variant="secondary">
                전체 보기
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="전체 문의"
          value={`${stats.totalThreads}건`}
          subValue="활성·종료 포함"
          icon={MessagesSquare}
          accent="cyan"
        />
        <StatCard
          label="미답변"
          value={`${stats.needsReply}건`}
          subValue="고객사 마지막 메시지"
          icon={AlertCircle}
          accent={stats.needsReply > 0 ? "rose" : "emerald"}
        />
        <StatCard
          label="진행 중"
          value={`${stats.openThreads}건`}
          subValue="종료되지 않은 문의"
          icon={MessageSquare}
          accent="amber"
        />
        <StatCard
          label="답변 완료"
          value={`${stats.answeredThreads}건`}
          subValue="당사 답변 후 대기"
          icon={MessageSquare}
          accent="emerald"
        />
      </div>

      {rows.length === 0 ? (
        <p className="pb-4 text-center text-sm text-zinc-500">
          아직 등록된 플레이스 문의가 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th className="pb-3 pr-4 font-medium">업체명</th>
                <th className="pb-3 pr-4 font-medium">담당</th>
                <th className="pb-3 pr-4 font-medium">문의</th>
                <th className="pb-3 pr-4 font-medium">링크 의견</th>
                <th className="pb-3 pr-4 font-medium">미답변</th>
                <th className="pb-3 font-medium">최근</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((row) => (
                <tr
                  key={row.contractId}
                  className="border-b border-zinc-800/50 text-zinc-400"
                >
                  <td className="py-3 pr-4">
                    <Link
                      href={`/contracts/${row.contractId}`}
                      className="font-medium text-zinc-200 hover:text-emerald-400"
                    >
                      {row.clientName}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">{row.assignedStaffName}</td>
                  <td className="py-3 pr-4 font-mono">{row.threadCount}건</td>
                  <td className="py-3 pr-4 font-mono">
                    {row.linkOpinionCount > 0 ? (
                      <Badge variant="info">{row.linkOpinionCount}건</Badge>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {row.needsReply > 0 ? (
                      <Badge variant="danger">{row.needsReply}건</Badge>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-3 text-xs">
                    {row.lastActivity ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
