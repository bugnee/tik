"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePublicAuth } from "@/context/PublicAuthContext";
import { usePublicPortal } from "@/context/PublicPortalContext";
import { MyPageSidebar } from "@/components/my/MyPageSidebar";
import { MyProfileDashboard } from "@/components/my/MyProfileDashboard";
import {
  readReviewerProfile,
  writeReviewerProfile,
  type ReviewerProfile,
} from "@/lib/reviewer-profile-utils";

export default function MyPageClient() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const { reviewer, logout, ready } = usePublicAuth();
  const { applications, getCampaignById, cancelApplication } = usePublicPortal();
  const [profile, setProfile] = useState<ReviewerProfile | null>(null);

  useEffect(() => {
    if (reviewer) {
      setProfile(readReviewerProfile(reviewer.id));
    }
  }, [reviewer]);

  const myApplications = useMemo(() => {
    if (!reviewer) return [];
    return applications
      .filter((item) => item.reviewerId === reviewer.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [applications, reviewer]);

  const initialTab = tab === "edit" ? "edit" : "profile";

  if (!ready) return null;

  if (!reviewer || !profile) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <p className="text-sm text-[var(--muted)]">로그인이 필요합니다.</p>
        <Link
          href="/login?next=/my"
          className="inline-flex rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white"
        >
          로그인
        </Link>
      </div>
    );
  }

  if (tab === "wishlist" || tab === "points") {
    return (
      <div className="flex flex-col gap-6 lg:flex-row">
        <MyPageSidebar onLogout={logout} />
        <div className="flex-1 rounded-2xl border border-[var(--border)] bg-white p-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            {tab === "wishlist" ? "찜목록" : "포인트"} 기능은 준비 중입니다.
          </p>
          <Link
            href="/campaigns"
            className="mt-3 inline-block text-sm text-[var(--accent)] hover:underline"
          >
            체험단 검색 →
          </Link>
        </div>
      </div>
    );
  }

  if (tab === "cancelled") {
    const cancelled = myApplications.filter((a) => a.status === "cancelled");
    return (
      <div className="flex flex-col gap-6 lg:flex-row">
        <MyPageSidebar onLogout={logout} />
        <div className="min-w-0 flex-1 space-y-4">
          <h1 className="text-xl font-bold">체험단 취소 내역</h1>
          {cancelled.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--border)] bg-white py-12 text-center text-sm text-[var(--muted)]">
              취소 내역이 없습니다.
            </p>
          ) : (
            cancelled.map((app) => (
              <div
                key={app.id}
                className="rounded-xl border border-[var(--border)] bg-white p-4"
              >
                <p className="font-semibold">
                  {getCampaignById(app.listingId)?.title ?? app.listingId}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {new Date(app.updatedAt).toLocaleDateString("ko-KR")} 취소
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <MyPageSidebar onLogout={logout} />
      <MyProfileDashboard
        reviewer={reviewer}
        profile={profile}
        applications={myApplications}
        getCampaignTitle={(id) => getCampaignById(id)?.title ?? id}
        onSaveProfile={(next) => {
          writeReviewerProfile(reviewer.id, next);
          setProfile(next);
        }}
        onCancelApplication={(id) => cancelApplication(id, reviewer.id)}
        initialTab={initialTab}
      />
    </div>
  );
}
