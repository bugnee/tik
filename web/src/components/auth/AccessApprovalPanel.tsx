"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, UserPlus, X } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Checkbox, Input, Select } from "@/components/ui/FormFields";
import { getTeamName } from "@/lib/selectors";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

const ASSIGNABLE_ROLES: UserRole[] = [
  "staff",
  "team_leader",
  "executive",
  "finance_manager",
  "partner",
  "client",
];

export function AccessApprovalPanel() {
  const data = useData();
  const { accountProfiles, teams, partners, contracts, approveAccountProfile, rejectAccountProfile } =
    data;
  const { currentUser, canApproveAccounts } = useRole();

  const pending = useMemo(
    () => accountProfiles.filter((p) => p.status === "pending"),
    [accountProfiles],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>("staff");
  const [teamId, setTeamId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [contractId, setContractId] = useState("");
  const [isFinancialViewer, setIsFinancialViewer] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const selected = pending.find((p) => p.id === selectedId) ?? pending[0];

  useEffect(() => {
    if (!selected) return;
    setRole("staff");
    setTeamId(teams[0]?.id ?? "");
    setPartnerId(partners[0]?.id ?? "");
    setContractId(contracts[0]?.id ?? "");
    setIsFinancialViewer(false);
  }, [selected?.id, teams, partners, contracts, selected]);

  if (!canApproveAccounts) return null;

  function selectProfile(id: string) {
    setSelectedId(id);
    setRole("staff");
    setTeamId(teams[0]?.id ?? "");
    setPartnerId(partners[0]?.id ?? "");
    setContractId(contracts[0]?.id ?? "");
    setIsFinancialViewer(false);
    setRejectReason("");
  }

  function handleApprove() {
    if (!selected) return;
    const ok = approveAccountProfile(
      selected.id,
      {
        role,
        teamId:
          role === "staff" || role === "team_leader"
            ? teamId || teams[0]?.id
            : undefined,
        partnerId:
          role === "partner" ? partnerId || partners[0]?.id : undefined,
        contractId:
          role === "client" ? contractId || contracts[0]?.id : undefined,
        isFinancialViewer,
      },
      currentUser.id,
    );
    if (ok) {
      setSelectedId(null);
      setRejectReason("");
    }
  }

  function handleReject() {
    if (!selected) return;
    rejectAccountProfile(
      selected.id,
      rejectReason || "권한 승인 반려",
      currentUser.id,
    );
    setSelectedId(null);
    setRejectReason("");
  }

  return (
    <Card className="mb-6 border-amber-500/20 bg-amber-500/5">
      <CardHeader
        title="접근 권한 승인"
        subtitle="Google 로그인 후 대기 중인 계정에 역할·팀을 부여합니다. (대표·임원 전용)"
      />

      {pending.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-zinc-500">
          승인 대기 중인 계정이 없습니다.
        </p>
      ) : (
        <div className="grid gap-4 px-6 pb-6 lg:grid-cols-2">
          <div className="space-y-2">
            {pending.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => selectProfile(profile.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                  (selected?.id ?? pending[0]?.id) === profile.id
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    {profile.name}
                  </p>
                  <p className="text-xs text-zinc-500">{profile.email}</p>
                </div>
                <Badge variant="warning">대기</Badge>
              </button>
            ))}
          </div>

          {selected && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-emerald-400" />
                <p className="text-sm font-semibold text-zinc-200">
                  {selected.name} 권한 부여
                </p>
              </div>

              <div className="space-y-3">
                <Select
                  label="역할"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>

                {(role === "staff" || role === "team_leader") && (
                  <Select
                    label="소속 팀"
                    value={teamId || teams[0]?.id || ""}
                    onChange={(e) => setTeamId(e.target.value)}
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {getTeamName(data, t.id)}
                      </option>
                    ))}
                  </Select>
                )}

                {role === "partner" && (
                  <Select
                    label="연결 파트너사"
                    value={partnerId || partners[0]?.id || ""}
                    onChange={(e) => setPartnerId(e.target.value)}
                  >
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.companyName}
                      </option>
                    ))}
                  </Select>
                )}

                {role === "client" && (
                  <Select
                    label="연결 계약(고객사)"
                    value={contractId || contracts[0]?.id || ""}
                    onChange={(e) => setContractId(e.target.value)}
                  >
                    {contracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.clientName}
                      </option>
                    ))}
                  </Select>
                )}

                {role !== "client" && (
                  <Checkbox
                    label="재무 열람 권한"
                    checked={isFinancialViewer}
                    onChange={setIsFinancialViewer}
                  />
                )}

                <Input
                  label="반려 사유 (선택)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="반려 시에만 사용"
                />

                <div className="flex gap-2 pt-2">
                  <Button type="button" className="flex-1" onClick={handleApprove}>
                    <Check className="h-4 w-4" />
                    승인
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="flex-1"
                    onClick={handleReject}
                  >
                    <X className="h-4 w-4" />
                    반려
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
