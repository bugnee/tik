export const PUBLIC_AUTH_STORAGE_KEY = "tripitkorea-public-auth-v1";

export interface PublicReviewerSession {
  id: string;
  name: string;
  email: string;
  channelHandle?: string;
}

export interface DemoReviewerAccount extends PublicReviewerSession {
  description: string;
}

export const DEMO_REVIEWER_ACCOUNTS: DemoReviewerAccount[] = [
  {
    id: "rev-demo-1",
    name: "리뷰어 김블로그",
    email: "reviewer.demo@tripitkorea.co.kr",
    channelHandle: "맛집탐험가_kim",
    description: "네이버 블로그 · 제주 맛집",
  },
  {
    id: "rev-demo-2",
    name: "인플루언서 박릴스",
    email: "reels.demo@tripitkorea.co.kr",
    channelHandle: "@jeju_daily",
    description: "인스타 릴스 · 여행",
  },
];

export function readReviewerSession(): PublicReviewerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PUBLIC_AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PublicReviewerSession;
  } catch {
    return null;
  }
}

export function writeReviewerSession(user: PublicReviewerSession | null) {
  if (typeof window === "undefined") return;
  if (!user) {
    localStorage.removeItem(PUBLIC_AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(PUBLIC_AUTH_STORAGE_KEY, JSON.stringify(user));
}
