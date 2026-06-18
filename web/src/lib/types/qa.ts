import type { ExecutionType } from "@/lib/types/execution";

/** 네이버 플레이스 접속 정보 (고객사 입력 · 당사 열람) */
export interface PlaceCredentials {
  id: string;
  contractId: string;
  placeUrl: string;
  loginId: string;
  password: string;
  updatedAt: string;
  updatedByUserId: string;
}

export type PlaceCredentialsInput = Pick<
  PlaceCredentials,
  "placeUrl" | "loginId" | "password"
>;

export type QaThreadStatus = "open" | "answered" | "closed";

/** 플레이스 · 계약 관련 질의응답 스레드 */
export interface QaThread {
  id: string;
  contractId: string;
  subject: string;
  status: QaThreadStatus;
  createdByUserId: string;
  assignedStaffId: string;
  createdAt: string;
  lastMessageAt: string;
  closedAt?: string;
  closedByUserId?: string;
}

export interface QaMessage {
  id: string;
  threadId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  /** 메시지 첨부 (이미지·문서 등, data URL 저장) */
  attachments?: QaMessageAttachment[];
}

/** Q&A 메시지 첨부파일 */
export interface QaMessageAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  kind: "image" | "file";
  dataUrl: string;
  byteSize: number;
}

/** 게시 · 링크 보고서에서 등록한 의견 (플레이스 · Q&A 목록에 원본 링크와 함께 표시) */
export interface PostLinkOpinion {
  id: string;
  contractId: string;
  linkId: string;
  linkUrl: string;
  channel: string;
  reportSource: string;
  taskType?: string;
  executionType?: ExecutionType;
  body: string;
  imageUrls: string[];
  authorUserId: string;
  createdAt: string;
}

export type PostLinkOpinionInput = Omit<PostLinkOpinion, "id" | "createdAt">;
