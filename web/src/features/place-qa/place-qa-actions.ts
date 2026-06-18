import { canCreateClientQaThread, canReplyQa } from "@/lib/place-qa-utils";
import type {
  AppData,
  PlaceCredentials,
  PlaceCredentialsInput,
  PostLinkOpinion,
  PostLinkOpinionInput,
  QaMessage,
  QaMessageAttachment,
  QaThread,
} from "@/lib/types";
import type { IdFactory, TodayFn } from "@/core/data/persist-types";

export type PlaceQaActionContext = {
  newId: IdFactory;
  todayISO: TodayFn;
};

export function applyUpsertPlaceCredentials(
  prev: AppData,
  contractId: string,
  input: PlaceCredentialsInput,
  userId: string,
  ctx: PlaceQaActionContext,
): { next: AppData; saved: PlaceCredentials } {
  const now = ctx.todayISO();
  const existing = prev.placeCredentials.find((p) => p.contractId === contractId);
  const saved: PlaceCredentials = existing
    ? { ...existing, ...input, updatedAt: now, updatedByUserId: userId }
    : {
        id: ctx.newId("pc"),
        contractId,
        ...input,
        updatedAt: now,
        updatedByUserId: userId,
      };
  const rest = prev.placeCredentials.filter((p) => p.contractId !== contractId);
  return {
    saved,
    next: { ...prev, placeCredentials: [...rest, saved] },
  };
}

export function applyCreateQaThread(
  prev: AppData,
  contractId: string,
  subject: string,
  body: string,
  userId: string,
  attachments: QaMessageAttachment[],
  ctx: PlaceQaActionContext,
): { next: AppData; created: QaThread } {
  const now = ctx.todayISO();
  const threadId = ctx.newId("qa");
  const messageId = ctx.newId("qm");
  let created: QaThread = {
    id: threadId,
    contractId,
    subject,
    status: "open",
    createdByUserId: userId,
    assignedStaffId: "",
    createdAt: now,
    lastMessageAt: now,
  };

  const contract = prev.contracts.find((c) => c.id === contractId);
  const author = prev.users.find((u) => u.id === userId);
  if (
    !contract ||
    !author ||
    !canCreateClientQaThread(prev, author.role, userId, contractId)
  ) {
    return { next: prev, created };
  }

  created = { ...created, assignedStaffId: contract.assignedStaffId };
  const message: QaMessage = {
    id: messageId,
    threadId,
    authorUserId: userId,
    body,
    createdAt: now,
    ...(attachments.length > 0 ? { attachments } : {}),
  };

  return {
    created,
    next: {
      ...prev,
      qaThreads: [...prev.qaThreads, created],
      qaMessages: [...prev.qaMessages, message],
    },
  };
}

export function applyReplyQaThread(
  prev: AppData,
  threadId: string,
  body: string,
  userId: string,
  attachments: QaMessageAttachment[],
  ctx: PlaceQaActionContext,
): { next: AppData; message: QaMessage } {
  const now = ctx.todayISO();
  const message: QaMessage = {
    id: ctx.newId("qm"),
    threadId,
    authorUserId: userId,
    body,
    createdAt: now,
    ...(attachments.length > 0 ? { attachments } : {}),
  };

  const author = prev.users.find((u) => u.id === userId);
  const thread = prev.qaThreads.find((t) => t.id === threadId);
  if (
    !author ||
    !thread ||
    !canReplyQa(prev, author.role, userId, thread.contractId)
  ) {
    return { next: prev, message };
  }

  const isClient = author.role === "client";
  return {
    message,
    next: {
      ...prev,
      qaMessages: [...prev.qaMessages, message],
      qaThreads: prev.qaThreads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              lastMessageAt: now,
              status: isClient ? ("open" as const) : ("answered" as const),
            }
          : t,
      ),
    },
  };
}

export function applyCloseQaThread(
  prev: AppData,
  threadId: string,
  userId: string,
  ctx: PlaceQaActionContext,
): AppData {
  const now = ctx.todayISO();
  return {
    ...prev,
    qaThreads: prev.qaThreads.map((t) =>
      t.id === threadId
        ? {
            ...t,
            status: "closed" as const,
            closedAt: now,
            closedByUserId: userId,
          }
        : t,
    ),
  };
}

export function applyAddPostLinkOpinion(
  prev: AppData,
  input: PostLinkOpinionInput,
  ctx: PlaceQaActionContext,
): { next: AppData; opinion: PostLinkOpinion } {
  const opinion: PostLinkOpinion = {
    ...input,
    id: ctx.newId("plo"),
    createdAt: ctx.todayISO(),
    body: input.body.trim(),
    imageUrls: input.imageUrls ?? [],
  };
  return {
    opinion,
    next: {
      ...prev,
      postLinkOpinions: [...(prev.postLinkOpinions ?? []), opinion],
    },
  };
}
