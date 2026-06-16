"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, Users, Building2 } from "lucide-react";
import { useData } from "@/context/DataContext";
import { AccessApprovalPanel } from "@/components/auth/AccessApprovalPanel";
import { Badge } from "@/components/ui/Badge";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  DataTable,
  PageHeader,
  Td,
  Th,
  Tr,
} from "@/components/ui/DataTable";
import { Checkbox, Input, Select } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { getClientPortalAccounts, getTeamName, getUserName } from "@/lib/selectors";
import type { Team, TeamInput, User, UserInput, UserRole } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";

const emptyUser = (): UserInput => ({
  name: "",
  role: "staff",
  isFinancialViewer: false,
  teamId: "",
});

const emptyTeam = (): TeamInput => ({
  name: "",
  leaderId: "",
  executiveId: "",
});

export function UsersManager() {
  const data = useData();
  const {
    users,
    teams,
    contracts,
    addUser,
    updateUser,
    deleteUser,
    addTeam,
    updateTeam,
    deleteTeam,
    resetData,
  } = data;

  const [userModal, setUserModal] = useState(false);
  const [teamModal, setTeamModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [userForm, setUserForm] = useState<UserInput>(emptyUser());
  const [teamForm, setTeamForm] = useState<TeamInput>(emptyTeam());

  function openUserCreate() {
    setEditingUser(null);
    setUserForm({ ...emptyUser(), teamId: teams[0]?.id ?? "" });
    setUserModal(true);
  }

  function openClientAccountCreate() {
    setEditingUser(null);
    setUserForm({
      name: contracts[0]?.clientName ?? "",
      role: "client",
      isFinancialViewer: false,
      contractId: contracts[0]?.id,
      email: "",
    });
    setUserModal(true);
  }

  function openUserEdit(u: User) {
    setEditingUser(u);
    setUserForm({ ...u });
    setUserModal(true);
  }

  function submitUser(e: React.FormEvent) {
    e.preventDefault();
    if (!userForm.name) return;
    if (userForm.role === "client") {
      if (!userForm.email?.trim()) {
        alert("고객사 포털 로그인용 이메일을 입력해 주세요.");
        return;
      }
      if (!userForm.contractId) {
        alert("연결할 계약(고객사)을 선택해 주세요.");
        return;
      }
    }
    if (editingUser) updateUser(editingUser.id, userForm);
    else addUser(userForm);
    setUserModal(false);
  }

  const clientPortalAccounts = getClientPortalAccounts(data);
  const clientUsers = users.filter((u) => u.role === "client");

  function openTeamCreate() {
    setEditingTeam(null);
    setTeamForm(emptyTeam());
    setTeamModal(true);
  }

  function openTeamEdit(t: Team) {
    setEditingTeam(t);
    setTeamForm({ ...t });
    setTeamModal(true);
  }

  function submitTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamForm.name) return;
    if (editingTeam) updateTeam(editingTeam.id, teamForm);
    else addTeam(teamForm);
    setTeamModal(false);
  }

  const leaders = users.filter((u) => u.role === "team_leader");
  const executives = users.filter((u) => u.role === "executive");

  return (
    <>
      <PageHeader
        title="조직 · 인력"
        description={`${teams.length}개 팀 · ${users.length}명 · 역할 및 재무 열람 권한 관리`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => {
              if (confirm("모든 데이터를 초기 시드로 되돌립니다. 계속하시겠습니까?")) {
                resetData();
              }
            }}>
              데이터 초기화
            </Button>
            <Button variant="secondary" onClick={openTeamCreate}>
              <Plus className="h-4 w-4" />
              팀 추가
            </Button>
            <Button variant="secondary" onClick={openClientAccountCreate}>
              <Building2 className="h-4 w-4" />
              고객사 계정
            </Button>
            <Button onClick={openUserCreate}>
              <Plus className="h-4 w-4" />
              인력 추가
            </Button>
          </div>
        }
      />

      <AccessApprovalPanel />

      <Card className="mb-6 border-rose-500/20 bg-rose-500/5">
        <CardHeader
          title="고객사 포털 계정"
          subtitle={`${clientPortalAccounts.length}개 · 이메일 로그인 · 계약별 진행 보고서 열람`}
          action={
            <Button size="sm" onClick={openClientAccountCreate}>
              <Plus className="h-4 w-4" />
              계정 추가
            </Button>
          }
        />
        {clientPortalAccounts.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-zinc-500">
            등록된 고객사 계정이 없습니다. 계약 업체에 로그인 이메일을 연결해 주세요.
          </p>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>고객사</Th>
                <Th>표시 이름</Th>
                <Th>로그인 이메일</Th>
                <Th className="w-20">관리</Th>
              </tr>
            </thead>
            <tbody>
              {clientPortalAccounts.map(({ profile, contractName }) => {
                const linkedUser = users.find((u) => u.id === profile.linkedUserId);
                return (
                  <Tr key={profile.id}>
                    <Td className="font-medium text-zinc-100">{contractName}</Td>
                    <Td>{profile.name}</Td>
                    <Td className="font-mono text-xs text-cyan-400/90">
                      {profile.email}
                    </Td>
                    <Td>
                      {linkedUser && (
                        <button
                          type="button"
                          onClick={() => openUserEdit(linkedUser)}
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="팀 목록" subtitle="마케팅 팀 구성" />
          <DataTable>
            <thead>
              <tr>
                <Th>팀명</Th>
                <Th>팀장</Th>
                <Th className="w-20">관리</Th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <Tr key={t.id}>
                  <Td className="font-medium text-zinc-100">{t.name}</Td>
                  <Td>
                    {t.leaderId ? getUserName(data, t.leaderId) : "-"}
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openTeamEdit(t)}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("팀을 삭제하시겠습니까?")) deleteTeam(t.id);
                        }}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        </Card>

        <Card>
          <CardHeader
            title="인력 목록"
            subtitle={`${users.length - clientUsers.length}명 · staff · team_leader · executive · ceo`}
            action={<Users className="h-4 w-4 text-zinc-600" />}
          />
          <DataTable>
            <thead>
              <tr>
                <Th>이름</Th>
                <Th>역할</Th>
                <Th>팀 / 계약</Th>
                <Th>재무</Th>
                <Th className="w-20">관리</Th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter((u) => u.role !== "client")
                .map((u) => (
                <Tr key={u.id}>
                  <Td className="font-medium text-zinc-100">{u.name}</Td>
                  <Td>
                    <RoleBadge role={u.role} />
                  </Td>
                  <Td>{u.teamId ? getTeamName(data, u.teamId) : "-"}</Td>
                  <Td>
                    {u.isFinancialViewer ? (
                      <Badge variant="success">Y</Badge>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openUserEdit(u)}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-emerald-400"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("인력을 삭제하시겠습니까?")) deleteUser(u.id);
                        }}
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        </Card>
      </div>

      <Modal
        open={userModal}
        onClose={() => setUserModal(false)}
        title={
          userForm.role === "client"
            ? editingUser
              ? "고객사 계정 수정"
              : "고객사 포털 계정 추가"
            : editingUser
              ? "인력 수정"
              : "인력 추가"
        }
      >
        <form onSubmit={submitUser} className="space-y-4">
          <Input
            label="이름 *"
            value={userForm.name}
            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
            required
          />
          {userForm.role === "client" && (
            <Input
              label="로그인 이메일 *"
              type="email"
              value={userForm.email ?? ""}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              placeholder="contact@client.co.kr"
              required
            />
          )}
          {userForm.role !== "client" && (
            <Select
              label="역할 *"
              value={userForm.role}
              onChange={(e) =>
                setUserForm({
                  ...userForm,
                  role: e.target.value as UserRole,
                  teamId: e.target.value === "client" ? "" : userForm.teamId,
                  contractId:
                    e.target.value === "client"
                      ? contracts[0]?.id
                      : undefined,
                })
              }
            >
              {(Object.keys(ROLE_LABELS) as UserRole[])
                .filter((r) => r !== "client")
                .map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
            </Select>
          )}
          {(userForm.role === "staff" || userForm.role === "team_leader") && (
            <Select
              label="소속 팀"
              value={userForm.teamId ?? ""}
              onChange={(e) => setUserForm({ ...userForm, teamId: e.target.value })}
            >
              <option value="">없음</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          )}
          {userForm.role === "client" && (
            <Select
              label="연결 계약(고객사) *"
              value={userForm.contractId ?? contracts[0]?.id ?? ""}
              onChange={(e) => {
                const contract = contracts.find((c) => c.id === e.target.value);
                setUserForm({
                  ...userForm,
                  contractId: e.target.value,
                  name: contract?.clientName ?? userForm.name,
                });
              }}
            >
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientName}
                </option>
              ))}
            </Select>
          )}
          {userForm.role === "client" && (
            <p className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-zinc-400">
              저장 후 로그인 화면에서 해당 이메일 계정으로 접속하면 고객사 포털(계약·진행·링크
              보고서)을 볼 수 있습니다.
            </p>
          )}
          {userForm.role !== "client" && (
            <Checkbox
              label="재무 열람 권한 (is_financial_viewer)"
              checked={userForm.isFinancialViewer}
              onChange={(v) => setUserForm({ ...userForm, isFinancialViewer: v })}
            />
          )}
          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <Button type="button" variant="secondary" onClick={() => setUserModal(false)}>
              취소
            </Button>
            <Button type="submit">{editingUser ? "저장" : "추가"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={teamModal}
        onClose={() => setTeamModal(false)}
        title={editingTeam ? "팀 수정" : "팀 추가"}
      >
        <form onSubmit={submitTeam} className="space-y-4">
          <Input
            label="팀명 *"
            value={teamForm.name}
            onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
            required
          />
          <Select
            label="팀장"
            value={teamForm.leaderId ?? ""}
            onChange={(e) => setTeamForm({ ...teamForm, leaderId: e.target.value })}
          >
            <option value="">미지정</option>
            {leaders.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          <Select
            label="담당 임원"
            value={teamForm.executiveId ?? ""}
            onChange={(e) =>
              setTeamForm({ ...teamForm, executiveId: e.target.value })
            }
          >
            <option value="">미지정</option>
            {executives.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <Button type="button" variant="secondary" onClick={() => setTeamModal(false)}>
              취소
            </Button>
            <Button type="submit">{editingTeam ? "저장" : "추가"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
