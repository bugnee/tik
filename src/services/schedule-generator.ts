import {
  GenerateScheduleInput,
  GenerateScheduleResult,
  GeneratedTaskInput,
  ScheduleSummary,
  TaskTemplate,
  WeekRange,
  WeekTemplate,
} from "./schedule-generator.types";

const DEFAULT_WEEK_COUNT = 4;

/** 계약 시작일부터 7일 단위 주차 분할 (마지막 주차는 계약 종료일까지) */
export function splitContractIntoWeeks(
  contractStartDate: Date,
  contractEndDate: Date,
  weekCount = DEFAULT_WEEK_COUNT,
): WeekRange[] {
  if (contractEndDate < contractStartDate) {
    throw new Error("계약 종료일은 시작일 이후여야 합니다.");
  }

  const start = startOfDay(contractStartDate);
  const end = startOfDay(contractEndDate);
  const weeks: WeekRange[] = [];
  let cursor = start;

  for (let weekNumber = 1; weekNumber <= weekCount; weekNumber++) {
    if (cursor > end) {
      break;
    }

    const weekEnd =
      weekNumber === weekCount ? end : addDays(cursor, DAYS_PER_WEEK - 1);

    weeks.push({
      weekNumber,
      startDate: cursor,
      endDate: weekEnd > end ? end : weekEnd,
    });

    cursor = addDays(weeks[weeks.length - 1].endDate, 1);
  }

  if (weeks.length !== weekCount) {
    throw new Error(
      `계약 기간으로 ${weekCount}주차를 생성할 수 없습니다. (생성: ${weeks.length}주차)`,
    );
  }

  return weeks;
}

/** 양양서프리조트 월간 패키지 기준 4주차 업무 템플릿 */
export const PLACE_BLOG_FOCUS_TEMPLATE: WeekTemplate[] = [
  {
    weekNumber: 1,
    tasks: [
      {
        channel: "PLACE",
        taskName: "전략/키워드 분석 및 플레이스 최적화",
        detailContent:
          "100개 이상 키워드 분석, 플레이스 정보/카테고리/소개글 세팅, 대표 키워드 설정",
        goal: "키워드 선정 및 초기 세팅 완료",
        remarks: "매니저 권한 및 사진 지원 필요",
        targetCount: 1,
      },
      {
        channel: "EXPERIENCE",
        taskName: "체험단 모집 등록",
        detailContent: "체험단 10명 모집 등록 및 일정 확정",
        goal: "검색 노출 확보",
        targetCount: 10,
      },
      {
        channel: "BLOG",
        blogSubType: "OPTIMIZED",
        taskName: "최적화 블로그 배포",
        detailContent: "최적화 블로그 5건 배포",
        goal: "검색 노출 확보",
        targetCount: 5,
      },
      {
        channel: "INFLUENCER",
        taskName: "여행 인플루언서 포스팅",
        detailContent: "여행 인플루언서 1건 포스팅",
        goal: "검색 노출 확보",
        targetCount: 1,
      },
    ],
  },
  {
    weekNumber: 2,
    tasks: [
      {
        channel: "BLOG",
        blogSubType: "OPTIMIZED",
        taskName: "최적화 블로그 배포",
        detailContent: "최적화 블로그 5건 배포",
        goal: "키워드 노출 확대",
        targetCount: 5,
      },
      {
        channel: "BLOG",
        blogSubType: "SEMI_OPTIMIZED",
        taskName: "준최적화 블로그 배포",
        detailContent: "준최적화(5등급+) 블로그 10건 배포",
        goal: "키워드 노출 확대",
        targetCount: 10,
      },
      {
        channel: "EXPERIENCE",
        taskName: "체험단 방문 진행",
        detailContent: "체험단 방문 일정 진행 및 현장 가이드",
        goal: "리뷰 신뢰도 향상",
        targetCount: 10,
      },
      {
        channel: "PLACE",
        taskName: "플레이스 리뷰 관리",
        detailContent: "방문자 리뷰 모니터링 및 대응",
        goal: "리뷰 신뢰도 향상",
        targetCount: 1,
      },
      {
        channel: "PLACE",
        taskName: "플레이스 광고 세팅 점검",
        detailContent: "플레이스 광고 세팅 확인 및 최적화",
        goal: "광고 효율 개선",
        remarks: "비즈머니 충전은 별도",
        targetCount: 1,
      },
    ],
  },
  {
    weekNumber: 3,
    tasks: [
      {
        channel: "BLOG",
        blogSubType: "OPTIMIZED",
        taskName: "최적화 블로그 배포",
        detailContent: "최적화 블로그 5건 배포",
        goal: "롱테일 키워드 타겟",
        targetCount: 5,
      },
      {
        channel: "BLOG",
        blogSubType: "SEMI_OPTIMIZED",
        taskName: "준최적화 블로그 배포",
        detailContent: "준최적화 블로그 10건 배포",
        goal: "전환율 상승",
        targetCount: 10,
      },
      {
        channel: "EXPERIENCE",
        taskName: "체험단 리뷰 모니터링",
        detailContent: "체험단 리뷰 품질 점검 및 보완 요청",
        goal: "전환율 상승",
        targetCount: 10,
      },
      {
        channel: "PLACE",
        taskName: "플레이스 리뷰 답글 관리",
        detailContent: "리뷰 답글 작성 및 CS 대응",
        goal: "전환율 상승",
        targetCount: 1,
      },
      {
        channel: "PLACE",
        taskName: "시즌 키워드 추가",
        detailContent: "여름 시즌 키워드 발굴 및 반영",
        goal: "여름 휴가 수요 선점",
        remarks: "트렌드 반영 및 키워드 확장",
        targetCount: 1,
      },
    ],
  },
  {
    weekNumber: 4,
    tasks: [
      {
        channel: "BLOG",
        blogSubType: "OPTIMIZED",
        taskName: "최적화 블로그 배포",
        detailContent: "최적화 블로그 5건 배포",
        goal: "월간 목표 달성 (최적화 20건)",
        targetCount: 5,
      },
      {
        channel: "BLOG",
        blogSubType: "SEMI_OPTIMIZED",
        taskName: "준최적화 블로그 배포",
        detailContent: "준최적화 블로그 10건 배포",
        goal: "월간 목표 달성 (준최적화 30건)",
        targetCount: 10,
      },
      {
        channel: "INFLUENCER",
        taskName: "여행 인플루언서 포스팅",
        detailContent: "여행 인플루언서 1건 포스팅",
        goal: "월간 목표 달성 (인플루언서 2건)",
        targetCount: 1,
      },
      {
        channel: "EXPERIENCE",
        taskName: "체험단 리뷰 마감",
        detailContent: "체험단 10명 리뷰 완료 처리",
        goal: "체험단 10명 리뷰 완료",
        targetCount: 10,
      },
      {
        channel: "CHANNEL",
        taskName: "플레이스 최종 점검 및 월간 리포트",
        detailContent: "플레이스 최종 점검, 월간 성과 리포트 제출",
        goal: "성과 분석 및 다음 달 전략 수립",
        remarks: "월간 리포트 및 익월 전략 제안서 제출",
        targetCount: 1,
      },
    ],
  },
];

const PACKAGE_TEMPLATES = {
  STANDARD: PLACE_BLOG_FOCUS_TEMPLATE,
  PLACE_BLOG_FOCUS: PLACE_BLOG_FOCUS_TEMPLATE,
} as const;

export function buildWeeklyTasks(
  weekRanges: WeekRange[],
  weekTemplates: WeekTemplate[],
): GeneratedTaskInput[] {
  const templateMap = new Map(weekTemplates.map((week) => [week.weekNumber, week.tasks]));
  const tasks: GeneratedTaskInput[] = [];

  for (const week of weekRanges) {
    const templates = templateMap.get(week.weekNumber);
    if (!templates) {
      continue;
    }

    for (const template of templates) {
      tasks.push(createTaskFromTemplate(template, week));
    }
  }

  return tasks;
}

export function summarizeTasks(tasks: GeneratedTaskInput[]): ScheduleSummary {
  return tasks.reduce<ScheduleSummary>(
    (summary, task) => {
      summary.totalTaskCount += 1;

      if (task.channel === "BLOG" && task.blogSubType === "OPTIMIZED") {
        summary.optimizedBlogCount += task.targetCount;
      }
      if (task.channel === "BLOG" && task.blogSubType === "SEMI_OPTIMIZED") {
        summary.semiOptimizedBlogCount += task.targetCount;
      }
      if (task.channel === "INFLUENCER") {
        summary.influencerCount += task.targetCount;
      }
      if (task.channel === "EXPERIENCE") {
        summary.experienceCount += task.targetCount;
      }

      return summary;
    },
    {
      optimizedBlogCount: 0,
      semiOptimizedBlogCount: 0,
      influencerCount: 0,
      experienceCount: 0,
      totalTaskCount: 0,
    },
  );
}

/** 주차별 스케줄 생성 (DB 저장 없이 결과만 반환) */
export function generateWeeklySchedule(
  input: GenerateScheduleInput & {
    contractStartDate: Date;
    contractEndDate: Date;
  },
): GenerateScheduleResult {
  const weekCount = input.weekCount ?? DEFAULT_WEEK_COUNT;
  const weekRanges = splitContractIntoWeeks(
    input.contractStartDate,
    input.contractEndDate,
    weekCount,
  );

  const packageType = input.packageType ?? "PLACE_BLOG_FOCUS";
  const weekTemplates = PACKAGE_TEMPLATES[packageType];

  if (weekTemplates.length !== weekCount) {
    throw new Error(
      `선택한 패키지(${packageType})는 ${weekTemplates.length}주차 템플릿입니다. weekCount=${weekCount}와 일치하지 않습니다.`,
    );
  }

  const tasks = buildWeeklyTasks(weekRanges, weekTemplates);

  return {
    scheduleId: 0,
    weekRanges,
    tasks,
    summary: summarizeTasks(tasks),
  };
}

function createTaskFromTemplate(
  template: TaskTemplate,
  week: WeekRange,
): GeneratedTaskInput {
  return {
    ...template,
    weekNumber: week.weekNumber,
    weekStartDate: week.startDate,
    weekEndDate: week.endDate,
    dueDate: endOfDay(week.endDate),
  };
}

const DAYS_PER_WEEK = 7;

function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function endOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

/** 계약 시작일 기준 기본 30일(4주차) 종료일 계산 */
export function defaultContractEndDate(contractStartDate: Date): Date {
  return addDays(startOfDay(contractStartDate), 29);
}

/** YYYY-MM 기준 해당 월의 기본 계약 시작일 (매월 5일 시작 관례) */
export function defaultContractStartForMonth(year: number, month: number): Date {
  return startOfDay(new Date(year, month - 1, 5));
}
