"use client";

import { useEffect, useMemo, useState } from "react";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/Button";
import { SaveButton } from "@/components/ui/SaveButton";
import { Input, Select } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { LeaderManagedContractNotice } from "@/components/contracts/LeaderManagedContractNotice";
import {
  CONTRACT_STAFF_REASSIGN_REASONS,
  type ContractStaffReassignReason,
} from "@/lib/contract-staff-reassign-utils";
import { isLeaderManagedAssignee } from "@/lib/contract-access-utils";
import { contractAssigneeUsers, getTeamName, getUserName } from "@/lib/selectors";
import type { Contract } from "@/lib/types";

type ContractStaffReassignModalProps = {
  contract: Contract;
  open: boolean;
  onClose: () => void;
  onConfirm: (values: {
    assignedStaffId: string;
    teamId: string;
    reason: ContractStaffReassignReason;
    note: string;
  }) => void;
};

export function ContractStaffReassignModal({
  contract,
  open,
  onClose,
  onConfirm,
}: ContractStaffReassignModalProps) {
  const data = useData();
  const { teams } = data;

  const [teamId, setTeamId] = useState(contract.teamId);
  const [assignedStaffId, setAssignedStaffId] = useState(contract.assignedStaffId);
  const [reason, setReason] =
    useState<ContractStaffReassignReason>("workload");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setTeamId(contract.teamId);
    setAssignedStaffId(contract.assignedStaffId);
    setReason("workload");
    setNote("");
  }, [open, contract.teamId, contract.assignedStaffId]);

  const assignees = useMemo(
    () => contractAssigneeUsers(data, teamId || undefined),
    [data, teamId],
  );
  const leaderManagedAssignee = isLeaderManagedAssignee(data, assignedStaffId);
  const unchanged =
    assignedStaffId === contract.assignedStaffId &&
    teamId === contract.teamId;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (unchanged) return;
    onConfirm({ assignedStaffId, teamId, reason, note });
  }

  return (
    <Modal open={open} onClose={onClose} title="담당자 변경" size="md">
      <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
        <p className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-sm text-amber-100/90">
          퇴사·업무 문제 등으로 담당 변경이 필요할 때 사용합니다. 변경 내역은
          계약 이력·메모에 기록됩니다.
        </p>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card-muted)] px-3 py-2 text-sm">
          <p className="text-[var(--muted)]">현재 담당</p>
          <p className="font-medium text-[var(--foreground)]">
            {getTeamName(data, contract.teamId)} ·{" "}
            {getUserName(data, contract.assignedStaffId)}
          </p>
        </div>

        <Select
          label="담당 팀"
          value={teamId}
          onChange={(e) => {
            const nextTeamId = e.target.value;
            const nextAssignees = contractAssigneeUsers(data, nextTeamId);
            setTeamId(nextTeamId);
            setAssignedStaffId(
              nextAssignees.some((u) => u.id === assignedStaffId)
                ? assignedStaffId
                : (nextAssignees[0]?.id ?? assignedStaffId),
            );
          }}
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </Select>

        <Select
          label="새 담당 (실무·팀장)"
          value={assignedStaffId}
          onChange={(e) => setAssignedStaffId(e.target.value)}
          required
        >
          {assignees.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
              {user.role === "team_leader" ? " (팀장 · 직접 담당)" : ""}
            </option>
          ))}
        </Select>

        {leaderManagedAssignee && <LeaderManagedContractNotice />}

        <Select
          label="변경 사유"
          value={reason}
          onChange={(e) =>
            setReason(e.target.value as ContractStaffReassignReason)
          }
        >
          {CONTRACT_STAFF_REASSIGN_REASONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>

        <Input
          label="추가 메모 (선택)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="인수인계 일정 · 특이사항"
        />

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <SaveButton type="submit" dirty={!unchanged} disabled={unchanged}>
            담당자 변경 저장
          </SaveButton>
        </div>
      </form>
    </Modal>
  );
}
