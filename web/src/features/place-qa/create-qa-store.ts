import type { StoreDeps } from "@/core/data/persist-types";
import {
  applyAddPostLinkOpinion,
  applyCloseQaThread,
  applyCreateQaThread,
  applyReplyQaThread,
  applyUpsertPlaceCredentials,
} from "@/features/place-qa/place-qa-actions";
import type {
  PlaceCredentials,
  PlaceCredentialsInput,
  PostLinkOpinion,
  PostLinkOpinionInput,
  QaMessage,
  QaMessageAttachment,
  QaThread,
} from "@/lib/types";

export type QaStore = {
  upsertPlaceCredentials: (
    contractId: string,
    input: PlaceCredentialsInput,
    userId: string,
  ) => PlaceCredentials;
  createQaThread: (
    contractId: string,
    subject: string,
    body: string,
    userId: string,
    attachments?: QaMessageAttachment[],
  ) => QaThread;
  replyQaThread: (
    threadId: string,
    body: string,
    userId: string,
    attachments?: QaMessageAttachment[],
  ) => QaMessage;
  closeQaThread: (threadId: string, userId: string) => void;
  addPostLinkOpinion: (input: PostLinkOpinionInput) => PostLinkOpinion;
};

export function createQaStore(deps: StoreDeps): QaStore {
  const ctx = { newId: deps.newId, todayISO: deps.todayISO };

  return {
    upsertPlaceCredentials(contractId, input, userId) {
      let saved!: PlaceCredentials;
      deps.persist((prev) => {
        const result = applyUpsertPlaceCredentials(
          prev,
          contractId,
          input,
          userId,
          ctx,
        );
        saved = result.saved;
        return result.next;
      });
      return saved;
    },

    createQaThread(contractId, subject, body, userId, attachments = []) {
      let created!: QaThread;
      deps.persist((prev) => {
        const result = applyCreateQaThread(
          prev,
          contractId,
          subject,
          body,
          userId,
          attachments,
          ctx,
        );
        created = result.created;
        return result.next;
      });
      return created;
    },

    replyQaThread(threadId, body, userId, attachments = []) {
      let message!: QaMessage;
      deps.persist((prev) => {
        const result = applyReplyQaThread(
          prev,
          threadId,
          body,
          userId,
          attachments,
          ctx,
        );
        message = result.message;
        return result.next;
      });
      return message;
    },

    closeQaThread(threadId, userId) {
      deps.persist((prev) => applyCloseQaThread(prev, threadId, userId, ctx));
    },

    addPostLinkOpinion(input) {
      let opinion!: PostLinkOpinion;
      deps.persist((prev) => {
        const result = applyAddPostLinkOpinion(prev, input, ctx);
        opinion = result.opinion;
        return result.next;
      });
      return opinion;
    },
  };
}
