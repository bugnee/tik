import { prisma } from "../lib/prisma";
import { AuthUser, canViewAllClients } from "../lib/rbac";

export class DashboardService {
  /** CEO / 임원 — 전사 현황 */
  async getExecutiveDashboard() {
    const now = new Date();

    const [
      totalClients,
      activeClients,
      totalTeams,
      totalManagers,
      taskByStatus,
      delayedTasks,
      teams,
      monthlyRevenue,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { contractStatus: "ACTIVE" } }),
      prisma.team.count(),
      prisma.user.count({ where: { role: "MANAGER" } }),
      prisma.task.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.task.count({
        where: {
          status: { in: ["DELAYED", "READY", "PROGRESS"] },
          dueDate: { lt: now },
        },
      }),
      prisma.team.findMany({
        include: {
          leader: { select: { id: true, name: true } },
          _count: { select: { clients: true, members: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.contract.aggregate({
        _sum: { amount: true, outsourcingFee: true },
        where: {
          startDate: { lte: now },
          endDate: { gte: now },
        },
      }),
    ]);

    const statusMap = Object.fromEntries(
      taskByStatus.map((row) => [row.status, row._count._all]),
    );

    return {
      scope: "EXECUTIVE",
      summary: {
        totalClients,
        activeClients,
        totalTeams,
        totalManagers,
        delayedTasks,
        taskByStatus: statusMap,
        revenue: {
          total: Number(monthlyRevenue._sum.amount ?? 0),
          outsourcing: Number(monthlyRevenue._sum.outsourcingFee ?? 0),
        },
      },
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        leader: team.leader,
        clientCount: team._count.clients,
        memberCount: team._count.members,
      })),
    };
  }

  /** 팀장 — 팀 단위 모니터링 */
  async getTeamDashboard(teamId: number, weekNumber?: number) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        leader: { select: { id: true, name: true } },
        members: {
          where: { role: "MANAGER" },
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!team) {
      throw new DashboardError("TEAM_NOT_FOUND", "팀을 찾을 수 없습니다.");
    }

    const now = new Date();
    const taskWhere = {
      client: { teamId },
      ...(weekNumber ? { weekNumber } : {}),
    };

    const [clientStats, taskByStatus, managerWorkloads, delayedTasks] =
      await Promise.all([
        prisma.client.groupBy({
          by: ["contractStatus"],
          where: { teamId },
          _count: { _all: true },
        }),
        prisma.task.groupBy({
          by: ["status"],
          where: taskWhere,
          _count: { _all: true },
        }),
        prisma.user.findMany({
          where: { teamId, role: "MANAGER" },
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                assignments: true,
                tasks: true,
              },
            },
            tasks: {
              where: {
                status: { not: "COMPLETED" },
                ...(weekNumber ? { weekNumber } : {}),
              },
              select: { id: true, status: true },
            },
          },
        }),
        prisma.task.count({
          where: {
            ...taskWhere,
            dueDate: { lt: now },
            status: { not: "COMPLETED" },
          },
        }),
      ]);

    return {
      scope: "TEAM",
      team: {
        id: team.id,
        name: team.name,
        leader: team.leader,
      },
      weekNumber: weekNumber ?? null,
      summary: {
        clients: Object.fromEntries(
          clientStats.map((row) => [row.contractStatus, row._count._all]),
        ),
        taskByStatus: Object.fromEntries(
          taskByStatus.map((row) => [row.status, row._count._all]),
        ),
        delayedTasks,
      },
      managers: managerWorkloads.map((manager) => ({
        id: manager.id,
        name: manager.name,
        assignedClients: manager._count.assignments,
        totalTasks: manager._count.tasks,
        pendingTasks: manager.tasks.length,
        delayedTasks: manager.tasks.filter((t) => t.status === "DELAYED").length,
      })),
    };
  }

  /** 담당자 — 내 업무 현황 */
  async getManagerDashboard(user: AuthUser, weekNumber?: number) {
    const now = new Date();
    const taskFilter = {
      assigneeId: user.id,
      ...(weekNumber ? { weekNumber } : {}),
    };

    const [assignedClients, tasks, thisWeekTasks] = await Promise.all([
      prisma.client.findMany({
        where: { assignments: { some: { userId: user.id } } },
        select: {
          id: true,
          name: true,
          code: true,
          contractStatus: true,
          schedules: {
            orderBy: [{ targetYear: "desc" }, { targetMonth: "desc" }],
            take: 1,
            select: { id: true, title: true, targetYear: true, targetMonth: true },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.task.groupBy({
        by: ["status"],
        where: taskFilter,
        _count: { _all: true },
      }),
      prisma.task.findMany({
        where: {
          ...taskFilter,
          status: { not: "COMPLETED" },
        },
        orderBy: [{ dueDate: "asc" }, { weekNumber: "asc" }],
        take: 50,
        include: {
          client: { select: { id: true, name: true } },
        },
      }),
    ]);

    const overdue = thisWeekTasks.filter(
      (task) => task.dueDate && task.dueDate < now && task.status !== "COMPLETED",
    );

    return {
      scope: "MANAGER",
      user: { id: user.id, name: user.name, teamId: user.teamId },
      weekNumber: weekNumber ?? null,
      summary: {
        assignedClientCount: assignedClients.length,
        taskByStatus: Object.fromEntries(
          tasks.map((row) => [row.status, row._count._all]),
        ),
        overdueCount: overdue.length,
      },
      clients: assignedClients,
      upcomingTasks: thisWeekTasks,
    };
  }

  /** 역할에 맞는 대시보드 자동 선택 */
  async getDashboardForUser(user: AuthUser, weekNumber?: number) {
    if (canViewAllClients(user.role)) {
      return this.getExecutiveDashboard();
    }

    if (user.role === "LEADER" && user.teamId) {
      return this.getTeamDashboard(user.teamId, weekNumber);
    }

    return this.getManagerDashboard(user, weekNumber);
  }
}

export class DashboardError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "DashboardError";
  }
}

export const dashboardService = new DashboardService();
