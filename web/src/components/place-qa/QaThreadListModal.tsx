"use client";

import { ChevronRight, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  getMessagesForThread,
  threadNeedsStaffReply,
} from "@/lib/place-qa-utils";
import type { AppData, QaThread } from "@/lib/types";
import { QA_THREAD_STATUS_LABELS } from "@/lib/types";
import { getClientName, getUserName } from "@/lib/selectors";

type QaThreadListModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  threads: QaThread[];
  data: AppData;
};

export function QaThreadListModal({
  open,
  onClose,
  title,
  description,
  threads,
  data,
}: QaThreadListModalProps) {
  const router = useRouter();

  const sorted = [...threads].sort((a, b) =>
    b.lastMessageAt.localeCompare(a.lastMessageAt),
  );

  function goToContract(contractId: string) {
    onClose();
    router.push(`/contracts/${contractId}`);
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {description && (
        <p className="mb-4 text-sm text-zinc-500">{description}</p>
      )}
      <div className="space-y-2">
        {sorted.map((thread) => {
          const messages = getMessagesForThread(data, thread.id);
          const lastMessage = messages[messages.length - 1];
          const needsReply = threadNeedsStaffReply(data, thread);
          const statusVariant =
            thread.status === "closed"
              ? "default"
              : needsReply
                ? "danger"
                : thread.status === "answered"
                  ? "success"
                  : "warning";

          return (
            <button
              key={thread.id}
              type="button"
              onClick={() => goToContract(thread.contractId)}
              className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-left transition-colors hover:border-emerald-500/30 hover:bg-zinc-900"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-100">{thread.subject}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {getClientName(data, thread.contractId)} · 담당{" "}
                  {getUserName(data, thread.assignedStaffId)}
                </p>
                {lastMessage && (
                  <p className="mt-1 line-clamp-1 text-xs text-zinc-600">
                    {lastMessage.body}
                  </p>
                )}
                <p className="mt-1 text-xs text-zinc-600">
                  최근 {thread.lastMessageAt}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={statusVariant}>
                  {needsReply && thread.status !== "closed"
                    ? "미답변"
                    : QA_THREAD_STATUS_LABELS[thread.status]}
                </Badge>
                <ChevronRight className="h-4 w-4 text-zinc-600" />
              </div>
            </button>
          );
        })}
        {sorted.length === 0 && (
          <p className="py-12 text-center text-sm text-zinc-500">
            해당 문의가 없습니다
          </p>
        )}
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-600">
        <Clock className="h-3.5 w-3.5" />
        문의를 클릭하면 계약 상세 · 고객사 Q&A로 이동합니다
      </p>
    </Modal>
  );
}
