import {
  createEmptyPostLink,
  newLinkId,
  todayISO,
} from "./execution-utils";
import type { Contract, PostLinkEntry } from "./types";

/** 고객사 채널 링크 종류 */
export type ClientLinkKey = "place" | "instagram" | "youtube" | "other";

export interface ClientLinksInput {
  placeLink?: string;
  instagramLink?: string;
  youtubeLink?: string;
  otherLink?: string;
}

export interface ClientLinkItem {
  key: ClientLinkKey;
  label: string;
  url: string;
}

export const CLIENT_LINK_FIELD_CONFIG: ReadonlyArray<{
  key: ClientLinkKey;
  label: string;
  field: keyof ClientLinksInput;
  placeholder: string;
}> = [
  {
    key: "place",
    label: "플레이스 링크",
    field: "placeLink",
    placeholder: "https://map.naver.com/p/...",
  },
  {
    key: "instagram",
    label: "인스타 링크",
    field: "instagramLink",
    placeholder: "https://instagram.com/...",
  },
  {
    key: "youtube",
    label: "유튜브 링크",
    field: "youtubeLink",
    placeholder: "https://youtube.com/@...",
  },
  {
    key: "other",
    label: "기타 링크",
    field: "otherLink",
    placeholder: "https://",
  },
];

function trimLink(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/** 계약에 저장된 고객사 링크 입력값 */
export function getContractClientLinksInput(contract: Contract): ClientLinksInput {
  return {
    placeLink: contract.placeLink,
    instagramLink: contract.instagramLink,
    youtubeLink: contract.youtubeLink,
    otherLink: contract.otherLink,
  };
}

/** URL이 있는 고객사 링크만 목록으로 반환 */
export function getAvailableClientLinks(contract: Contract): ClientLinkItem[] {
  return CLIENT_LINK_FIELD_CONFIG.flatMap((field) => {
    const url = trimLink(contract[field.field]);
    if (!url) return [];
    return [{ key: field.key, label: field.label, url }];
  });
}

export function hasClientLinks(contract: Contract): boolean {
  return getAvailableClientLinks(contract).length > 0;
}

/** 저장 시 빈 문자열은 undefined로 정규화 */
export function normalizeClientLinksInput(
  input: ClientLinksInput,
): ClientLinksInput {
  return {
    placeLink: trimLink(input.placeLink),
    instagramLink: trimLink(input.instagramLink),
    youtubeLink: trimLink(input.youtubeLink),
    otherLink: trimLink(input.otherLink),
  };
}

export function normalizeContractClientLinks(
  contract: Contract,
): Pick<
  Contract,
  "placeLink" | "instagramLink" | "youtubeLink" | "otherLink"
> {
  const normalized = normalizeClientLinksInput(getContractClientLinksInput(contract));
  return normalized;
}

function normalizeUrlForCompare(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

/** 선택한 고객사 링크를 포스팅 링크 행으로 병합 (중복 URL 제외) */
export function applySelectedClientLinksToPostLinks(
  selectedKeys: Iterable<ClientLinkKey>,
  contract: Contract,
  existingLinks: PostLinkEntry[],
  defaultDueDate?: string,
): PostLinkEntry[] {
  const selected = new Set(selectedKeys);
  const available = getAvailableClientLinks(contract).filter((item) =>
    selected.has(item.key),
  );
  if (available.length === 0) return existingLinks;

  const known = new Set(
    existingLinks
      .map((link) => link.url.trim())
      .filter(Boolean)
      .map(normalizeUrlForCompare),
  );

  const next = [...existingLinks];
  const hasContent = next.some((link) => link.url.trim());

  for (const item of available) {
    const normalized = normalizeUrlForCompare(item.url);
    if (known.has(normalized)) continue;
    known.add(normalized);

    const emptyIndex = next.findIndex((link) => !link.url.trim());
    if (emptyIndex >= 0) {
      next[emptyIndex] = {
        ...next[emptyIndex],
        url: item.url,
        enteredAt: next[emptyIndex].enteredAt || todayISO(),
      };
      continue;
    }

    next.push({
      id: newLinkId(),
      url: item.url,
      dueDate: defaultDueDate ?? "",
      completedDate: "",
      enteredAt: todayISO(),
    });
  }

  if (!hasContent && next.length === 0) {
    return [createEmptyPostLink(defaultDueDate)];
  }

  return next;
}

/** 시드·데모용 고객사 링크 생성 */
export function buildDemoClientLinks(
  clientName: string,
  index: number,
): ClientLinksInput {
  const slug = clientName.replace(/\s+/g, "").toLowerCase();
  if (index % 4 === 3) return {};

  return {
    placeLink: `https://map.naver.com/p/search/${encodeURIComponent(clientName)}`,
    ...(index % 3 !== 1 && {
      instagramLink: `https://instagram.com/${slug}`,
    }),
    ...(index % 5 !== 2 && {
      youtubeLink: `https://youtube.com/@${slug}`,
    }),
    ...(index % 7 === 0 && {
      otherLink: `https://${slug}.co.kr`,
    }),
  };
}
