import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";



export const MOCK_AUTH_STORAGE_KEY = "tripit-mock-auth";



export interface AuthSessionUser {

  googleId: string;

  email: string;

  name: string;

  avatarUrl?: string;

}



/** 로그인 화면용 데모 Google 계정 */

export interface DemoGoogleAccount extends AuthSessionUser {

  roleLabel: string;

  description?: string;

}



export function isSupabaseConfigured(): boolean {

  return Boolean(supabase);

}



export function readMockAuthSession(): AuthSessionUser | null {

  if (typeof window === "undefined") return null;

  try {

    const raw = localStorage.getItem(MOCK_AUTH_STORAGE_KEY);

    if (!raw) return null;

    return JSON.parse(raw) as AuthSessionUser;

  } catch {

    return null;

  }

}



export function writeMockAuthSession(user: AuthSessionUser | null) {

  if (typeof window === "undefined") return;

  if (!user) {

    localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);

    return;

  }

  localStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify(user));

}



export async function signInWithGoogleRedirect(client: SupabaseClient) {

  const redirectTo = `${window.location.origin}/auth/callback`;

  const { error } = await client.auth.signInWithOAuth({

    provider: "google",

    options: {

      redirectTo,

      queryParams: { access_type: "offline", prompt: "consent" },

    },

  });

  if (error) throw error;

}



export function mapSupabaseUser(user: {

  id: string;

  email?: string;

  user_metadata?: Record<string, unknown>;

}): AuthSessionUser {

  const meta = user.user_metadata ?? {};

  return {

    googleId: user.id,

    email: user.email ?? "",

    name:

      (meta.full_name as string) ||

      (meta.name as string) ||

      user.email?.split("@")[0] ||

      "사용자",

    avatarUrl: (meta.avatar_url as string) || (meta.picture as string),

  };

}



/** 데모용 Google 계정 (Supabase 미설정 시 · 시드 accountProfiles와 googleId 매칭) */

export const DEMO_GOOGLE_ACCOUNTS: DemoGoogleAccount[] = [

  {

    googleId: "demo-google-ceo",

    email: "ceo@tripit.co.kr",

    name: "최대표",

    roleLabel: "대표",

    description: "전사 대시보드 · 권한 승인",

  },

  {

    googleId: "demo-google-exec",

    email: "exec@tripit.co.kr",

    name: "이서연",

    roleLabel: "임원",

    description: "조직 실적 · 성과급 2차 결재",

  },

  {

    googleId: "demo-google-finance",

    email: "finance@tripit.co.kr",

    name: "강재무",

    roleLabel: "재무",

    description: "입금 확인 · 지급 · P&L",

  },

  {

    googleId: "demo-google-leader",

    email: "leader@tripit.co.kr",

    name: "박준호",

    roleLabel: "팀장",

    description: "마케팅 1팀 · 연장·성과급 1차",

  },

  {

    googleId: "demo-google-staff",

    email: "staff@tripit.co.kr",

    name: "김민지",

    roleLabel: "담당",

    description: "담당 업체 · 실행·원가 입력",

  },

  {

    googleId: "demo-google-partner",

    email: "press@medialab.kr",

    name: "김기자",

    roleLabel: "파트너사",

    description: "미디어랩 PR · 기자단 (파트너사)",

  },

  {

    googleId: "demo-google-vendor",

    email: "king@experience.kr",

    name: "박체험",

    roleLabel: "파트너사",

    description: "체험단킹 · 체험단·리뷰 (파트너사)",

  },

  {

    googleId: "demo-google-referral",

    email: "intro@bizintro.kr",

    name: "임리셀",

    roleLabel: "리셀러",

    description: "비즈리셀러망 · 고객 영업 · 10% 수수료",

  },

  {

    googleId: "demo-google-client",

    email: "client@seoulfood.kr",

    name: "서울맛집연구소",

    roleLabel: "고객사",

    description: "계약 · 진행 · 링크 통합 보고서",

  },

  {

    googleId: "demo-google-pending",

    email: "newbie@gmail.com",

    name: "오신규",

    roleLabel: "승인 대기",

    description: "대표·임원 승인 후 이용",

  },

];


