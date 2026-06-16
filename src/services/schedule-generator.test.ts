import {
  defaultContractEndDate,
  defaultContractStartForMonth,
  generateWeeklySchedule,
  splitContractIntoWeeks,
} from "./schedule-generator";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 양양서프리조트 6/5~7/4 계약 기간 주차 분할 검증 */
function testWeekSplit() {
  const start = new Date("2026-06-05");
  const end = new Date("2026-07-04");
  const weeks = splitContractIntoWeeks(start, end, 4);

  assert(weeks.length === 4, "4주차 생성 실패");
  assert(formatDate(weeks[0].startDate) === "2026-06-05", "1주차 시작일 불일치");
  assert(formatDate(weeks[0].endDate) === "2026-06-11", "1주차 종료일 불일치");
  assert(formatDate(weeks[1].startDate) === "2026-06-12", "2주차 시작일 불일치");
  assert(formatDate(weeks[2].endDate) === "2026-06-25", "3주차 종료일 불일치");
  assert(formatDate(weeks[3].endDate) === "2026-07-04", "4주차 종료일 불일치");

  console.log("✓ testWeekSplit passed");
}

/** 월간 패키지 목표 수량 검증 (최적화 20, 준최적화 30, 인플루언서 2) */
function testPackageSummary() {
  const start = defaultContractStartForMonth(2026, 6);
  const end = defaultContractEndDate(start);

  const result = generateWeeklySchedule({
    clientId: 1,
    targetYear: 2026,
    targetMonth: 6,
    title: "6월 플레이스 & 블로그 집중 패키지",
    contractStartDate: start,
    contractEndDate: end,
    packageType: "PLACE_BLOG_FOCUS",
  });

  assert(result.tasks.length === 19, `타스크 수 불일치: ${result.tasks.length}`);
  assert(result.summary.optimizedBlogCount === 20, "최적화 블로그 20건");
  assert(result.summary.semiOptimizedBlogCount === 30, "준최적화 블로그 30건");
  assert(result.summary.influencerCount === 2, "인플루언서 2건");

  console.log("✓ testPackageSummary passed", result.summary);
}

testWeekSplit();
testPackageSummary();
console.log("All schedule generator tests passed.");
