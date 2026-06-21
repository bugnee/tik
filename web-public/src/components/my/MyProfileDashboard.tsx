"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import type { PublicCampaignApplication } from "@tripitkorea/shared/public-campaign";
import type { PublicReviewerSession } from "@/lib/auth-utils";
import {
  REVIEWER_SNS_LABELS,
  buildReviewerStats,
  type ReviewerProfile,
  type ReviewerSnsPlatform,
} from "@/lib/reviewer-profile-utils";
import { cn } from "@/lib/cn";

const STATUS_LABEL: Record<string, string> = {
  pending: "심사 중",
  selected: "선정",
  rejected: "미선정",
  cancelled: "취소됨",
};

type MainTab = "profile" | "edit";
type HistoryTab = "ongoing" | "completed";

export function MyProfileDashboard({
  reviewer,
  profile,
  applications,
  getCampaignTitle,
  onSaveProfile,
  onCancelApplication,
  initialTab = "profile",
}: {
  reviewer: PublicReviewerSession;
  profile: ReviewerProfile;
  applications: PublicCampaignApplication[];
  getCampaignTitle: (listingId: string) => string;
  onSaveProfile: (next: ReviewerProfile) => void;
  onCancelApplication: (applicationId: string) => void;
  initialTab?: MainTab;
}) {
  const [mainTab, setMainTab] = useState<MainTab>(initialTab);
  const [historyTab, setHistoryTab] = useState<HistoryTab>("ongoing");
  const [draft, setDraft] = useState(profile);

  useEffect(() => {
    setMainTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const stats = useMemo(() => buildReviewerStats(applications), [applications]);

  const ongoing = applications.filter(
    (a) => a.status === "pending" || a.status === "selected",
  );
  const completed = applications.filter(
    (a) => a.status === "rejected" || a.status === "cancelled",
  );
  const cancelledOnly = applications.filter((a) => a.status === "cancelled");

  const displayName =
    profile.nickname?.trim() || reviewer.name || "닉네임을 생성해 주세요";

  const statCells = [
    { label: "방문수", value: stats.visitCount },
    {
      label: "활동지역",
      value: profile.activityRegion?.trim() || "미등록",
      muted: !profile.activityRegion,
    },
    { label: "취소횟수", value: stats.cancellationCount },
    { label: "하트수", value: stats.heartCount },
    { label: "협찬체험", value: stats.sponsorshipCount },
    {
      label: "활동주제",
      value: profile.activityTopic?.trim() || "미등록",
      muted: !profile.activityTopic,
    },
    { label: "페널티", value: stats.penaltyCount },
    { label: "평가", value: stats.evaluationCount },
  ];

  const historyItems =
    historyTab === "ongoing"
      ? ongoing
      : historyTab === "completed"
        ? completed
        : cancelledOnly;

  return (
    <div className="min-w-0 flex-1 space-y-6">
      {/* 상단 탭 */}
      <div className="flex gap-6 border-b border-[var(--border)]">
        {(
          [
            { id: "profile" as const, label: "프로필" },
            { id: "edit" as const, label: "프로필 관리" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMainTab(tab.id)}
            className={cn(
              "-mb-px border-b-2 pb-3 text-sm font-semibold transition",
              mainTab === tab.id
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mainTab === "profile" ? (
        <>
          {/* 프로필 요약 */}
          <section className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-2xl font-bold text-slate-500">
                {displayName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--accent)] px-2 text-xs font-bold text-white">
                    Lv.{Math.max(1, stats.sponsorshipCount + 1)}
                  </span>
                  <h1 className="truncate text-lg font-bold">{displayName}</h1>
                  <button
                    type="button"
                    onClick={() => setMainTab("edit")}
                    className="rounded p-1 text-[var(--muted)] hover:bg-slate-100"
                    aria-label="프로필 수정"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {reviewer.channelHandle ?? reviewer.email}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
              {statCells.map((cell) => (
                <div
                  key={cell.label}
                  className="bg-white px-3 py-3 text-center sm:px-4 sm:py-4"
                >
                  <p className="text-[11px] text-[var(--muted)]">{cell.label}</p>
                  <p
                    className={cn(
                      "mt-1 text-base font-bold",
                      cell.muted && "text-[var(--muted)]",
                    )}
                  >
                    {cell.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* SNS 연동 */}
          <section className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
            <h2 className="text-sm font-bold">
              SNS · 원활한 활동을 위해 계정을 등록해 주세요
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(Object.keys(REVIEWER_SNS_LABELS) as ReviewerSnsPlatform[]).map(
                (platform) => {
                  const link = profile.sns[platform];
                  return (
                    <div
                      key={platform}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {REVIEWER_SNS_LABELS[platform]}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                          {link.registered && link.label
                            ? link.label
                            : "미등록"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMainTab("edit")}
                        className={cn(
                          "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold",
                          link.registered
                            ? "text-[var(--accent)] hover:underline"
                            : "bg-[var(--accent)] text-white hover:opacity-90",
                        )}
                      >
                        {link.registered ? "변경" : "등록하기"}
                      </button>
                    </div>
                  );
                },
              )}
            </div>
          </section>

          {/* 체험단 이력 */}
          <section className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
            <div className="flex gap-4 border-b border-[var(--border)]">
              {(
                [
                  { id: "ongoing" as const, label: "진행중 체험단" },
                  { id: "completed" as const, label: "진행 완료 체험단" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHistoryTab(tab.id)}
                  className={cn(
                    "-mb-px border-b-2 pb-2 text-sm font-semibold transition",
                    historyTab === tab.id
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-transparent text-[var(--muted)]",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {historyItems.length === 0 ? (
                <p className="py-12 text-center text-sm text-[var(--muted)]">
                  내역이 없습니다.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {historyItems.map((app) => (
                    <li key={app.id} className="py-4 first:pt-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/campaigns/${app.listingId}`}
                            className="font-semibold hover:text-[var(--accent)]"
                          >
                            {getCampaignTitle(app.listingId)}
                          </Link>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            신청{" "}
                            {new Date(app.createdAt).toLocaleDateString("ko-KR")}
                            {app.preferredVisitDate
                              ? ` · 방문 ${app.preferredVisitDate}`
                              : ""}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                          {STATUS_LABEL[app.status] ?? app.status}
                        </span>
                      </div>
                      {app.status === "pending" ? (
                        <button
                          type="button"
                          onClick={() => onCancelApplication(app.id)}
                          className="mt-2 text-xs text-[var(--muted)] hover:text-[var(--danger)]"
                        >
                          신청 취소
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      ) : (
        /* 프로필 관리 */
        <section className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold">프로필 관리</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            닉네임·활동 정보·SNS 계정을 등록하면 체험단 선정에 도움이 됩니다.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-[var(--muted)]">
                닉네임
              </span>
              <input
                value={draft.nickname ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, nickname: e.target.value }))
                }
                placeholder="닉네임을 생성해 주세요"
                className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[var(--muted)]">
                활동 지역
              </span>
              <input
                value={draft.activityRegion ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    activityRegion: e.target.value,
                  }))
                }
                placeholder="예: 경기/수원"
                className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[var(--muted)]">
                활동 주제
              </span>
              <input
                value={draft.activityTopic ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    activityTopic: e.target.value,
                  }))
                }
                placeholder="예: 맛집·카페"
                className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-sm font-bold">SNS 계정</p>
            {(Object.keys(REVIEWER_SNS_LABELS) as ReviewerSnsPlatform[]).map(
              (platform) => (
                <label key={platform} className="block">
                  <span className="text-xs font-medium text-[var(--muted)]">
                    {REVIEWER_SNS_LABELS[platform]}
                  </span>
                  <input
                    value={draft.sns[platform].label}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        sns: {
                          ...prev.sns,
                          [platform]: {
                            label: e.target.value,
                            registered: e.target.value.trim().length > 0,
                          },
                        },
                      }))
                    }
                    placeholder={
                      platform === "blog"
                        ? "blog.naver.com/아이디"
                        : "@아이디 또는 URL"
                    }
                    className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
                  />
                </label>
              ),
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onSaveProfile(draft);
                setMainTab("profile");
              }}
              className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(profile);
                setMainTab("profile");
              }}
              className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm text-[var(--muted)] hover:bg-slate-50"
            >
              취소
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
