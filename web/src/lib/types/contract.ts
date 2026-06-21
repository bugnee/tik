export type ContractStatus = "active" | "terminated";

export type TerminationReason =
  | "budget_reduction"
  | "competitor_switch"
  | "performance_issue"
  | "client_request"
  | "service_complete"
  | "other";

export type PipelineCategory =
  | "in_progress"
  | "extension_imminent"
  | "contract_ending";

/** 재무담당 업체 입금 확인 상태 */
export type ClientDepositStatus =
  | "pending"
  | "completed"
  | "overdue"
  | "other";

export interface Contract {
  id: string;
  /** 상호명 (매장·브랜드 표기명) */
  clientName: string;
  /** 회사명 (법인·사업자 등록상 상호) */
  companyName?: string;
  monthlyFee: number;
  targetOptimized: number;
  targetInfluencer: number;
  targetExperience: number;
  targetInstaCard: number;
  targetYoutube: number;
  targetInstagram: number;
  targetClip: number;
  targetTiktok: number;
  hasPlaceSetting: boolean;
  isExtension: boolean;
  hasReferralPromo: boolean;
  /** 리셀러 프로모션 — 리셀러 ID */
  referrerPartnerId?: string;
  assignedStaffId: string;
  teamId: string;
  optimizedDone: number;
  influencerDone: number;
  youtubeDone: number;
  instagramDone: number;
  clipDone: number;
  tiktokDone: number;
  contractStartDate: string;
  contractEndDate: string;
  status: ContractStatus;
  terminationReason?: TerminationReason;
  terminatedAt?: string;
  /** 연속 재계약(연장) 개월 수 — 4 이상이면 성과급 지급 가능 (해지 후 재계약 시 1부터 재산정) */
  renewalMonthCount: number;
  /** 담당 업체(고객) 광고비 입금일 — 익월 정산 주기 기준 */
  lastClientDepositDate?: string;
  /** 연장 계약 전환 후 재무담당 입금 확인 상태 */
  clientDepositStatus?: ClientDepositStatus;
  /** 고객사 주소 · 지역 (참고·검색용, 업무 진행 조건 아님) */
  address?: string;
  regionProvince?: string;
  regionCity?: string;
  /** 사용자 추가 집행 항목별 월 목표 (채널 ID → 건수) */
  channelTargets?: Record<string, number>;
  /** 고객사 네이버 플레이스 링크 */
  placeLink?: string;
  /** 고객사 인스타그램 링크 */
  instagramLink?: string;
  /** 고객사 유튜브 링크 */
  youtubeLink?: string;
  /** 고객사 기타 채널 링크 */
  otherLink?: string;
  /** 사업자 등록번호 */
  businessRegistrationNumber?: string;
  /** 고객사 대표 전화 */
  clientPhone?: string;
  /** 대표자명 */
  representativeName?: string;
  /** 고객사 이메일 */
  clientEmail?: string;
  /** 고객사 담당자명 (내부 실무 담당과 별도) */
  clientContactName?: string;
  /** 고객사 담당자 연락처 */
  clientContactPhone?: string;
}

export interface ContractRecord {
  id: string;
  contractId: string;
  period: string;
  assignedStaffId: string;
  teamId: string;
  startedAt: string;
  endedAt?: string;
  monthlyFee: number;
  isExtension: boolean;
  terminationReason?: TerminationReason;
  note?: string;
}

/** 계약별 업무 메모 — 날짜·당시 담당자 자동 기록 */
export interface ContractMemo {
  id: string;
  contractId: string;
  body: string;
  createdAt: string;
  assignedStaffId: string;
  authorUserId: string;
}

export type ContractMemoInput = Pick<ContractMemo, "contractId" | "body">;

export interface ExtensionApproval {
  id: string;
  contractId: string;
  requestedBy: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

/** 계약 조건 변경 결재 — 제안값 (ContractTermsFormValues와 동일 필드) */
export type ContractTermsProposedValues = Pick<
  Contract,
  | "monthlyFee"
  | "contractStartDate"
  | "contractEndDate"
  | "hasPlaceSetting"
  | "assignedStaffId"
  | "teamId"
  | "targetOptimized"
  | "targetInfluencer"
  | "targetExperience"
  | "targetInstaCard"
  | "targetYoutube"
  | "targetInstagram"
  | "targetClip"
  | "targetTiktok"
> & {
  channelTargets?: Record<string, number>;
  isExtension?: boolean;
  hasReferralPromo?: boolean;
  referrerPartnerId?: string;
};

/** 재계약·조건 변경 팀장 결재 */
export interface ContractTermsApproval {
  id: string;
  contractId: string;
  requestedBy: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  mode: "amend" | "renewal" | "recontract";
  proposedValues: ContractTermsProposedValues;
  reviewedBy?: string;
  reviewedAt?: string;
}
