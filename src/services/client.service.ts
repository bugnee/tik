import { Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  AuthUser,
  canViewAllClients,
  ClientScope,
} from "../lib/rbac";

export interface ClientListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  teamId?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function toScope(user: AuthUser): ClientScope {
  return { role: user.role, userId: user.id, teamId: user.teamId };
}

function buildClientWhere(
  scope: ClientScope,
  query: ClientListQuery,
): Prisma.ClientWhereInput {
  const where: Prisma.ClientWhereInput = {};

  if (query.status) {
    where.contractStatus = query.status as Prisma.EnumContractStatusFilter["equals"];
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search } },
      { code: { contains: query.search } },
      { businessNumber: { contains: query.search } },
    ];
  }

  if (canViewAllClients(scope.role)) {
    if (query.teamId) {
      where.teamId = query.teamId;
    }
    return where;
  }

  if (scope.role === "LEADER") {
    if (!scope.teamId) {
      where.id = -1;
      return where;
    }
    where.teamId = query.teamId ?? scope.teamId;
    return where;
  }

  // MANAGER: 배정된 고객사만
  where.assignments = { some: { userId: scope.userId } };
  return where;
}

export class ClientService {
  async list(user: AuthUser, query: ClientListQuery): Promise<PaginatedResult<unknown>> {
    const scope = toScope(user);
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;
    const where = buildClientWhere(scope, query);

    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ contractStatus: "asc" }, { name: "asc" }],
        include: {
          team: { select: { id: true, name: true } },
          assignments: {
            where: { isPrimary: true },
            include: { user: { select: { id: true, name: true } } },
            take: 1,
          },
          _count: { select: { tasks: true, schedules: true } },
        },
      }),
      prisma.client.count({ where }),
    ]);

    return {
      items: items.map((client) => ({
        id: client.id,
        code: client.code,
        name: client.name,
        contractStatus: client.contractStatus,
        team: client.team,
        primaryManager: client.assignments[0]?.user ?? null,
        taskCount: client._count.tasks,
        scheduleCount: client._count.schedules,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async assignPrimary(clientId: number, managerId: number, actor: AuthUser) {
    const [client, manager] = await Promise.all([
      prisma.client.findUnique({ where: { id: clientId } }),
      prisma.user.findUnique({ where: { id: managerId } }),
    ]);

    if (!client || !manager) {
      throw new OrgError("NOT_FOUND", "고객사 또는 담당자를 찾을 수 없습니다.");
    }

    if (manager.role !== "MANAGER") {
      throw new OrgError("INVALID_ROLE", "담당자(MANAGER)만 배정할 수 있습니다.");
    }

    if (client.teamId && manager.teamId !== client.teamId) {
      throw new OrgError("TEAM_MISMATCH", "담당자와 고객사의 팀이 일치하지 않습니다.");
    }

    await prisma.$transaction([
      prisma.clientAssignment.updateMany({
        where: { clientId, isPrimary: true },
        data: { isPrimary: false },
      }),
      prisma.clientAssignment.upsert({
        where: { clientId_userId: { clientId, userId: managerId } },
        update: { isPrimary: true },
        create: { clientId, userId: managerId, isPrimary: true },
      }),
    ]);

    return { clientId, managerId, managerName: manager.name };
  }

  async bulkAssignRoundRobin(teamId: number, clientIds: number[]) {
    const managers = await prisma.user.findMany({
      where: { teamId, role: "MANAGER" },
      orderBy: { id: "asc" },
    });

    if (!managers.length) {
      throw new OrgError("NO_MANAGERS", "팀에 담당자가 없습니다.");
    }

    const results = [];
    for (let i = 0; i < clientIds.length; i++) {
      const manager = managers[i % managers.length];
      const result = await this.assignPrimary(clientIds[i], manager.id, {
        id: 0,
        role: "LEADER" as Role,
        teamId,
        name: "system",
      });
      results.push(result);
    }

    return { assigned: results.length, managers: managers.length };
  }
}

export class OrgError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "OrgError";
  }
}

export const clientService = new ClientService();
