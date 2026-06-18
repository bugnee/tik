export type ExecutionType = "optimized" | "influencer" | "experience" | "press";
export type ExecutionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "delayed";

export interface PostLinkEntry {
  id: string;
  url: string;
  dueDate?: string;
  completedDate?: string;
  enteredAt: string;
  /** SEO 타겟 키워드 (고객사 실무 진행 현황) */
  keyword?: string;
  /** 네이버 검색 순위 (1~10, 미측정 시 생략) */
  searchRank?: number;
}

export interface Execution {
  id: string;
  contractId: string;
  type: ExecutionType;
  status: ExecutionStatus;
  completedCount: number;
  targetCount: number;
  dueDate?: string;
  completedDate?: string;
  enteredAt?: string;
  memo?: string;
  postLinks: PostLinkEntry[];
  /** 계약 집행 항목 ID (blog, influencer 등) */
  taskChannelId?: string;
}
