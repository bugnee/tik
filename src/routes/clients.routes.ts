import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { clientService, OrgError } from "../services/client.service";
import { canAssignClients, canViewAllClients } from "../lib/rbac";
import { prisma } from "../lib/prisma";

export const clientsRouter = Router();

clientsRouter.use(authMiddleware);

/** GET /api/clients — 페이지네이션 고객사 목록 */
clientsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      teamId: req.query.teamId ? Number(req.query.teamId) : undefined,
    };

    res.json(await clientService.list(req.user!, query));
  } catch (error) {
    next(error);
  }
});

/** POST /api/clients/:id/assign — 주담당 배정 */
clientsRouter.post("/:id/assign", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!canAssignClients(req.user!.role)) {
      return res.status(403).json({ code: "FORBIDDEN", message: "배정 권한이 없습니다." });
    }

    const clientId = z.coerce.number().int().positive().parse(req.params.id);
    const { managerId } = z.object({ managerId: z.number().int().positive() }).parse(req.body);

    res.json(await clientService.assignPrimary(clientId, managerId, req.user!));
  } catch (error) {
    next(error);
  }
});

/** POST /api/clients/bulk-assign — 팀 내 라운드로빈 일괄 배정 */
clientsRouter.post("/bulk-assign", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!canAssignClients(req.user!.role)) {
      return res.status(403).json({ code: "FORBIDDEN", message: "배정 권한이 없습니다." });
    }

    const body = z
      .object({
        teamId: z.number().int().positive(),
        clientIds: z.array(z.number().int().positive()).min(1),
      })
      .parse(req.body);

    const user = req.user!;
    if (!canViewAllClients(user.role) && user.teamId !== body.teamId) {
      return res.status(403).json({ code: "FORBIDDEN", message: "권한이 없습니다." });
    }

    res.json(await clientService.bulkAssignRoundRobin(body.teamId, body.clientIds));
  } catch (error) {
    next(error);
  }
});

/** GET /api/clients/:id — 고객사 상세 */
clientsRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = z.coerce.number().int().positive().parse(req.params.id);

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        team: true,
        assignments: {
          include: { user: { select: { id: true, name: true, role: true } } },
        },
        schedules: {
          orderBy: [{ targetYear: "desc" }, { targetMonth: "desc" }],
          take: 3,
        },
        contracts: { orderBy: { startDate: "desc" }, take: 1 },
      },
    });

    if (!client) {
      return res.status(404).json({ code: "NOT_FOUND", message: "고객사를 찾을 수 없습니다." });
    }

    res.json(client);
  } catch (error) {
    next(error);
  }
});

export function clientsErrorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (error instanceof OrgError) {
    const status = error.code === "NOT_FOUND" ? 404 : 400;
    return res.status(status).json({ code: error.code, message: error.message });
  }
  if (error instanceof z.ZodError) {
    return res.status(400).json({ code: "VALIDATION_ERROR", message: "요청 값이 올바르지 않습니다." });
  }
  next(error);
}
