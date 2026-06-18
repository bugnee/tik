"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  MessageSquare,
  MessagesSquare,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { useDashboardPeriodScope } from "@/context/DashboardPeriodContext";
import { useRole } from "@/context/RoleContext";
import { matchesPeriodDate } from "@/lib/date-filter-utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { QaThreadListModal } from "@/components/place-qa/QaThreadListModal";
import { QaContractTodoTags } from "@/components/place-qa/QaContractTodoTags";
import {
  getQaContractRows,
  getQaDashboardStats,
  getVisibleContractIds,
  threadNeedsStaffReply,
} from "@/lib/place-qa-utils";

export function PlaceQaDashboardPanel({
  title = "고객사 Q&A 현황",
  showAllLink = true,
}: {
  title?: string;
  showAllLink?: boolean;
}) {
  const data = useData();
  const { currentUser, activeRole } = useRole();
  const periodScope = useDashboardPeriodScope();
  const [qaModal, setQaModal] = useState<
    "all" | "needsReply" | "open" | "answered" | null
  >(null);

  const contractIds = useMemo(() => {
    const visible = getVisibleContractIds(data, activeRole, currentUser.id);
    return visible.filter((id) => periodScope.contractIds.has(id));
  }, [data, activeRole, currentUser.id, periodScope.contractIds]);

  const stats = useMemo(
    () => getQaDashboardStats(data, contractIds),
    [data, contractIds],
  );

  const visibleThreads = useMemo(
    () =>
      data.qaThreads.filter(
        (t) =>
          contractIds.includes(t.contractId) &&
          matchesPeriodDate(t.lastMessageAt, periodScope.periodFilter),
      ),
    [data.qaThreads, contractIds],
  );

  const needsReplyThreads = useMemo(
    () => visibleThreads.filter((t) => threadNeedsStaffReply(data, t)),
    [visibleThreads, data],
  );

  const openThreads = useMemo(
    () => visibleThreads.filter((t) => t.status !== "closed"),
    [visibleThreads],
  );

  const answeredThreads = useMemo(
    () => visibleThreads.filter((t) => t.status === "answered"),
    [visibleThreads],
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
          onValueClick={() => setQaModal("all")}
        />
        <StatCard
          label="미답변"
          value={`${stats.needsReply}건`}
          subValue="고객사 마지막 메시지"
          icon={AlertCircle}
          accent={stats.needsReply > 0 ? "rose" : "emerald"}
          onValueClick={() => setQaModal("needsReply")}
        />
        <StatCard
          label="진행 중"
          value={`${stats.openThreads}건`}
          subValue="종료되지 않은 문의"
          icon={MessageSquare}
          accent="amber"
          onValueClick={() => setQaModal("open")}
        />
        <StatCard
          label="답변 완료"
          value={`${stats.answeredThreads}건`}
          subValue="당사 답변 후 대기"
          icon={MessageSquare}
          accent="emerald"
          onValueClick={() => setQaModal("answered")}
        />
      </div>

      <QaThreadListModal
        open={qaModal === "all"}
        onClose={() => setQaModal(null)}
        title={`전체 문의 (${stats.totalThreads}건)`}
        description="활성·종료 포함 · 팀 담당 업체 기준"
        threads={visibleThreads}
        data={data}
      />
      <QaThreadListModal
        open={qaModal === "needsReply"}
        onClose={() => setQaModal(null)}
        title={`미답변 문의 (${stats.needsReply}건)`}
        description="고객사 마지막 메시지 · 답변 필요"
        threads={needsReplyThreads}
        data={data}
      />
      <QaThreadListModal
        open={qaModal === "open"}
        onClose={() => setQaModal(null)}
        title={`진행 중 문의 (${stats.openThreads}건)`}
        description="종료되지 않은 문의"
        threads={openThreads}
        data={data}
      />
      <QaThreadListModal
        open={qaModal === "answered"}
        onClose={() => setQaModal(null)}
        title={`답변 완료 (${stats.answeredThreads}건)`}
        description="당사 답변 후 고객 확인 대기"
        threads={answeredThreads}
        data={data}
      />

      {rows.length === 0 ? (
        <p className="pb-4 text-center text-sm text-zinc-500">
          아직 등록된 고객사 Q&A가 없습니다.
        </p>
      ) : (
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-zinc-800/80 bg-zinc-950/30 p-1">
          {rows.slice(0, 12).map((row) => (
            <Link
              key={row.contractId}
              href={`/place-qa?contract=${row.contractId}`}
              className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-cyan-500/5"
            >
              <span className="font-medium text-zinc-100">{row.clientName}</span>
              <span className="text-zinc-600">·</span>
              <QaContractTodoTags row={row} />
              {row.threadCount > 0 && row.needsReply === 0 && (
                <span className="text-[11px] text-zinc-500">
                  문의 {row.threadCount}건
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
