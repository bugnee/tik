"use client";

import { Clock, LogOut, ShieldAlert, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function PendingApprovalScreen() {
  const { sessionUser, accountProfile, logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <Card className="w-full max-w-lg border-zinc-800/80 bg-zinc-900/60 p-8 text-center backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/30">
          <Clock className="h-8 w-8 text-amber-400" />
        </div>

        <h1 className="text-xl font-bold text-zinc-50">승인 대기 중</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          {sessionUser?.name ?? accountProfile?.name}님, Google 로그인이
          완료되었습니다.
          <br />
          대표 또는 임원이 권한(역할·팀)을 부여하면 ERP를 이용할 수 있습니다.
        </p>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3 text-left">
          <p className="text-xs text-zinc-500">로그인 계정</p>
          <p className="mt-1 text-sm font-medium text-zinc-200">
            {sessionUser?.email ?? accountProfile?.email}
          </p>
          {accountProfile?.requestedAt && (
            <p className="mt-2 text-xs text-zinc-600">
              신청일: {accountProfile.requestedAt}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2.5 text-left">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
          <p className="text-xs text-zinc-500">
            승인 후 자동으로 대시보드로 이동합니다. 페이지를 새로고침해도
            됩니다.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="mt-8 w-full"
          onClick={() => void logout()}
        >
          <LogOut className="h-4 w-4" />
          다른 계정으로 로그인
        </Button>
      </Card>
    </div>
  );
}

export function RejectedApprovalScreen() {
  const { accountProfile, logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <Card className="w-full max-w-lg border-zinc-800/80 bg-zinc-900/60 p-8 text-center backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 ring-1 ring-rose-500/30">
          <XCircle className="h-8 w-8 text-rose-400" />
        </div>

        <h1 className="text-xl font-bold text-zinc-50">접근 승인 반려</h1>
        <p className="mt-3 text-sm text-zinc-400">
          ERP 이용 권한 요청이 반려되었습니다.
        </p>

        {accountProfile?.rejectedReason && (
          <p className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-200">
            {accountProfile.rejectedReason}
          </p>
        )}

        <Button
          type="button"
          variant="secondary"
          className="mt-8 w-full"
          onClick={() => void logout()}
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </Button>
      </Card>
    </div>
  );
}
