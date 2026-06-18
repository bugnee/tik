/** 엔티티 ID 생성 — prefix로 종류 구분 (c-, ex-, qm- 등) */
export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
