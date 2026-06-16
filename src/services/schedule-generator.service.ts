import { prisma } from "../lib/prisma";
import {
  GenerateScheduleInput,
  GenerateScheduleResult,
} from "./schedule-generator.types";
import {
  defaultContractEndDate,
  defaultContractStartForMonth,
  generateWeeklySchedule,
} from "./schedule-generator";

export interface PersistScheduleInput extends GenerateScheduleInput {
  overwrite?: boolean;
}

export class ScheduleGeneratorService {
  /** 주차별 스케줄 미리보기 (DB 저장 없음) */
  preview(input: GenerateScheduleInput): GenerateScheduleResult {
    return generateWeeklySchedule(this.normalizeInput(input));
  }

  /** 주차별 스케줄 자동 생성 후 DB 저장 */
  async create(input: PersistScheduleInput): Promise<GenerateScheduleResult & { scheduleId: number }> {
    const normalized = this.normalizeInput(input);

    const client = await prisma.client.findUnique({
      where: { id: normalized.clientId },
      select: { id: true, name: true, contractStatus: true },
    });

    if (!client) {
      throw new ScheduleGeneratorError("CLIENT_NOT_FOUND", "고객사를 찾을 수 없습니다.");
    }

    if (client.contractStatus !== "ACTIVE") {
      throw new ScheduleGeneratorError(
        "CLIENT_INACTIVE",
        "진행 중인 계약이 아닌 고객사입니다.",
      );
    }

    const existing = await prisma.monthlySchedule.findUnique({
      where: {
        clientId_targetYear_targetMonth: {
          clientId: normalized.clientId,
          targetYear: normalized.targetYear,
          targetMonth: normalized.targetMonth,
        },
      },
    });

    if (existing && !input.overwrite) {
      throw new ScheduleGeneratorError(
        "SCHEDULE_ALREADY_EXISTS",
        "해당 월간 스케줄이 이미 존재합니다. overwrite=true로 덮어쓸 수 있습니다.",
      );
    }

    const generated = generateWeeklySchedule(normalized);

    const schedule = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.task.deleteMany({ where: { scheduleId: existing.id } });
        await tx.monthlySchedule.delete({ where: { id: existing.id } });
      }

      const createdSchedule = await tx.monthlySchedule.create({
        data: {
          clientId: normalized.clientId,
          targetYear: normalized.targetYear,
          targetMonth: normalized.targetMonth,
          title: normalized.title,
          contractStartDate: normalized.contractStartDate,
          contractEndDate: normalized.contractEndDate,
          status: "ACTIVE",
          tasks: {
            create: generated.tasks.map((task) => ({
              clientId: normalized.clientId,
              assigneeId: normalized.assigneeId,
              weekNumber: task.weekNumber,
              weekStartDate: task.weekStartDate,
              weekEndDate: task.weekEndDate,
              channel: task.channel,
              blogSubType: task.blogSubType,
              taskName: task.taskName,
              detailContent: task.detailContent,
              goal: task.goal,
              remarks: task.remarks,
              targetCount: task.targetCount,
              dueDate: task.dueDate,
            })),
          },
        },
        include: {
          tasks: {
            orderBy: [{ weekNumber: "asc" }, { id: "asc" }],
          },
        },
      });

      return createdSchedule;
    });

    return {
      ...generated,
      scheduleId: schedule.id,
    };
  }

  /** 저장된 스케줄 + 주차별 그룹 조회 */
  async findById(scheduleId: number) {
    const schedule = await prisma.monthlySchedule.findUnique({
      where: { id: scheduleId },
      include: {
        client: { select: { id: true, name: true } },
        tasks: {
          orderBy: [{ weekNumber: "asc" }, { id: "asc" }],
          include: {
            assignee: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!schedule) {
      throw new ScheduleGeneratorError("SCHEDULE_NOT_FOUND", "스케줄을 찾을 수 없습니다.");
    }

    const tasksByWeek = schedule.tasks.reduce<
      Record<number, typeof schedule.tasks>
    >((groups, task) => {
      if (!groups[task.weekNumber]) {
        groups[task.weekNumber] = [];
      }
      groups[task.weekNumber].push(task);
      return groups;
    }, {});

    return {
      ...schedule,
      tasksByWeek: Object.entries(tasksByWeek)
        .map(([weekNumber, tasks]) => ({
          weekNumber: Number(weekNumber),
          weekStartDate: tasks[0]?.weekStartDate,
          weekEndDate: tasks[0]?.weekEndDate,
          tasks,
        }))
        .sort((a, b) => a.weekNumber - b.weekNumber),
    };
  }

  private normalizeInput(
    input: GenerateScheduleInput,
  ): GenerateScheduleInput & { contractStartDate: Date; contractEndDate: Date } {
    const contractStartDate =
      input.contractStartDate ??
      defaultContractStartForMonth(input.targetYear, input.targetMonth);

    const contractEndDate =
      input.contractEndDate ?? defaultContractEndDate(contractStartDate);

    return {
      ...input,
      contractStartDate,
      contractEndDate,
      weekCount: input.weekCount ?? 4,
      packageType: input.packageType ?? "PLACE_BLOG_FOCUS",
    };
  }
}

export class ScheduleGeneratorError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ScheduleGeneratorError";
  }
}

export const scheduleGeneratorService = new ScheduleGeneratorService();
