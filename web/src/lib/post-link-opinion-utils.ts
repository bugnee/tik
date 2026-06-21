import type { AppData, PostLinkOpinion, UserRole } from "./types";
import type { PostLinkEntry } from "./types/execution";
import { canAccessQaContract } from "./place-qa-utils";
import { getUserName } from "./selectors";

export const MAX_LINK_OPINION_IMAGES = 3;
export const MAX_LINK_OPINION_IMAGE_BYTES = 2_000_000;

export function getPostLinkOpinionsForContract(
  data: AppData,
  contractId: string,
): PostLinkOpinion[] {
  return (data.postLinkOpinions ?? [])
    .filter((o) => o.contractId === contractId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getPostLinkOpinionsForLink(
  data: AppData,
  contractId: string,
  linkId: string,
): PostLinkOpinion[] {
  return getPostLinkOpinionsForContract(data, contractId).filter(
    (o) => o.linkId === linkId,
  );
}

/** 건당 업무 타임라인 — 링크 ID·URL 기준 의견 매칭 */
export function getPostLinkOpinionsForWorkOrderLink(
  data: AppData,
  contractId: string,
  orderId: string,
  link: Pick<PostLinkEntry, "id" | "url">,
): PostLinkOpinion[] {
  const url = link.url?.trim();
  return getPostLinkOpinionsForContract(data, contractId).filter(
    (o) =>
      o.linkId === link.id ||
      o.linkId === `${orderId}-${link.id}` ||
      (url.length > 0 && o.linkUrl === url),
  );
}

export function countPostLinkOpinionsForContract(
  data: AppData,
  contractId: string,
): number {
  return getPostLinkOpinionsForContract(data, contractId).length;
}

export function canAddPostLinkOpinion(
  data: AppData,
  role: UserRole,
  userId: string,
  contractId: string,
): boolean {
  return canAccessQaContract(data, role, userId, contractId);
}

export function formatPostLinkOpinionAuthor(
  data: AppData,
  opinion: PostLinkOpinion,
): string {
  const user = data.users.find((u) => u.id === opinion.authorUserId);
  if (user?.role === "client") return "고객사";
  return getUserName(data, opinion.authorUserId);
}

export function buildLinkOpinionSourceLabel(opinion: PostLinkOpinion): string {
  return `${opinion.channel} · ${opinion.reportSource}`;
}

export async function readImageFilesAsDataUrls(
  files: FileList | File[],
  maxCount = MAX_LINK_OPINION_IMAGES,
  maxBytes = MAX_LINK_OPINION_IMAGE_BYTES,
): Promise<string[]> {
  const list = Array.from(files).slice(0, maxCount);
  const urls: string[] = [];

  for (const file of list) {
    if (!file.type.startsWith("image/")) continue;
    if (file.size > maxBytes) continue;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    urls.push(dataUrl);
  }

  return urls;
}
