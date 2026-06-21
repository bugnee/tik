"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PublicCampaignListing } from "@tripitkorea/shared/public-campaign";
import {
  formatApplicationRatio,
  formatDeadlineLabel,
} from "@tripitkorea/shared/public-campaign";
import { usePublicAuth } from "@/context/PublicAuthContext";
import { usePublicPortal } from "@/context/PublicPortalContext";
import { cn } from "@/lib/cn";

export function CampaignApplySidebar({
  campaign,
  onApplied,
}: {
  campaign: PublicCampaignListing;
  onApplied?: () => void;
}) {
  const { reviewer } = usePublicAuth();
  const { hasApplied, applyToCampaign } = usePublicPortal();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const visitDates = campaign.detail?.availableVisitDates ?? [];
  const applied = reviewer && hasApplied(campaign.id, reviewer.id);
  const thumbnail =
    campaign.detail?.thumbnailUrl ??
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop";

  const calendarDays = useMemo(() => {
    if (visitDates.length === 0) return [];
    const sorted = [...visitDates].sort();
    const first = new Date(sorted[0] + "T12:00:00");
    const year = first.getFullYear();
    const month = first.getMonth();
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dateSet = new Set(sorted);
    const cells: Array<{ day: number | null; date?: string; selectable?: boolean }> =
      [];
    for (let i = 0; i < startPad; i++) cells.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        day: d,
        date: iso,
        selectable: dateSet.has(iso),
      });
    }
    return cells;
  }, [visitDates]);

  const monthLabel =
    visitDates.length > 0
      ? new Date(visitDates[0] + "T12:00:00").toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
        })
      : null;

  return (
    <aside className="w-full shrink-0 lg:w-[320px]">
      <div className="sticky top-20 space-y-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
        <div className="overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnail}
            alt=""
            className="aspect-[4/3] w-full object-cover"
          />
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-slate-50 p-2.5">
            <dt className="text-[11px] text-[var(--muted)]">마감</dt>
            <dd className="mt-0.5 font-semibold">
              {formatDeadlineLabel(campaign.deadlineAt)}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-2.5">
            <dt className="text-[11px] text-[var(--muted)]">신청</dt>
            <dd className="mt-0.5 font-semibold">
              {formatApplicationRatio(campaign)}
            </dd>
          </div>
        </dl>

        {visitDates.length > 0 && monthLabel ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--foreground-secondary)]">
              방문 일정 선택 · {monthLabel}
            </p>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
              {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
                <span key={w} className="py-1 font-medium text-[var(--muted)]">
                  {w}
                </span>
              ))}
              {calendarDays.map((cell, index) =>
                cell.day === null ? (
                  <span key={`empty-${index}`} />
                ) : (
                  <button
                    key={cell.date}
                    type="button"
                    disabled={!cell.selectable}
                    onClick={() =>
                      cell.selectable && cell.date
                        ? setSelectedDate(cell.date)
                        : undefined
                    }
                    className={cn(
                      "rounded-md py-1.5 font-medium transition",
                      !cell.selectable && "text-slate-300",
                      cell.selectable &&
                        selectedDate === cell.date &&
                        "bg-[var(--accent)] text-white",
                      cell.selectable &&
                        selectedDate !== cell.date &&
                        "bg-sky-50 text-[var(--accent)] hover:bg-sky-100",
                    )}
                  >
                    {cell.day}
                  </button>
                ),
              )}
            </div>
            {selectedDate ? (
              <p className="mt-2 text-xs text-[var(--accent)]">
                선택: {selectedDate}
              </p>
            ) : (
              <p className="mt-2 text-xs text-[var(--muted)]">
                파란 날짜를 선택하세요
              </p>
            )}
          </div>
        ) : null}

        {!reviewer ? (
          <Link
            href={`/login?next=/campaigns/${campaign.id}`}
            className="flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-4 py-3.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            로그인하고 신청하기
          </Link>
        ) : applied || done ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <p className="font-semibold">신청 완료</p>
            <Link href="/my" className="mt-1 inline-block text-[var(--accent)] hover:underline">
              마이페이지 →
            </Link>
          </div>
        ) : (
          <>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="한 줄 소개 (선택)"
              className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            {error ? (
              <p className="text-xs text-[var(--danger)]">{error}</p>
            ) : null}
            <button
              type="button"
              disabled={visitDates.length > 0 && !selectedDate}
              onClick={() => {
                setError(null);
                if (visitDates.length > 0 && !selectedDate) {
                  setError("방문 일정을 선택해 주세요.");
                  return;
                }
                const result = applyToCampaign({
                  listingId: campaign.id,
                  campaignId: campaign.campaignId,
                  reviewerId: reviewer.id,
                  reviewerName: reviewer.name,
                  reviewerEmail: reviewer.email,
                  channelHandle: reviewer.channelHandle,
                  message: message.trim() || undefined,
                  preferredVisitDate: selectedDate ?? undefined,
                });
                if (!result.ok) {
                  setError(result.reason);
                  return;
                }
                setDone(true);
                onApplied?.();
              }}
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              신청하기
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
