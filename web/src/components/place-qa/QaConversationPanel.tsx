"use client";

import { useEffect, useMemo, useState } from "react";
import { Link2, MessageCircle, Send, XCircle } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { PostLinkOpinionDetail } from "@/components/place-qa/PostLinkOpinionDetail";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/FormFields";
import {
  canCloseQaThread,
  canCreateClientQaThread,
  canParticipateQa,
  canReplyQa,
  formatQaParticipant,
  getAuthorRole,
  getContractForQa,
  getMessagesForThread,
  getQaScopeHint,
  getThreadsForContract,
  isInternalQaRole,
  threadNeedsStaffReply,
} from "@/lib/place-qa-utils";
import { getPostLinkOpinionsForContract } from "@/lib/post-link-opinion-utils";
import { QA_THREAD_STATUS_LABELS, type PostLinkOpinion } from "@/lib/types";
import { cn } from "@/lib/cn";

const STATUS_VARIANT: Record<
  "open" | "answered" | "closed",
  "danger" | "success" | "default"
> = {
  open: "danger",
  answered: "success",
  closed: "default",
};

type FeedSelection =
  | { kind: "thread"; id: string }
  | { kind: "opinion"; id: string };

type FeedItem =
  | { kind: "thread"; id: string; sortAt: string; thread: ReturnType<typeof getThreadsForContract>[number] }
  | { kind: "opinion"; id: string; sortAt: string; opinion: PostLinkOpinion };

export function QaConversationPanel({
  contractId,
  compact = false,
}: {
  contractId: string;
  compact?: boolean;
}) {
  const data = useData();
  const { currentUser, activeRole } = useRole();
  const { createQaThread, replyQaThread, closeQaThread } = data;

  const contract = getContractForQa(data, contractId);
  const threads = useMemo(
    () => getThreadsForContract(data, contractId),
    [data, contractId],
  );
  const opinions = useMemo(
    () => getPostLinkOpinionsForContract(data, contractId),
    [data, contractId],
  );
  const feedItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...threads.map((thread) => ({
        kind: "thread" as const,
        id: thread.id,
        sortAt: thread.lastMessageAt,
        thread,
      })),
      ...opinions.map((opinion) => ({
        kind: "opinion" as const,
        id: opinion.id,
        sortAt: opinion.createdAt,
        opinion,
      })),
    ];
    return items.sort((a, b) => b.sortAt.localeCompare(a.sortAt));
  }, [threads, opinions]);

  const canReply = canReplyQa(data, activeRole, currentUser.id, contractId);
  const canCreate = canCreateClientQaThread(
    data,
    activeRole,
    currentUser.id,
    contractId,
  );
  const scopeHint = getQaScopeHint(activeRole);

  const [selection, setSelection] = useState<FeedSelection | null>(null);
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [showCompose, setShowCompose] = useState(false);

  const selectedThread =
    selection?.kind === "thread"
      ? threads.find((t) => t.id === selection.id)
      : undefined;
  const selectedOpinion =
    selection?.kind === "opinion"
      ? opinions.find((o) => o.id === selection.id)
      : undefined;
  const messages = selectedThread
    ? getMessagesForThread(data, selectedThread.id)
    : [];

  useEffect(() => {
    const first = feedItems[0];
    if (!first) {
      setSelection(null);
      return;
    }
    setSelection({ kind: first.kind, id: first.id });
  }, [contractId, feedItems]);

  if (!canParticipateQa(activeRole)) return null;
  if (!canReply && !canCreate) {
    return (
      <Card>
        <CardHeader title="플레이스 · 질의응답" subtitle="조회 권한 없음" />
        <p className="pb-6 text-center text-sm text-zinc-500">
          이 업체 문의에 접근할 수 없습니다.
        </p>
      </Card>
    );
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject.trim() || !newBody.trim()) return;
    const thread = createQaThread(
      contractId,
      newSubject.trim(),
      newBody.trim(),
      currentUser.id,
    );
    setNewSubject("");
    setNewBody("");
    setShowCompose(false);
    setSelection({ kind: "thread", id: thread.id });
  }

  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedThread || !replyBody.trim()) return;
    replyQaThread(selectedThread.id, replyBody.trim(), currentUser.id);
    setReplyBody("");
  }

  return (
    <Card glow={activeRole === "client"}>
      <CardHeader
        title="플레이스 · 질의응답"
        subtitle={
          activeRole === "client"
            ? "문의와 링크 보고서 의견을 한곳에서 확인합니다"
            : `${scopeHint} · 링크 의견 ${opinions.length}건`
        }
        action={
          canCreate && (
            <Button size="sm" onClick={() => setShowCompose((v) => !v)}>
              <MessageCircle className="h-4 w-4" />
              문의하기
            </Button>
          )
        }
      />

      {showCompose && canCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
        >
          <Input
            label="제목"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="예: 플레이스 사진 교체 요청"
            required
          />
          <Textarea
            label="문의 내용"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="질문 내용을 입력해 주세요"
            rows={4}
            required
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              등록
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setShowCompose(false)}
            >
              취소
            </Button>
          </div>
        </form>
      )}

      {feedItems.length === 0 ? (
        <div className="pb-6 text-center text-sm text-zinc-500">
          <p>등록된 문의나 링크 의견이 없습니다.</p>
          {canCreate && (
            <p className="mt-2 text-xs text-zinc-600">
              문의하기 버튼으로 질문을 남기거나, 링크 보고서에서 의견을 등록해
              주세요.
            </p>
          )}
          {isInternalQaRole(activeRole) && (
            <p className="mt-2 text-xs text-zinc-600">
              고객사 포털에서 질문·링크 의견이 등록되면 여기에 표시됩니다.
              <br />
              {scopeHint}
            </p>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-4",
            compact ? "grid-cols-1" : "lg:grid-cols-[240px_1fr]",
          )}
        >
          {!compact && (
            <div className="space-y-1">
              {feedItems.map((item) => {
                if (item.kind === "thread") {
                  const thread = item.thread;
                  const needsReply = threadNeedsStaffReply(data, thread);
                  const isSelected =
                    selection?.kind === "thread" &&
                    selection.id === thread.id;

                  return (
                    <button
                      key={`thread-${thread.id}`}
                      type="button"
                      onClick={() =>
                        setSelection({ kind: "thread", id: thread.id })
                      }
                      className={cn(
                        "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                        isSelected
                          ? "border-emerald-500/40 bg-emerald-500/10"
                          : "border-zinc-800 bg-zinc-950/30 hover:border-zinc-700",
                      )}
                    >
                      <p className="truncate text-sm font-medium text-zinc-200">
                        {thread.subject}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <Badge variant={STATUS_VARIANT[thread.status]}>
                          {needsReply && activeRole !== "client"
                            ? "미답변"
                            : QA_THREAD_STATUS_LABELS[thread.status]}
                        </Badge>
                        <span className="text-[10px] text-zinc-600">
                          {thread.lastMessageAt}
                        </span>
                      </div>
                    </button>
                  );
                }

                const opinion = item.opinion;
                const isSelected =
                  selection?.kind === "opinion" && selection.id === opinion.id;

                return (
                  <button
                    key={`opinion-${opinion.id}`}
                    type="button"
                    onClick={() =>
                      setSelection({ kind: "opinion", id: opinion.id })
                    }
                    className={cn(
                      "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                      isSelected
                        ? "border-cyan-500/40 bg-cyan-500/10"
                        : "border-zinc-800 bg-zinc-950/30 hover:border-zinc-700",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                      <p className="truncate text-sm font-medium text-zinc-200">
                        링크 의견
                      </p>
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {opinion.body}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Badge variant="info">원본 · {opinion.channel}</Badge>
                      <span className="text-[10px] text-zinc-600">
                        {opinion.createdAt}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedOpinion && (
            <PostLinkOpinionDetail data={data} opinion={selectedOpinion} />
          )}

          {selectedThread && !selectedOpinion && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-zinc-100">
                    {selectedThread.subject}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {selectedThread.createdAt} · 주 담당{" "}
                    {formatQaParticipant(
                      data,
                      selectedThread.assignedStaffId,
                      contract,
                    )}
                    {isInternalQaRole(activeRole) &&
                      " · 담당업무 범위 내 누구나 답변 가능"}
                  </p>
                </div>
                {canCloseQaThread(activeRole) &&
                  selectedThread.status !== "closed" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        closeQaThread(selectedThread.id, currentUser.id)
                      }
                    >
                      <XCircle className="h-4 w-4" />
                      종료
                    </Button>
                  )}
              </div>

              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {messages.map((msg) => {
                  const isClient =
                    getAuthorRole(data, msg.authorUserId) === "client";
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "rounded-xl px-3 py-2.5 text-sm",
                        isClient
                          ? "ml-0 mr-8 bg-rose-500/10 text-zinc-200"
                          : "ml-8 mr-0 bg-emerald-500/10 text-zinc-200",
                      )}
                    >
                      <p className="mb-1 text-[10px] font-medium text-zinc-500">
                        {formatQaParticipant(
                          data,
                          msg.authorUserId,
                          contract,
                        )}{" "}
                        · {msg.createdAt}
                      </p>
                      <p className="whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  );
                })}
              </div>

              {selectedThread.status !== "closed" && canReply && (
                <form onSubmit={handleReply} className="mt-4 space-y-2">
                  <Textarea
                    label={activeRole === "client" ? "추가 문의" : "답변"}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder={
                      activeRole === "client"
                        ? "추가 질문을 입력해 주세요"
                        : "고객사에 답변을 입력해 주세요 (담당업무 범위 내 공유)"
                    }
                    rows={3}
                  />
                  <Button type="submit" size="sm" disabled={!replyBody.trim()}>
                    <Send className="h-4 w-4" />
                    {activeRole === "client" ? "전송" : "답변 전송"}
                  </Button>
                </form>
              )}
              {selectedThread.status !== "closed" &&
                isInternalQaRole(activeRole) &&
                !canReply && (
                  <p className="mt-4 text-xs text-zinc-600">
                    이 업체는 담당업무 범위 밖이라 답변할 수 없습니다.
                  </p>
                )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
