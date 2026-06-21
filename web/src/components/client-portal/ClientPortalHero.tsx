"use client";

import { Sparkles, Link2, CalendarCheck, Handshake } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  clientPortalProgressTone,
  type ClientPartnershipStats,
  type ClientRenewalInsight,
} from "@/lib/client-portal-utils";
import { CircularProgressRing } from "./CircularProgressRing";
import { cn } from "@/lib/cn";

export function ClientPortalHero({
  clientName,
  periodLabel,
  completion,
  periodProgress,
  stats,
  renewal,
  badges,
}: {
  clientName: string;
  periodLabel: string;
  completion: number;
  periodProgress: number;
  stats: ClientPartnershipStats;
  renewal: ClientRenewalInsight;
  badges: React.ReactNode;
}) {
  const tone = clientPortalProgressTone(periodProgress);

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/12 via-zinc-900/50 to-zinc-950 shadow-xl shadow-emerald-950/20">
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:p-8">
        <div>
          <div className="flex items-center gap-2 text-emerald-300/90">
            <Sparkles className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wider">
              트립잇코리아 · 고객사 포털
            </p>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
            {clientName}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {renewal.headline}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{renewal.subline}</p>
          <div className="mt-4 flex flex-wrap gap-2">{badges}</div>
          <p className="mt-4 text-xs text-zinc-600">{periodLabel}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 lg:justify-end">
          <CircularProgressRing
            value={periodProgress}
            tone={tone}
            label="기간 진행"
            sublabel="선택 기간 집행 진행율"
            size={128}
          />
          <CircularProgressRing
            value={completion}
            tone={clientPortalProgressTone(completion)}
            label="전체 달성"
            sublabel="계약 목표 대비"
            size={104}
            strokeWidth={8}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-emerald-500/10 bg-zinc-950/40 sm:grid-cols-4">
        <HeroStat
          icon={Handshake}
          label="함께한 기간"
          value={`${stats.renewalMonths}개월`}
          accent="text-emerald-300"
        />
        <HeroStat
          icon={Link2}
          label="누적 게시물"
          value={`${stats.totalLinks}건`}
          accent="text-emerald-400"
        />
        <HeroStat
          icon={CalendarCheck}
          label="완료 업무"
          value={`${stats.completedWorkOrders}건`}
          accent="text-cyan-400"
        />
        <HeroStat
          icon={Sparkles}
          label="서비스 회차"
          value={`${stats.partnershipRecords}회`}
          accent="text-amber-400"
        />
      </div>
    </section>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Link2;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="border-r border-emerald-500/10 px-4 py-4 last:border-r-0">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", accent)} />
        <p className="text-[11px] text-zinc-500">{label}</p>
      </div>
      <p className={cn("mt-1 text-lg font-bold tabular-nums", accent)}>{value}</p>
    </div>
  );
}
