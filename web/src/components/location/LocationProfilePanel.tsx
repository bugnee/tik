"use client";

import { useEffect, useState } from "react";
import { MapPin, Save } from "lucide-react";
import { RegionSelect } from "@/components/location/RegionSelect";
import { SaveButton } from "@/components/ui/SaveButton";
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
  { border: string; icon: string; title: string; subtitle: string }
> = {
  client: {
    border: "border-violet-500/25",
    icon: "bg-violet-500/15 text-violet-300",
    title: "고객사 위치 정보",
    subtitle: LOCATION_FIELD_HINT,
  },
  partner: {
    border: "border-cyan-500/25",
    icon: "bg-cyan-500/15 text-cyan-300",
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
  const dirty = !valuesEqual(draft, baseline);

  useEffect(() => {
    setDraft(value);
    setBaseline(value);
  }, [value.address, value.regionProvince, value.regionCity]);

  function handleSave() {
    onSave(draft);
    setBaseline(draft);
  }

  return (
    <Card glow className={styles.border}>
      <CardHeader title={styles.title} subtitle={styles.subtitle} />
      <div className="space-y-4 px-4 pb-4">
        {!readOnly && (
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
            <div className="flex justify-end">
              <SaveButton dirty={dirty} onClick={handleSave} disabled={!dirty}>
                <Save className="h-4 w-4" />
                저장
              </SaveButton>
            </div>
          </>
        )}

        {readOnly && (
          <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                styles.icon,
              )}
            >
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-100">
                {formatLocationSummary(value)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {hasLocationMetadata(value)
                  ? LOCATION_FIELD_HINT
                  : "지역 정보 없음 (선택 입력)"}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
