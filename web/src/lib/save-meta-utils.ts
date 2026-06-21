/** 저장 버튼 옆 — 최종 저장 일시·담당자 표시용 */

export interface SaveMetaSnapshot {
  savedAt?: string;
  /** 표시명 (우선) */
  savedBy?: string;
  savedByUserId?: string;
}

export function formatSaveMetaLine(meta?: SaveMetaSnapshot | null): string {
  if (!meta?.savedAt && !meta?.savedBy) {
    return "저장 이력 없음";
  }
  if (meta.savedAt && meta.savedBy) {
    return `최종 저장 ${meta.savedAt} · ${meta.savedBy}`;
  }
  if (meta.savedAt) {
    return `최종 저장 ${meta.savedAt}`;
  }
  return `저장 ${meta.savedBy}`;
}
