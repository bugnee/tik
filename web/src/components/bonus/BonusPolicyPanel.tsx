"use client";

import { useState } from "react";
import { Save, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/FormFields";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import {
  getExecutiveLimit,
  getLeaderForStaff,
  getStaffPercent,
  getTeamLeaderLimit,
} from "@/lib/bonus-utils";
import { BonusPayScheduleNotice } from "@/components/bonus/BonusPayScheduleNotice";
import { getUserName } from "@/lib/selectors";

export function BonusPolicyPanel() {
  const data = useData();
  const { activeRole, currentUser } = useRole();
  const { bonusPolicy, teams, users } = data;

  if (activeRole === "ceo") {
    return <CeoPolicyPanel />;
  }
  if (activeRole === "executive") {
    const leaders = teams
      .filter((t) => t.executiveId === currentUser.id && t.leaderId)
      .map((t) => ({
        leaderId: t.leaderId!,
        teamName: t.name,
        execLimit: getExecutiveLimit(bonusPolicy, currentUser.id),
      }));

    return (
      <PolicyCard
        title="성과급 % 설정 (임원 → 팀장)"
        subtitle={`대표 부여 한도 ${getExecutiveLimit(bonusPolicy, currentUser.id)}% 이내에서 팀장별 배분 한도 설정`}
      >
        {leaders.map(({ leaderId, teamName, execLimit }) => (
          <LimitRow
            key={leaderId}
            label={`${teamName} · ${getUserName(data, leaderId)}`}
            max={execLimit}
            value={getTeamLeaderLimit(bonusPolicy, leaderId)}
            onSave={(v) => data.setTeamLeaderBonusLimit(leaderId, v)}
          />
        ))}
      </PolicyCard>
    );
  }
  if (activeRole === "team_leader") {
    const team = teams.find((t) => t.leaderId === currentUser.id);
    const leaderLimit = getTeamLeaderLimit(bonusPolicy, currentUser.id);
    const staff = users.filter(
      (u) => u.role === "staff" && u.teamId === team?.id,
    );

    return (
      <PolicyCard
        title="성과급 % 설정 (팀장 → 담당)"
        subtitle={`임원 부여 한도 ${leaderLimit}% 이내에서 담당별 성과급 설정 · 팀장 직접 담당 고객사는 담당 분 없이 팀장 한도 전액`}
      >
        {staff.map((member) => (
          <LimitRow
            key={member.id}
            label={member.name}
            max={leaderLimit}
            value={getStaffPercent(bonusPolicy, member.id)}
            onSave={(v) => data.setStaffBonusPercent(member.id, v)}
          />
        ))}
      </PolicyCard>
    );
  }

  return null;
}

function CeoPolicyPanel() {
  const data = useData();
  const { bonusPolicy, users } = data;
  const executives = users.filter((u) => u.role === "executive");

  return (
    <PolicyCard
      title="성과급 % 한도 설정 (대표 → 임원)"
      subtitle="임직원별 성과금 상한(%) — 임원은 이 한도 내에서 팀장에게 배분"
    >
      {executives.map((exec) => (
        <LimitRow
          key={exec.id}
          label={exec.name}
          max={15}
          value={getExecutiveLimit(bonusPolicy, exec.id)}
          onSave={(v) => data.setExecutiveBonusLimit(exec.id, v)}
        />
      ))}
    </PolicyCard>
  );
}

function PolicyCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <Badge variant="info">
            <Settings2 className="mr-1 inline h-3 w-3" />
            한도 설정
          </Badge>
        }
      />
      <div className="space-y-3">{children}</div>
      <div className="mt-4 border-t border-zinc-800 pt-3">
        <BonusPayScheduleNotice compact />
      </div>
    </Card>
  );
}

function LimitRow({
  label,
  max,
  value,
  onSave,
}: {
  label: string;
  max: number;
  value: number;
  onSave: (percent: number) => boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string | null>(null);

  function save() {
    const num = Number(draft);
    if (Number.isNaN(num) || num < 0) {
      setError("0 이상 입력");
      return;
    }
    if (num > max) {
      setError(`상한 ${max}% 초과`);
      return;
    }
    const ok = onSave(num);
    if (!ok) {
      setError("저장 실패 — 상위 한도 확인");
      return;
    }
    setError(null);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="min-w-[140px] flex-1">
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        <p className="text-xs text-zinc-500">상한 {max}%</p>
      </div>
      <div className="flex items-end gap-2">
        <Input
          label="성과급 %"
          type="number"
          min={0}
          max={max}
          step={0.5}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-24"
        />
        <Button size="sm" onClick={save}>
          <Save className="h-3.5 w-3.5" />
          저장
        </Button>
      </div>
      {error && <p className="w-full text-xs text-rose-400">{error}</p>}
    </div>
  );
}

export function StaffBonusLimitInfo() {
  const data = useData();
  const { currentUser } = useRole();
  const pct = getStaffPercent(data.bonusPolicy, currentUser.id);
  const leaderId = getLeaderForStaff(data, currentUser.id);
  const leaderLimit = leaderId
    ? getTeamLeaderLimit(data.bonusPolicy, leaderId)
    : 0;

  return (
    <p className="text-xs text-zinc-500">
      팀장 설정 성과급 {pct}% (팀장 한도 {leaderLimit}%)
    </p>
  );
}

export function TeamLeaderSelfBonusLimitInfo() {
  const data = useData();
  const { currentUser } = useRole();
  const limit = getTeamLeaderLimit(data.bonusPolicy, currentUser.id);

  return (
    <p className="text-xs text-zinc-500">
      팀장 직접 담당 · 한도 {limit}% 전액 지급
    </p>
  );
}
