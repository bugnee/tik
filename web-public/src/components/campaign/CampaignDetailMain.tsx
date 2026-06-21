"use client";

import {
  Camera,
  CheckCircle2,
  FileText,
  Hash,
  MapPin,
  Megaphone,
} from "lucide-react";
import type { PublicCampaignListing } from "@tripitkorea/shared/public-campaign";
import {
  PUBLIC_CAMPAIGN_CHANNEL_LABELS,
  PUBLIC_CAMPAIGN_DELIVERY_LABELS,
} from "@tripitkorea/shared/public-campaign";

export function CampaignDetailMain({
  campaign,
}: {
  campaign: PublicCampaignListing;
}) {
  const detail = campaign.detail;
  const mission = detail?.mission;

  return (
    <article className="min-w-0 space-y-6">
      {/* 제목·뱃지 */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--accent)]">
            {PUBLIC_CAMPAIGN_CHANNEL_LABELS[campaign.channel]}
          </span>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {PUBLIC_CAMPAIGN_DELIVERY_LABELS[campaign.deliveryType]}
          </span>
          {detail?.benefitAmountLabel ? (
            <span className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
              {detail.benefitAmountLabel}
            </span>
          ) : null}
        </div>
        <h1 className="mt-3 text-2xl font-bold leading-snug sm:text-3xl">
          {campaign.title}
        </h1>
        <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
          {campaign.benefitSummary}
        </p>
      </div>

      {/* 참여 안내 */}
      {detail?.participationSteps && detail.participationSteps.length > 0 ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <p className="mb-2 font-semibold">체험단 참여 방법</p>
          <ul className="space-y-1">
            {detail.participationSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 진행자 · 제공 */}
      <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
        {detail?.hostName ? (
          <div>
            <h2 className="text-sm font-bold text-[var(--foreground)]">진행자</h2>
            <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
              {detail.hostName}
            </p>
          </div>
        ) : null}

        {detail?.providedService ? (
          <div>
            <h2 className="text-sm font-bold text-[var(--foreground)]">
              제공 서비스/제품
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--foreground-secondary)]">
              {detail.providedService}
            </p>
          </div>
        ) : null}

        {detail?.address ? (
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <MapPin className="h-4 w-4 text-[var(--accent)]" />
              위치
            </h2>
            <div className="mt-2 overflow-hidden rounded-xl border border-[var(--border)] bg-slate-100">
              <div className="flex h-44 items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 text-xs text-[var(--muted)]">
                지도 · {detail.address}
              </div>
            </div>
            <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
              {detail.address}
            </p>
          </div>
        ) : null}

        {detail?.visitReservationLines &&
        detail.visitReservationLines.length > 0 ? (
          <div>
            <h2 className="text-sm font-bold">방문·예약 안내</h2>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--foreground-secondary)]">
              {detail.visitReservationLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {detail?.keywords && detail.keywords.length > 0 ? (
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <Hash className="h-4 w-4 text-[var(--accent)]" />
              키워드 안내
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {detail.keywords.map((kw) => (
                <span
                  key={kw}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* 체험 미션 */}
      {mission ? (
        <section className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
          <h2 className="text-sm font-bold">체험 미션</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {mission.minPhotos ? (
              <MissionChip
                icon={Camera}
                label={`사진 ${mission.minPhotos}+`}
              />
            ) : null}
            {mission.requireMapLink ? (
              <MissionChip icon={MapPin} label="지도·위치" />
            ) : null}
            {mission.minWords ? (
              <MissionChip
                icon={FileText}
                label={`${mission.minWords}자+`}
              />
            ) : null}
            {mission.requireSponsorshipNote ? (
              <MissionChip icon={Megaphone} label="협찬 표기" />
            ) : null}
            {mission.requireKeywords ? (
              <MissionChip icon={Hash} label="키워드" />
            ) : null}
          </div>
          {mission.items && mission.items.length > 0 ? (
            <ul className="mt-4 space-y-1.5 text-sm text-[var(--foreground-secondary)]">
              {mission.items.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  {item.label}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {/* 필수 확인 */}
      {detail?.checklist && detail.checklist.length > 0 ? (
        <section className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
          <h2 className="text-sm font-bold">필수 확인 사항</h2>
          <ul className="mt-3 space-y-2">
            {detail.checklist.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-[var(--foreground-secondary)]"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function MissionChip({
  icon: Icon,
  label,
}: {
  icon: typeof Camera;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--border)] bg-slate-50 px-2 py-3 text-center">
      <Icon className="h-5 w-5 text-[var(--accent)]" />
      <span className="text-[11px] font-semibold leading-tight">{label}</span>
    </div>
  );
}
