import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { canBulkGenerateSchedules } from "../lib/rbac";
import { bulkScheduleService } from "../services/bulk-schedule.service";
import {
  scheduleGeneratorService,
  ScheduleGeneratorError,
} from "../services/schedule-generator.service";

const generateSchema = z.object({
  clientId: z.number().int().positive(),
  targetYear: z.number().int().min(2020).max(2100),
  targetMonth: z.number().int().min(1).max(12),
  title: z.string().min(1).max(200),
  contractStartDate: z.coerce.date().optional(),
  contractEndDate: z.coerce.date().optional(),
  weekCount: z.number().int().min(1).max(5).optional(),
  assigneeId: z.number().int().positive().optional(),
  packageType: z.enum(["STANDARD", "PLACE_BLOG_FOCUS"]).optional(),
  overwrite: z.boolean().optional(),
});

export const schedulesRouter = Router();

/** POST /api/schedules/preview — DB 저장 없이 주차별 스케줄 미리보기 */
schedulesRouter.post("/preview", (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = generateSchema.parse(req.body);
    const result = scheduleGeneratorService.preview(body);
    res.json(formatScheduleResponse(result));
  } catch (error) {
    next(error);
  }
});

/** POST /api/schedules/generate — 주차별 스케줄 자동 생성 및 DB 저장 */
schedulesRouter.post("/generate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = generateSchema.parse(req.body);
    const result = await scheduleGeneratorService.create(body);
    res.status(201).json(formatScheduleResponse(result));
  } catch (error) {
    next(error);
  }
});

/** POST /api/schedules/bulk-generate — 팀 단위 일괄 스케줄 생성 (팀장+) */
schedulesRouter.post("/bulk-generate", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!canBulkGenerateSchedules(req.user!.role)) {
      return res.status(403).json({ code: "FORBIDDEN", message: "권한이 없습니다." });
    }

    const body = z
      .object({
        teamId: z.number().int().positive(),
        targetYear: z.number().int().min(2020).max(2100),
        targetMonth: z.number().int().min(1).max(12),
        packageType: z.enum(["STANDARD", "PLACE_BLOG_FOCUS"]).optional(),
        overwrite: z.boolean().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .parse(req.body);

    res.json(await bulkScheduleService.generateForTeam(req.user!, body));
  } catch (error) {
    next(error);
  }
});

/** GET /api/schedules/:id — 저장된 스케줄 주차별 조회 */
schedulesRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scheduleId = z.coerce.number().int().positive().parse(req.params.id);
    const schedule = await scheduleGeneratorService.findById(scheduleId);
    res.json(schedule);
  } catch (error) {
    next(error);
  }
});

function formatScheduleResponse(result: {
  scheduleId: number;
  weekRanges: Array<{ weekNumber: number; startDate: Date; endDate: Date }>;
  tasks: Array<Record<string, unknown>>;
  summary: Record<string, number>;
}) {
  const tasksByWeek = result.tasks.reduce<
    Record<number, Array<Record<string, unknown>>>
  >((groups, task) => {
    const weekNumber = task.weekNumber as number;
    if (!groups[weekNumber]) {
      groups[weekNumber] = [];
    }
    groups[weekNumber].push(task);
    return groups;
  }, {});

  return {
    scheduleId: result.scheduleId,
    weekRanges: result.weekRanges,
    tasksByWeek: result.weekRanges.map((week) => ({
      weekNumber: week.weekNumber,
      weekStartDate: week.startDate,
      weekEndDate: week.endDate,
      tasks: tasksByWeek[week.weekNumber] ?? [],
    })),
    summary: result.summary,
  };
}

export function scheduleErrorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (error instanceof ScheduleGeneratorError) {
    const status =
      error.code === "SCHEDULE_ALREADY_EXISTS"
        ? 409
        : error.code === "CLIENT_NOT_FOUND" || error.code === "SCHEDULE_NOT_FOUND"
          ? 404
          : 400;

    return res.status(status).json({ code: error.code, message: error.message });
  }

  if (error instanceof z.ZodError) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "요청 값이 올바르지 않습니다.",
      details: error.flatten(),
    });
  }

  if (error instanceof Error) {
    return res.status(400).json({ code: "BAD_REQUEST", message: error.message });
  }

  next(error);
}
