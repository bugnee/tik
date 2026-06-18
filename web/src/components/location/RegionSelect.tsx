"use client";

import { useEffect } from "react";
import { Select } from "@/components/ui/FormFields";
import {
  getCitiesForProvince,
  KOREA_PROVINCES,
} from "@/lib/korea-regions";

export function RegionSelect({
  province,
  city,
  onProvinceChange,
  onCityChange,
  provinceLabel = "시·도",
  cityLabel = "시·군·구",
  required,
  disabled,
  hint,
}: {
  province: string;
  city: string;
  onProvinceChange: (value: string) => void;
  onCityChange: (value: string) => void;
  provinceLabel?: string;
  cityLabel?: string;
  required?: boolean;
  disabled?: boolean;
  /** 참고·검색용 안내 */
  hint?: string;
}) {
  const cities = getCitiesForProvince(province);

  useEffect(() => {
    if (!province || !city) return;
    if (!cities.includes(city)) {
      onCityChange("");
    }
  }, [province, city, cities, onCityChange]);

  return (
    <div className="space-y-2">
      {hint && (
        <p className="text-xs text-zinc-500">{hint}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
      <Select
        label={provinceLabel}
        value={province}
        onChange={(e) => onProvinceChange(e.target.value)}
        required={required}
        disabled={disabled}
      >
        <option value="">선택</option>
        {KOREA_PROVINCES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>
      <Select
        label={cityLabel}
        value={city}
        onChange={(e) => onCityChange(e.target.value)}
        required={required}
        disabled={disabled || !province}
      >
        <option value="">{province ? "선택" : "시·도 먼저 선택"}</option>
        {cities.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>
      </div>
    </div>
  );
}
