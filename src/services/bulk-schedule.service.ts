import { prisma } from "../lib/prisma";
import { scheduleGeneratorService } from "./schedule-generator.service";
import { AuthUser } from "../lib/rbac";

export interface BulkScheduleInput {
  teamId: number;
  targetYear: number;
  targetMonth: number;
  packageType?: "STANDARD" | "PLACE_BLOG_FOCUS";
  overwrite?: boolean;
  limit?: number;
}

export class BulkScheduleService {
  /** 팀 소속 ACTIVE 고객사 월간 스케줄 일괄 생성 */
  async generateForTeam(actor: AuthUser, input: BulkScheduleInput) {
    const limit = Math.min(input.limit ?? 100, 500);

    const clients = await prisma.client.findMany({
      where: {
        teamId: input.teamId,
        contractStatus: "ACTIVE",
      },
      take: limit,
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });

    const results: Array<{ clientId: number; name: string; scheduleId?: number; error?: string }> = [];

    for (const client of clients) {
      try {
        const result = await scheduleGeneratorService.create({
          clientId: client.id,
          targetYear: input.targetYear,
          targetMonth: input.targetMonth,
          title: `${input.targetMonth}월 플레이스 & 블로그 집중 패키지`,
          packageType: input.packageType ?? "PLACE_BLOG_FOCUS",
          overwrite: input.overwrite ?? false,
        });
        results.push({ clientId: client.id, name: client.name, scheduleId: result.scheduleId });
      } catch (error) {
        results.push({
          clientId: client.id,
          name: client.name,
          error: error instanceof Error ? error.message : "생성 실패",
        });
      }
    }

    return {
      teamId: input.teamId,
      processed: results.length,
      succeeded: results.filter((r) => r.scheduleId).length,
      failed: results.filter((r) => r.error).length,
      results,
    };
  }
}

export const bulkScheduleService = new BulkScheduleService();
