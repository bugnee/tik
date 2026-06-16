import { Role } from "@prisma/client";

export interface AuthUser {
  id: number;
  role: Role;
  teamId: number | null;
  name: string;
}

export interface ClientScope {
  role: Role;
  userId: number;
  teamId: number | null;
}

export function canViewAllClients(role: Role): boolean {
  return role === "CEO" || role === "EXECUTIVE";
}

export function canViewTeamClients(role: Role): boolean {
  return role === "LEADER" || canViewAllClients(role);
}

export function canManageTeam(role: Role): boolean {
  return role === "LEADER" || canViewAllClients(role);
}

export function canAssignClients(role: Role): boolean {
  return canManageTeam(role);
}

export function canBulkGenerateSchedules(role: Role): boolean {
  return canManageTeam(role);
}
