import type { AppData } from "@/lib/types";

/** localStorage 키 — 포맷 변경 시 버전 올림 */
export const APP_STORAGE_KEY = "tripitkorea-erp-v26";
const LEGACY_KEY_PREFIX = "tripitkorea-erp-v";
const GZIP_PREFIX = "gz:";

function supportsGzip(): boolean {
  return (
    typeof CompressionStream !== "undefined" &&
    typeof DecompressionStream !== "undefined"
  );
}

/** 이전 버전 키를 지워 용량 확보 */
export function clearLegacyAppStorage(keepKey = APP_STORAGE_KEY): void {
  if (typeof window === "undefined") return;
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(LEGACY_KEY_PREFIX) && key !== keepKey) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // 무시 — 읽기 전용/사생활 모드 등
  }
}

async function gzipCompress(text: string): Promise<string> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

async function gzipDecompress(encoded: string): Promise<string> {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

function readRawFromKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function parseRawPayload(raw: string): Promise<AppData> {
  if (raw.startsWith(GZIP_PREFIX) && supportsGzip()) {
    const text = await gzipDecompress(raw.slice(GZIP_PREFIX.length));
    return JSON.parse(text) as AppData;
  }
  return JSON.parse(raw) as AppData;
}

/** gzip 포함 비동기 로드 — v21 없으면 이전 버전에서 마이그레이션 */
export async function loadAppData(): Promise<AppData | null> {
  if (typeof window === "undefined") return null;

  try {
    const current = readRawFromKey(APP_STORAGE_KEY);
    if (current) {
      return await parseRawPayload(current);
    }

    // v20 등 이전 키에서 1회 마이그레이션
    for (let version = 24; version >= 1; version -= 1) {
      const legacyKey = `${LEGACY_KEY_PREFIX}${version}`;
      if (legacyKey === APP_STORAGE_KEY) continue;
      const legacyRaw = readRawFromKey(legacyKey);
      if (!legacyRaw) continue;

      const data = await parseRawPayload(legacyRaw);
      try {
        localStorage.removeItem(legacyKey);
      } catch {
        // 무시
      }
      clearLegacyAppStorage();
      void saveAppData(data);
      return data;
    }

    return null;
  } catch (err) {
    console.error("저장 데이터 로드 실패", err);
    return null;
  }
}

export type SaveAppDataResult =
  | { ok: true; compressed: boolean }
  | { ok: false; reason: "quota" | "unsupported" | "unknown" };

/** ERP 데이터 저장 — gzip 우선, 용량 초과 시 레거시 키 정리 후 재시도 */
export async function saveAppData(data: AppData): Promise<SaveAppDataResult> {
  if (typeof window === "undefined") return { ok: false, reason: "unsupported" };

  clearLegacyAppStorage();
  const json = JSON.stringify(data);

  const tryWrite = (payload: string): boolean => {
    try {
      localStorage.setItem(APP_STORAGE_KEY, payload);
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === "QuotaExceededError") {
        return false;
      }
      throw err;
    }
  };

  if (supportsGzip()) {
    try {
      const compressed = GZIP_PREFIX + (await gzipCompress(json));
      if (tryWrite(compressed)) {
        return { ok: true, compressed: true };
      }
    } catch (err) {
      console.warn("gzip 저장 실패, 비압축으로 재시도합니다.", err);
    }
  }

  clearLegacyAppStorage();
  if (tryWrite(json)) {
    return { ok: true, compressed: false };
  }

  // 최후 수단: 현재 키까지 삭제 후 비압축 1회 더 시도
  try {
    localStorage.removeItem(APP_STORAGE_KEY);
    clearLegacyAppStorage();
    if (tryWrite(json)) {
      console.warn(
        "localStorage 용량 부족으로 이전 저장본을 삭제한 뒤 다시 저장했습니다.",
      );
      return { ok: true, compressed: false };
    }
  } catch (err) {
    console.error("localStorage 저장 재시도 실패", err);
  }

  return { ok: false, reason: "quota" };
}

/** 손상·용량 문제 시 저장소 초기화 */
export function clearAppStorage(): void {
  if (typeof window === "undefined") return;
  clearLegacyAppStorage();
  localStorage.removeItem(APP_STORAGE_KEY);
}
