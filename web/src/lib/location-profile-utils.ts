import { formatRegionLabel } from "./korea-regions";
import type { Contract, Partner } from "./types";

export interface LocationProfile {
  address?: string;
  regionProvince?: string;
  regionCity?: string;
}

export type LocationProfileInput = LocationProfile;

export function getContractLocation(contract: Contract): LocationProfile {
  return {
    address: contract.address,
    regionProvince: contract.regionProvince,
    regionCity: contract.regionCity,
  };
}

export function getPartnerLocation(partner: Partner): LocationProfile {
  return {
    address: partner.address,
    regionProvince: partner.regionProvince,
    regionCity: partner.regionCity,
  };
}

export function formatLocationSummary(profile: LocationProfile): string {
  const region = formatRegionLabel(profile.regionProvince, profile.regionCity);
  if (!profile.address?.trim()) return region;
  if (region === "지역 미설정") return profile.address;
  return `${region} · ${profile.address}`;
}

/** 지역·주소 메타데이터 존재 여부 (표시용 — 업무 진행 조건 아님) */
export function hasLocationMetadata(profile: LocationProfile): boolean {
  return Boolean(
    profile.regionProvince ||
      profile.regionCity ||
      profile.address?.trim(),
  );
}

/** @deprecated hasLocationMetadata 사용 — 업무 게이트용이 아님 */
export function isLocationProfileComplete(profile: LocationProfile): boolean {
  return hasLocationMetadata(profile);
}

/** 목록·검색 필터용 지역 일치 (업무 진행·매칭 조건 아님) */
export function isRegionMatch(
  partner: LocationProfile,
  slot: LocationProfile,
): boolean {
  if (!slot.regionProvince) return true;
  if (partner.regionProvince !== slot.regionProvince) return false;
  if (!slot.regionCity || !partner.regionCity) return true;
  return partner.regionCity === slot.regionCity;
}

/** 지역 선택 필드 공통 안내 문구 */
export const LOCATION_FIELD_HINT =
  "참고·검색용 (미입력해도 업무 진행에 영향 없음)";

/** 검색어에 지역·주소가 포함되는지 */
export function locationMatchesSearch(
  profile: LocationProfile,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const region = formatRegionLabel(
    profile.regionProvince,
    profile.regionCity,
  ).toLowerCase();
  return (
    region.includes(q) ||
    (profile.regionProvince?.toLowerCase().includes(q) ?? false) ||
    (profile.regionCity?.toLowerCase().includes(q) ?? false) ||
    (profile.address?.toLowerCase().includes(q) ?? false)
  );
}
