import { BlogSubType, ChannelType } from "@prisma/client";

export interface WeekRange {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
}

export interface TaskTemplate {
  channel: ChannelType;
  blogSubType?: BlogSubType;
  taskName: string;
  detailContent: string;
  goal: string;
  remarks?: string;
  targetCount: number;
}

export interface WeekTemplate {
  weekNumber: number;
  tasks: TaskTemplate[];
}

export interface GeneratedTaskInput extends TaskTemplate {
  weekNumber: number;
  weekStartDate: Date;
  weekEndDate: Date;
  dueDate: Date;
}

export interface ScheduleSummary {
  optimizedBlogCount: number;
  semiOptimizedBlogCount: number;
  influencerCount: number;
  experienceCount: number;
  totalTaskCount: number;
}

export interface GenerateScheduleInput {
  clientId: number;
  targetYear: number;
  targetMonth: number;
  title: string;
  contractStartDate?: Date;
  contractEndDate?: Date;
  weekCount?: number;
  assigneeId?: number;
  packageType?: "STANDARD" | "PLACE_BLOG_FOCUS";
}

export interface GenerateScheduleResult {
  scheduleId: number;
  weekRanges: WeekRange[];
  tasks: GeneratedTaskInput[];
  summary: ScheduleSummary;
}
