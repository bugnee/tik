"use client";

import { useState } from "react";
import { Globe, Copy, Eye } from "lucide-react";
import type { ExperienceCampaign, ExperiencePublicListing } from "@/lib/types";
import type { PublicCampaignDetailContent } from "@tripitkorea/shared/public-campaign";
import {
  PUBLIC_CAMPAIGN_CHANNEL_LABELS,
  PUBLIC_CAMPAIGN_DELIVERY_LABELS,
  SAMPLE_TAMRA_YUKHAE_DETAIL,
  createDefaultPublicCampaignDetail,
  type PublicCampaignChannel,
  type PublicCampaignDeliveryType,
} from "@tripitkorea/shared/public-campaign";
import { createDefaultPublicListing } from "@tripitkorea/shared/public-campaign";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/FormFields";

const CHANNEL_OPTIONS = Object.entries(PUBLIC_CAMPAIGN_CHANNEL_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const DELIVERY_OPTIONS = Object.entries(PUBLIC_CAMPAIGN_DELIVERY_LABELS).map(
  ([value, label]) => ({ value, label }),
);

function linesToText(lines?: string[]) {
  return lines?.join("\n") ?? "";
}

function textToLines(text: string): string[] | undefined {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : undefined;
}

function DetailFields({
  detail,
  onChange,
}: {
  detail: PublicCampaignDetailContent;
  onChange: (next: PublicCampaignDetailContent) => void;
}) {
  function patch(partial: Partial<PublicCampaignDetailContent>) {
    onChange({ ...detail, ...partial });
  }

  function patchMission(
    partial: Partial<NonNullable<PublicCampaignDetailContent["mission"]>>,
  ) {
    onChange({
      ...detail,
      mission: { ...detail.mission, ...partial },
    });
  }

  return (
    <div className="mt-4 space-y-4 border-t border-cyan-500/20 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/80">
        공개 모집 상세
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          label="진행자(업주)"
          value={detail.hostName ?? ""}
          onChange={(e) => patch({ hostName: e.target.value || undefined })}
        />
        <Input
          label="혜택 금액 표시"
          placeholder="50,000원"
          value={detail.benefitAmountLabel ?? ""}
          onChange={(e) =>
            patch({ benefitAmountLabel: e.target.value || undefined })
          }
        />
        <Input
          label="썸네일 URL"
          value={detail.thumbnailUrl ?? ""}
          onChange={(e) => patch({ thumbnailUrl: e.target.value || undefined })}
          className="sm:col-span-2"
        />
        <Textarea
          label="제공 서비스/제품"
          rows={2}
          value={detail.providedService ?? ""}
          onChange={(e) =>
            patch({ providedService: e.target.value || undefined })
          }
          className="sm:col-span-2"
        />
        <Input
          label="주소"
          value={detail.address ?? ""}
          onChange={(e) => patch({ address: e.target.value || undefined })}
          className="sm:col-span-2"
        />
        <Textarea
          label="방문·예약 안내 (한 줄씩)"
          rows={4}
          value={linesToText(detail.visitReservationLines)}
          onChange={(e) =>
            patch({ visitReservationLines: textToLines(e.target.value) })
          }
          className="sm:col-span-2"
        />
        <Textarea
          label="키워드 (한 줄씩)"
          rows={3}
          placeholder="인계동 맛집"
          value={linesToText(detail.keywords)}
          onChange={(e) => patch({ keywords: textToLines(e.target.value) })}
          className="sm:col-span-2"
        />
        <Textarea
          label="참여 방법 STEP (한 줄씩)"
          rows={3}
          value={linesToText(detail.participationSteps)}
          onChange={(e) =>
            patch({ participationSteps: textToLines(e.target.value) })
          }
          className="sm:col-span-2"
        />
        <Textarea
          label="필수 확인 (한 줄씩)"
          rows={3}
          value={linesToText(detail.checklist)}
          onChange={(e) => patch({ checklist: textToLines(e.target.value) })}
          className="sm:col-span-2"
        />
        <Textarea
          label="신청 가능 방문일 (YYYY-MM-DD, 한 줄씩)"
          rows={4}
          placeholder="2026-06-22"
          value={linesToText(detail.availableVisitDates)}
          onChange={(e) =>
            patch({ availableVisitDates: textToLines(e.target.value) })
          }
          className="sm:col-span-2"
        />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
        <p className="mb-2 text-xs font-medium text-zinc-300">체험 미션</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            label="최소 사진"
            type="number"
            value={detail.mission?.minPhotos ?? ""}
            onChange={(e) =>
              patchMission({
                minPhotos: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
          <Input
            label="최소 글자"
            type="number"
            value={detail.mission?.minWords ?? ""}
            onChange={(e) =>
              patchMission({
                minWords: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
          <label className="flex items-end gap-2 pb-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={detail.mission?.requireMapLink ?? false}
              onChange={(e) =>
                patchMission({ requireMapLink: e.target.checked })
              }
            />
            지도·위치 필수
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={detail.mission?.requireSponsorshipNote ?? false}
              onChange={(e) =>
                patchMission({ requireSponsorshipNote: e.target.checked })
              }
            />
            협찬 문구 필수
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={detail.mission?.requireKeywords ?? false}
              onChange={(e) =>
                patchMission({ requireKeywords: e.target.checked })
              }
            />
            키워드 필수
          </label>
        </div>
        <Textarea
          label="세부 미션 (한 줄씩 · 매장·음식·메뉴판 등)"
          rows={3}
          value={
            detail.mission?.items?.map((item) => item.label).join("\n") ?? ""
          }
          onChange={(e) => {
            const labels = textToLines(e.target.value) ?? [];
            patchMission({
              items: labels.map((label, index) => ({
                id: `m-${index}`,
                label,
              })),
            });
          }}
          className="mt-2"
        />
      </div>

      <Button
        size="sm"
        variant="ghost"
        type="button"
        onClick={() => onChange(SAMPLE_TAMRA_YUKHAE_DETAIL)}
      >
        샘플(탐라육해) 불러오기
      </Button>
    </div>
  );
}

export function ExperiencePublicListingEditor({
  campaign,
  userId,
  onSave,
}: {
  campaign: ExperienceCampaign;
  userId: string;
  onSave: (listing: ExperiencePublicListing | undefined) => void;
}) {
  const [listing, setListing] = useState<ExperiencePublicListing | undefined>(
    campaign.publicListing,
  );
  const [showPreviewHint, setShowPreviewHint] = useState(false);

  if (campaign.schedulingStatus !== "recruiting") {
    return (
      <p className="text-xs text-zinc-500">
        공개 포털 노출은 「참가자 접수(recruiting)」 상태에서 설정할 수 있습니다.
      </p>
    );
  }

  const enabled = listing?.visible ?? false;
  const detail = listing?.detail ?? createDefaultPublicCampaignDetail();

  function toggleEnabled(next: boolean) {
    if (!next) {
      setListing(undefined);
      onSave(undefined);
      return;
    }
    const draft = listing ?? createDefaultPublicListing(userId);
    const withDetail = draft.detail
      ? draft
      : { ...draft, detail: createDefaultPublicCampaignDetail() };
    setListing(withDetail);
    onSave(withDetail);
  }

  function patch(partial: Partial<ExperiencePublicListing>) {
    const base = listing ?? createDefaultPublicListing(userId);
    const next = {
      ...base,
      ...partial,
      visible: true,
      detail: partial.detail ?? base.detail ?? createDefaultPublicCampaignDetail(),
    };
    setListing(next);
    onSave(next);
  }

  const previewUrl = listing
    ? `http://localhost:3001/campaigns/pub-${campaign.id}`
    : "http://localhost:3001/campaigns/pub-sample-tamra";

  return (
    <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-cyan-200/90">
          <Globe className="h-4 w-4" />
          공개 포털 모집 설정
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => toggleEnabled(e.target.checked)}
            />
            공개 모집
          </label>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={() => setShowPreviewHint((v) => !v)}
          >
            <Eye className="h-3.5 w-3.5" />
            미리보기
          </Button>
        </div>
      </div>

      {showPreviewHint ? (
        <p className="mt-2 rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-[11px] text-zinc-400">
          공개 포털{" "}
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 underline-offset-2 hover:underline"
          >
            {previewUrl}
          </a>
          {" · "}
          저장 후 「공개 카탈로그 내보내기」→ /sync 동기화
        </p>
      ) : null}

      {enabled && listing ? (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Select
              label="채널"
              value={listing.channel}
              onChange={(e) =>
                patch({ channel: e.target.value as PublicCampaignChannel })
              }
            >
              {CHANNEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Select
              label="유형"
              value={listing.deliveryType}
              onChange={(e) =>
                patch({
                  deliveryType: e.target.value as PublicCampaignDeliveryType,
                })
              }
            >
              {DELIVERY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Input
              label="지역 라벨"
              placeholder="[경기/수원시]"
              value={listing.regionLabel ?? ""}
              onChange={(e) =>
                patch({ regionLabel: e.target.value || undefined })
              }
            />
            <Input
              label="마감일"
              type="datetime-local"
              value={listing.deadlineAt.slice(0, 16)}
              onChange={(e) =>
                patch({
                  deadlineAt: new Date(e.target.value).toISOString(),
                })
              }
            />
            <Input
              label="공개 제목"
              placeholder="[경기/수원시] 업체명"
              value={listing.displayTitle ?? ""}
              onChange={(e) =>
                patch({ displayTitle: e.target.value || undefined })
              }
              className="sm:col-span-2"
            />
            <Input
              label="포인트 (선택)"
              type="number"
              value={listing.points ?? ""}
              onChange={(e) =>
                patch({
                  points: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
            <label className="flex items-center gap-2 self-end pb-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={listing.isPremium ?? false}
                onChange={(e) => patch({ isPremium: e.target.checked })}
              />
              프리미엄 섹션
            </label>
          </div>

          <DetailFields
            detail={detail}
            onChange={(nextDetail) => patch({ detail: nextDetail })}
          />
        </>
      ) : null}
    </div>
  );
}

export function PublicCatalogExportButton({
  onExport,
}: {
  onExport: () => Promise<boolean>;
}) {
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={async () => {
          const ok = await onExport();
          setMsg(
            ok
              ? "클립보드에 복사했습니다. 공개 포털 /sync 에 붙여 넣으세요."
              : "복사에 실패했습니다.",
          );
        }}
      >
        <Copy className="h-3.5 w-3.5" />
        공개 카탈로그 내보내기
      </Button>
      {msg ? <span className="text-xs text-zinc-500">{msg}</span> : null}
    </div>
  );
}
