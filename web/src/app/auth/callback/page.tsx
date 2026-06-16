"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function finish() {
      if (supabase) {
        await supabase.auth.getSession();
      }
      router.replace("/dashboard");
    }
    void finish();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
        <p className="mt-4 text-sm text-zinc-500">로그인 처리 중…</p>
      </div>
    </div>
  );
}
