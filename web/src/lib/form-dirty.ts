/** 폼·설정 값 비교 (저장 전 변경 여부) */
export function valuesEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function cloneFormValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
