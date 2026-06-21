import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { getSeedAuthDirectory } from "@/lib/seed-data";
import type { AccountProfile, User, UserRole } from "@/lib/types";



export const MOCK_AUTH_STORAGE_KEY = "tripitkorea-mock-auth";



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
  const redirectTo = getOAuthRedirectUrl();
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: { access_type: "offline", prompt: "select_account" },
    },
  });
  if (error) throw error;
}

/** OAuth 콜백 URL — 로컬·배포 공통 */
export function getOAuthRedirectUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${siteUrl}/auth/callback`;
}

/** Google OAuth 사용자 → ERP 세션 사용자 */
export function mapSupabaseUser(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  identities?: Array<{
    provider?: string;
    identity_data?: Record<string, unknown>;
  }>;
}): AuthSessionUser {
  const meta = user.user_metadata ?? {};
  const googleIdentity = user.identities?.find((i) => i.provider === "google");
  const identityData = googleIdentity?.identity_data ?? {};
  const googleSub =
    (identityData.sub as string | undefined) ||
    (meta.sub as string | undefined) ||
    user.id;

  return {
    googleId: googleSub,
    email: user.email ?? (identityData.email as string) ?? "",
    name:
      (meta.full_name as string) ||
      (meta.name as string) ||
      (identityData.full_name as string) ||
      (identityData.name as string) ||
      user.email?.split("@")[0] ||
      "사용자",
    avatarUrl:
      (meta.avatar_url as string) ||
      (meta.picture as string) ||
      (identityData.avatar_url as string) ||
      (identityData.picture as string),
  };
}



/** 로그인 세션과 ERP 사용자 매칭 — 저장 데이터가 깨져도 시드에서 복구 */
export function findAuthMatchedUser(
  auth: Pick<AuthSessionUser, "googleId" | "email">,
  users: User[],
): User | undefined {
  if (auth.googleId) {
    const byGoogle = users.find((user) => user.googleId === auth.googleId);
    if (byGoogle) return byGoogle;
  }
  if (auth.email) {
    const byEmail = users.find((user) => user.email === auth.email);
    if (byEmail) return byEmail;
  }

  const seed = getSeedAuthDirectory();
  if (auth.googleId) {
    const seedByGoogle = seed.users.find(
      (user) => user.googleId === auth.googleId,
    );
    if (seedByGoogle) return seedByGoogle;
  }
  if (auth.email) {
    const seedByEmail = seed.users.find((user) => user.email === auth.email);
    if (seedByEmail) return seedByEmail;
  }

  const seedProfile = seed.accountProfiles.find(
    (profile) =>
      profile.googleId === auth.googleId ||
      (auth.email && profile.email === auth.email),
  );
  if (seedProfile?.linkedUserId) {
    return (
      users.find((user) => user.id === seedProfile.linkedUserId) ??
      seed.users.find((user) => user.id === seedProfile.linkedUserId)
    );
  }

  return undefined;
}

function findUserByProfileKeys(
  accountProfile: AccountProfile,
  users: User[],
): User | undefined {
  if (accountProfile.googleId) {
    const byGoogle = users.find(
      (user) => user.googleId === accountProfile.googleId,
    );
    if (byGoogle) return byGoogle;
  }
  if (accountProfile.email) {
    const byEmail = users.find((user) => user.email === accountProfile.email);
    if (byEmail) return byEmail;
  }
  if (accountProfile.contractId) {
    const byContract = users.find(
      (user) =>
        user.role === "client" &&
        user.contractId === accountProfile.contractId,
    );
    if (byContract) return byContract;
  }
  if (accountProfile.linkedUserId) {
    const linked = users.find((user) => user.id === accountProfile.linkedUserId);
    if (
      linked &&
      (!accountProfile.role || linked.role === accountProfile.role)
    ) {
      return linked;
    }
  }
  return undefined;
}

/** 승인된 계정 프로필 → ERP 사용자 연결 */
export function resolveAuthenticatedUser(
  accountProfile: AccountProfile,
  users: User[],
): User | null {
  const matched = findUserByProfileKeys(accountProfile, users);
  if (matched) return matched;

  const seed = getSeedAuthDirectory();
  const seedMatched = findUserByProfileKeys(accountProfile, seed.users);
  if (seedMatched) return seedMatched;

  const seedProfile = seed.accountProfiles.find(
    (profile) =>
      profile.googleId === accountProfile.googleId ||
      (accountProfile.email && profile.email === accountProfile.email) ||
      (accountProfile.linkedUserId &&
        profile.linkedUserId === accountProfile.linkedUserId),
  );
  if (seedProfile) {
    const fromSeedProfile = findUserByProfileKeys(seedProfile, seed.users);
    if (fromSeedProfile) return fromSeedProfile;
  }

  return buildUserFromAccountProfile(accountProfile);
}

/** users 배열에 없을 때 프로필·시드로 최소 사용자 구성 */
export function buildUserFromAccountProfile(
  accountProfile: AccountProfile,
): User | null {
  const role = accountProfile.role;
  if (!role) return null;

  const seed = getSeedAuthDirectory();
  if (accountProfile.linkedUserId) {
    const seedUser = seed.users.find(
      (user) => user.id === accountProfile.linkedUserId,
    );
    if (seedUser) return seedUser;
  }

  if (role === "client" && accountProfile.contractId) {
    return {
      id:
        accountProfile.linkedUserId ??
        `u-client-${accountProfile.contractId.replace("c-", "")}`,
      name: accountProfile.name,
      role: "client",
      contractId: accountProfile.contractId,
      email: accountProfile.email,
      googleId: accountProfile.googleId,
      isFinancialViewer: false,
    };
  }

  const demoMatch = findAuthMatchedUser(
    {
      googleId: accountProfile.googleId ?? "",
      email: accountProfile.email ?? "",
    },
    seed.users,
  );
  if (demoMatch) return demoMatch;

  return {
    id: accountProfile.linkedUserId ?? accountProfile.id,
    name: accountProfile.name,
    role,
    isFinancialViewer: accountProfile.isFinancialViewer ?? false,
    teamId: accountProfile.teamId,
    partnerId: accountProfile.partnerId,
    contractId: accountProfile.contractId,
    email: accountProfile.email,
    googleId: accountProfile.googleId,
  };
}



/** 데모용 Google 계정 (Supabase 미설정 시 · 시드 accountProfiles와 googleId 매칭) */

export const DEMO_GOOGLE_ACCOUNTS: DemoGoogleAccount[] = [

  {

    googleId: "demo-google-ceo",

    email: "ceo@tripitkorea.co.kr",

    name: "최대표",

    roleLabel: "대표",

    description: "전사 대시보드 · 권한 승인",

  },

  {

    googleId: "demo-google-exec",

    email: "exec@tripitkorea.co.kr",

    name: "이서연",

    roleLabel: "임원",

    description: "조직 실적 · 성과급 2차 결재",

  },

  {

    googleId: "demo-google-finance",

    email: "finance@tripitkorea.co.kr",

    name: "강재무",

    roleLabel: "재무",

    description: "입금 확인 · 지급 · P&L",

  },

  {

    googleId: "demo-google-leader",

    email: "leader@tripitkorea.co.kr",

    name: "박준호",

    roleLabel: "팀장",

    description: "마케팅 1팀 · 연장·성과급 1차",

  },

  {

    googleId: "demo-google-staff",

    email: "staff@tripitkorea.co.kr",

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

    email: "client@jejuoseong.kr",

    name: "제주 오성",

    roleLabel: "고객사",

    description: "제주 오성 · 실운영 샘플 (최적블 30건·키워드 순위)",

  },

  {

    googleId: "demo-google-client-2",

    email: "client@haeundae.kr",

    name: "부산해운대펜션",

    roleLabel: "고객사",

    description: "고객사 포털 · 성과·소통",

  },

  {

    googleId: "demo-google-client-3",

    email: "client@jejuorum.kr",

    name: "제주오름카페",

    roleLabel: "고객사",

    description: "고객사 포털 · 일정·체험단",

  },

  {

    googleId: "demo-google-client-4",

    email: "client@beautyclinic.kr",

    name: "강남뷰티클리닉",

    roleLabel: "고객사",

    description: "고객사 포털 · 플레이스·Q&A",

  },

  {

    googleId: "demo-google-pending",

    email: "newbie@gmail.com",

    name: "오신규",

    roleLabel: "승인 대기",

    description: "대표·임원 승인 후 이용",

  },

];


