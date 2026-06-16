import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { dashboardService, DashboardError } from "../services/dashboard.service";
import { canViewAllClients } from "../lib/rbac";

export const dashboardRouter = Router();

dashboardRouter.use(authMiddleware);

/** GET /api/dashboard — 역할별 대시보드 (CEO/팀장/담당자 자동) */
dashboardRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const weekNumber = req.query.week
      ? z.coerce.number().int().min(1).max(5).parse(req.query.week)
      : undefined;

    const data = await dashboardService.getDashboardForUser(req.user!, weekNumber);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/** GET /api/dashboard/executive — 전사 (CEO/임원) */
dashboardRouter.get("/executive", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!canViewAllClients(req.user!.role)) {
      return res.status(403).json({ code: "FORBIDDEN", message: "권한이 없습니다." });
    }
    res.json(await dashboardService.getExecutiveDashboard());
  } catch (error) {
    next(error);
  }
});

/** GET /api/dashboard/team/:teamId — 팀장 모니터링 */
dashboardRouter.get("/team/:teamId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = z.coerce.number().int().positive().parse(req.params.teamId);
    const weekNumber = req.query.week
      ? z.coerce.number().int().min(1).max(5).parse(req.query.week)
      : undefined;

    const user = req.user!;
    if (
      !canViewAllClients(user.role) &&
      (user.role !== "LEADER" || user.teamId !== teamId)
    ) {
      return res.status(403).json({ code: "FORBIDDEN", message: "권한이 없습니다." });
    }

    res.json(await dashboardService.getTeamDashboard(teamId, weekNumber));
  } catch (error) {
    next(error);
  }
});

/** GET /api/dashboard/manager — 담당자 업무 */
dashboardRouter.get("/manager", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const weekNumber = req.query.week
      ? z.coerce.number().int().min(1).max(5).parse(req.query.week)
      : undefined;

    res.json(await dashboardService.getManagerDashboard(req.user!, weekNumber));
  } catch (error) {
    next(error);
  }
});

export function dashboardErrorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (error instanceof DashboardError) {
    return res.status(404).json({ code: error.code, message: error.message });
  }
  next(error);
}
