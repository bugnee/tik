/** 고객사 포털 — 개인정보 마스킹 */

/** 이름 가운데 * 처리 (2글자: 앞1, 3글자+: 양끝 유지) */
export function maskPersonName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "-";
  if (trimmed.length === 1) return "*";
  if (trimmed.length === 2) {
    return `${trimmed[0]}*`;
  }
  const middle = "*".repeat(trimmed.length - 2);
  return `${trimmed[0]}${middle}${trimmed[trimmed.length - 1]}`;
}

/** 전화번호 뒷 4자리만 표시 */
export function maskPhoneLast4(phone?: string): string {
  if (!phone?.trim()) return "-";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "-";
  return `****-${digits.slice(-4)}`;
}

/** URL·핸들에서 표시용 이름 추출 후 마스킹 */
export function maskNameFromUrl(url: string): string {
  const handle = extractHandleFromUrl(url);
  if (!handle) return "-";
  return maskPersonName(decodeURIComponent(handle.replace(/[_-]/g, " ")));
}

function extractHandleFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = parsed.hostname.replace(/^www\./, "");
    const parts = parsed.pathname.split("/").filter(Boolean);

    if (host.includes("blog.naver.com") || host.includes("m.blog.naver.com")) {
      return parts[0] ?? null;
    }
    if (host.includes("instagram.com")) {
      return parts[0] ?? null;
    }
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      const channel = parts.find((p) => p.startsWith("@")) ?? parts[0];
      return channel?.replace(/^@/, "") ?? null;
    }
    if (host.includes("tiktok.com")) {
      return parts.find((p) => p.startsWith("@"))?.replace(/^@/, "") ?? parts[0] ?? null;
    }
    return parts[parts.length - 1] ?? null;
  } catch {
    return null;
  }
}
