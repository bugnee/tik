import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthUser } from "../lib/rbac";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** X-User-Id 헤더 기반 인증 (데모용 — 운영 시 JWT/세션으로 교체) */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userIdHeader = req.header("X-User-Id");
  if (!userIdHeader) {
    return res.status(401).json({
      code: "UNAUTHORIZED",
      message: "X-User-Id 헤더가 필요합니다.",
    });
  }

  const userId = Number(userIdHeader);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({
      code: "UNAUTHORIZED",
      message: "유효하지 않은 사용자 ID입니다.",
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, teamId: true, name: true },
  });

  if (!user) {
    return res.status(401).json({
      code: "UNAUTHORIZED",
      message: "사용자를 찾을 수 없습니다.",
    });
  }

  req.user = user;
  next();
}

/** 선택적 인증 (공개 + 로그인 혼합 API용) */
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const userIdHeader = req.header("X-User-Id");
  if (!userIdHeader) {
    return next();
  }

  const userId = Number(userIdHeader);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, teamId: true, name: true },
  });

  if (user) {
    req.user = user;
  }
  next();
}
