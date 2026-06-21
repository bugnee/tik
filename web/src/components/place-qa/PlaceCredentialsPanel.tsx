"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Link2, Lock, Save, User } from "lucide-react";
import { useData } from "@/context/DataContext";
import { usePlaceQa } from "@/features/place-qa/usePlaceQa";
import { useRole } from "@/context/RoleContext";
import { Button } from "@/components/ui/Button";
import { SaveButton } from "@/components/ui/SaveButton";
import { useSaveMeta } from "@/hooks/useSaveMeta";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/FormFields";
import {
  canManagePlaceCredentials,
  canViewPlacePassword,
  getPlaceCredentialsForContract,
} from "@/lib/place-qa-utils";
import { getUserName } from "@/lib/selectors";
import { valuesEqual } from "@/lib/form-dirty";

export function PlaceCredentialsPanel({ contractId }: { contractId: string }) {
  const data = useData();
  const { upsertPlaceCredentials } = usePlaceQa();
  const { currentUser, activeRole } = useRole();

  const existing = getPlaceCredentialsForContract(data, contractId);
  const canEdit = canManagePlaceCredentials(activeRole);
  const canViewPassword = canViewPlacePassword(activeRole);

  const [placeUrl, setPlaceUrl] = useState(existing?.placeUrl ?? "");
  const [loginId, setLoginId] = useState(existing?.loginId ?? "");
  const [password, setPassword] = useState(existing?.password ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);

  const savedSnapshot = {
    placeUrl: existing?.placeUrl ?? "",
    loginId: existing?.loginId ?? "",
    password: existing?.password ?? "",
  };
  const isDirty = !valuesEqual(
    { placeUrl, loginId, password },
    savedSnapshot,
  );
  const saveMeta = useSaveMeta(
    existing
      ? {
          savedAt: existing.updatedAt,
          savedByUserId: existing.updatedByUserId,
        }
      : null,
  );

  useEffect(() => {
    setPlaceUrl(existing?.placeUrl ?? "");
    setLoginId(existing?.loginId ?? "");
    setPassword(existing?.password ?? "");
  }, [existing?.placeUrl, existing?.loginId, existing?.password]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    upsertPlaceCredentials(contractId, { placeUrl, loginId, password }, currentUser.id);
    saveMeta.recordSave();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  if (!canEdit && !existing) {
    return (
      <Card>
        <CardHeader
          title="플레이스 접속 정보"
          subtitle="고객사에서 아직 등록하지 않았습니다"
        />
        <p className="pb-6 text-center text-sm text-zinc-500">
          플레이스 URL · ID · 비밀번호가 등록되면 이 영역에 표시됩니다.
        </p>
      </Card>
    );
  }

  return (
    <Card glow={canEdit}>
      <CardHeader
        title="플레이스 접속 정보"
        subtitle={
          canEdit
            ? "네이버 플레이스 링크 · 관리자 ID · 비밀번호를 입력해 주세요"
            : "고객사가 등록한 플레이스 계정 (당사 열람용)"
        }
      />
      {canEdit ? (
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="플레이스 링크"
            value={placeUrl}
            onChange={(e) => setPlaceUrl(e.target.value)}
            placeholder="https://place.map.kakao.com/... 또는 네이버 플레이스 URL"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="관리자 ID"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="로그인 아이디"
              required
            />
            <Input
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SaveButton
              type="submit"
              dirty={isDirty}
              savedAt={saveMeta.savedAt}
              savedBy={saveMeta.savedBy}
            >
              <Save className="h-4 w-4" />
              저장
            </SaveButton>
            {saved && (
              <span className="text-sm text-emerald-400">저장되었습니다.</span>
            )}
          </div>
        </form>
      ) : (
        <dl className="space-y-4 text-sm">
          <InfoRow icon={Link2} label="플레이스 링크">
            {existing?.placeUrl ? (
              <a
                href={existing.placeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-emerald-400 hover:underline"
              >
                {existing.placeUrl}
              </a>
            ) : (
              "-"
            )}
          </InfoRow>
          <InfoRow icon={User} label="관리자 ID">
            {existing?.loginId || "-"}
          </InfoRow>
          <InfoRow icon={Lock} label="비밀번호">
            {canViewPassword && existing?.password ? (
              <span className="inline-flex items-center gap-2 font-mono">
                {showPassword ? existing.password : "••••••••"}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="rounded p-1 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </span>
            ) : (
              "••••••••"
            )}
          </InfoRow>
          {existing && (
            <p className="text-xs text-zinc-600">
              등록·수정 {existing.updatedAt} ·{" "}
              {getUserName(data, existing.updatedByUserId)}
            </p>
          )}
        </dl>
      )}
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Link2;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <dt className="flex min-w-[7rem] items-center gap-2 text-zinc-500">
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </dt>
      <dd className="min-w-0 flex-1 font-medium text-zinc-200">{children}</dd>
    </div>
  );
}
