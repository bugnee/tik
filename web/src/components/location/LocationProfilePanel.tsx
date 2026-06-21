"use client";

import { useEffect, useState } from "react";
import { MapPin, Pencil, Save } from "lucide-react";
import { RegionSelect } from "@/components/location/RegionSelect";
import { Button } from "@/components/ui/Button";
import { SaveButton } from "@/components/ui/SaveButton";
import { useSaveMeta } from "@/hooks/useSaveMeta";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/FormFields";
import {
  formatLocationSummary,
  hasLocationMetadata,
  LOCATION_FIELD_HINT,
  type LocationProfileInput,
} from "@/lib/location-profile-utils";
import { valuesEqual } from "@/lib/form-dirty";
import { cn } from "@/lib/cn";

type PanelVariant = "client" | "partner";

const VARIANT_STYLES: Record<
  PanelVariant,
  {
    border: string;
    icon: string;
    viewSurface: string;
    title: string;
    subtitle: string;
  }
> = {
  client: {
    border: "border-violet-400/40",
    icon: "bg-violet-400/25 text-violet-100",
    viewSurface:
      "border border-violet-300/50 bg-violet-400/15 ring-1 ring-violet-300/20",
    title: "고객사 위치 정보",
    subtitle: LOCATION_FIELD_HINT,
  },
  partner: {
    border: "border-cyan-400/40",
    icon: "bg-cyan-400/25 text-cyan-100",
    viewSurface:
      "border border-cyan-300/50 bg-cyan-400/15 ring-1 ring-cyan-300/20",
    title: "파트너 활동 지역",
    subtitle: LOCATION_FIELD_HINT,
  },
};

export function LocationProfilePanel({
  variant,
  value,
  readOnly = false,
  onSave,
}: {
  variant: PanelVariant;
  value: LocationProfileInput;
  readOnly?: boolean;
  onSave: (input: LocationProfileInput) => void;
}) {
  const styles = VARIANT_STYLES[variant];
  const [draft, setDraft] = useState<LocationProfileInput>(value);
  const [baseline, setBaseline] = useState(value);
  /** 저장된 데이터가 있으면 요약 화면부터, 없으면 입력 폼 */
  const [isEditing, setIsEditing] = useState(
    () => !readOnly && !hasLocationMetadata(value),
  );
  const dirty = !valuesEqual(draft, baseline);
  const saveMeta = useSaveMeta();
  const displayProfile = isEditing ? draft : baseline;

  useEffect(() => {
    setDraft(value);
    setBaseline(value);
    if (hasLocationMetadata(value)) {
      setIsEditing(false);
    }
  }, [value.address, value.regionProvince, value.regionCity]);

  function handleSave() {
    onSave(draft);
    setBaseline(draft);
    saveMeta.recordSave();
    setIsEditing(false);
  }

  function startEdit() {
    setDraft(baseline);
    setIsEditing(true);
  }

  const showForm = !readOnly && isEditing;
  const showView = readOnly || !isEditing;

  return (
    <Card glow className={styles.border}>
      <CardHeader
        title={styles.title}
        subtitle={
          showView && hasLocationMetadata(displayProfile)
            ? "저장된 위치 · 수정 버튼으로 변경"
            : styles.subtitle
        }
        action={
          showView &&
          !readOnly && (
            <Button size="sm" variant="secondary" onClick={startEdit}>
              <Pencil className="h-3.5 w-3.5" />
              수정
            </Button>
          )
        }
      />
      <div className="space-y-4 px-4 pb-4">
        {showForm && (
          <>
            <RegionSelect
              province={draft.regionProvince ?? ""}
              city={draft.regionCity ?? ""}
              onProvinceChange={(regionProvince) =>
                setDraft((prev) => ({ ...prev, regionProvince, regionCity: "" }))
              }
              onCityChange={(regionCity) =>
                setDraft((prev) => ({ ...prev, regionCity }))
              }
              hint={LOCATION_FIELD_HINT}
            />
            <Input
              label="상세 주소"
              value={draft.address ?? ""}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, address: e.target.value }))
              }
              placeholder="도로명 · 건물명 · 층/호"
            />
            <div className="flex justify-end gap-2">
              {hasLocationMetadata(baseline) && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setDraft(baseline);
                    setIsEditing(false);
                  }}
                >
                  취소
                </Button>
              )}
              <SaveButton
                dirty={dirty}
                onClick={handleSave}
                disabled={!dirty}
                savedAt={saveMeta.savedAt}
                savedBy={saveMeta.savedBy}
              >
                <Save className="h-4 w-4" />
                저장
              </SaveButton>
            </div>
          </>
        )}

        {showView && (
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl p-4",
              hasLocationMetadata(displayProfile)
                ? styles.viewSurface
                : "border border-zinc-700/80 bg-zinc-900/60",
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                styles.icon,
              )}
            >
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-50">
                {formatLocationSummary(displayProfile)}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {hasLocationMetadata(displayProfile)
                  ? LOCATION_FIELD_HINT
                  : "지역 정보 없음 · 수정으로 입력"}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
