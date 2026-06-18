"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

/** Google OAuth(PKCE) 리다이렉트 후 code → 세션 교환 */
export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("로그인 처리 중…");

  useEffect(() => {
    async function finish() {
      if (!supabase) {
        router.replace("/login?error=supabase_not_configured");
        return;
      }

      const oauthError =
        searchParams.get("error_description") ?? searchParams.get("error");
      if (oauthError) {
        router.replace(`/login?error=${encodeURIComponent(oauthError)}`);
        return;
      }

      const code = searchParams.get("code");
      try {
        if (code) {
          setMessage("Google 계정 확인 중…");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            router.replace(`/login?error=${encodeURIComponent(error.message)}`);
            return;
          }
        } else {
          await supabase.auth.getSession();
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session) {
          router.replace(
            `/login?error=${encodeURIComponent("세션을 만들지 못했습니다. 다시 시도해 주세요.")}`,
          );
          return;
        }

        router.replace("/dashboard");
      } catch (err) {
        const text =
          err instanceof Error ? err.message : "로그인 처리 중 오류가 발생했습니다.";
        router.replace(`/login?error=${encodeURIComponent(text)}`);
      }
    }

    void finish();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
        <p className="mt-4 text-sm text-zinc-500">{message}</p>
      </div>
    </div>
  );
}
