import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { canViewAllClients } from "../lib/rbac";

export const teamsRouter = Router();

teamsRouter.use(authMiddleware);

/** GET /api/teams — 팀 목록 */
teamsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const where = canViewAllClients(user.role)
      ? {}
      : user.teamId
        ? { id: user.teamId }
        : { id: -1 };

    const teams = await prisma.team.findMany({
      where,
      include: {
        leader: { select: { id: true, name: true, email: true } },
        _count: { select: { clients: true, members: true } },
        members: {
          where: { role: "MANAGER" },
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json(teams);
  } catch (error) {
    next(error);
  }
});

/** GET /api/teams/:id/members — 팀원 목록 */
teamsRouter.get("/:id/members", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = Number(req.params.id);
    const members = await prisma.user.findMany({
      where: { teamId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    res.json(members);
  } catch (error) {
    next(error);
  }
});

/** GET /api/users/me — 현재 사용자 */
export const usersRouter = Router();

usersRouter.get("/me", authMiddleware, (req: Request, res: Response) => {
  res.json(req.user);
});

/** GET /api/users/demo — 데모 계정 목록 (로그인 UI용) */
usersRouter.get("/demo", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, role: true, teamId: true, team: { select: { name: true } } },
      orderBy: [{ role: "asc" }, { id: "asc" }],
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
});
