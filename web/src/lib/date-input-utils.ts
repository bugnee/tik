/** YYYY-MM 파싱 */
export function parseMonthValue(value: string): { year: number; month: number } {
  const [y, m] = value.split("-").map(Number);
  return {
    year: Number.isFinite(y) ? y : new Date().getFullYear(),
    month: Number.isFinite(m) ? m : 1,
  };
}

/** YYYY-MM 조합 */
export function formatMonthValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** 화면 표시용: 2026년 07월 */
export function formatMonthDisplay(value: string): string {
  if (!value) return "";
  const { year, month } = parseMonthValue(value);
  return `${year}년 ${String(month).padStart(2, "0")}월`;
}

/** YYYY-MM-DD 파싱 */
export function parseDateValue(value: string): {
  year: number;
  month: number;
  day: number;
} {
  const [y, m, d] = value.split("-").map(Number);
  return {
    year: Number.isFinite(y) ? y : new Date().getFullYear(),
    month: Number.isFinite(m) ? m : 1,
    day: Number.isFinite(d) ? d : 1,
  };
}

/** YYYY-MM-DD 조합 */
export function formatDateValue(
  year: number,
  month: number,
  day: number,
): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 해당 월의 일 수 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** 월 변경 시 일(day)이 범위를 벗어나면 말일로 보정 */
export function clampDay(year: number, month: number, day: number): number {
  return Math.min(Math.max(day, 1), daysInMonth(year, month));
}
