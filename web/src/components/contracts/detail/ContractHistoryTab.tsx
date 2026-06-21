"use client";

import { MessageSquare, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/DataTable";
import { SaveButton } from "@/components/ui/SaveButton";
import { useSaveMeta } from "@/hooks/useSaveMeta";
import { Textarea } from "@/components/ui/FormFields";
import { formatKRW } from "@/lib/finance";
import { getTeamName, getUserName } from "@/lib/selectors";
import type { AppData, Contract, ContractMemo, ContractRecord, UserRole } from "@/lib/types";
import { TERMINATION_REASON_LABELS } from "@/lib/types";

export function ContractHistoryTab({
  data,
  contract,
  contractRecords,
  contractMemos,
  canWriteMemo,
  memoToday,
  memoDraft,
  onMemoDraftChange,
  memoDirty,
  onAddMemo,
  onDeleteMemo,
  currentUserId,
  activeRole,
}: {
  data: AppData;
  contract: Contract;
  contractRecords: ContractRecord[];
  contractMemos: ContractMemo[];
  canWriteMemo: boolean;
  memoToday: string;
  memoDraft: string;
  onMemoDraftChange: (value: string) => void;
  memoDirty: boolean;
  onAddMemo: (ev: React.FormEvent) => void;
  onDeleteMemo: (memoId: string) => void;
  currentUserId: string;
  activeRole: UserRole;
}) {
  const saveMeta = useSaveMeta();

  function handleAddMemo(ev: React.FormEvent) {
    ev.preventDefault();
    if (!memoDraft.trim()) return;
    onAddMemo(ev);
    saveMeta.recordSave();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader
          title="계약 기록"
          subtitle="회차별 당시 담당자 · 해지 사유"
        />
        {contractRecords.length === 0 ? (
          <EmptyState message="계약 기록이 없습니다" />
        ) : (
          <div className="space-y-3">
            {contractRecords.map((record) => (
              <div
                key={record.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-200">
                      {record.period} 회차
                      {record.isExtension && (
                        <Badge variant="success" className="ml-2">
                          연장
                        </Badge>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      당시 담당 ·{" "}
                      <span className="text-zinc-200">
                        {getUserName(data, record.assignedStaffId)}
                      </span>
                      {" · "}
                      {getTeamName(data, record.teamId)}
                    </p>
                  </div>
                  <p className="font-mono text-sm text-emerald-400">
                    {formatKRW(record.monthlyFee)}
                  </p>
                </div>
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                  <div>
                    <dt className="text-zinc-600">시작일</dt>
                    <dd className="text-zinc-300">{record.startedAt}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">종료일</dt>
                    <dd className="text-zinc-300">
                      {record.endedAt ?? "진행 중"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">해지 사유</dt>
                    <dd className="text-zinc-300">
                      {record.terminationReason
                        ? TERMINATION_REASON_LABELS[record.terminationReason]
                        : "-"}
                    </dd>
                  </div>
                </dl>
                {record.note && (
                  <p className="mt-2 text-xs text-zinc-500">{record.note}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="메모"
          subtitle="업무 메모 · 날짜·담당자 자동 기록"
        />
        {canWriteMemo && (
          <form onSubmit={handleAddMemo} className="mb-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                <p className="text-[11px] text-zinc-600">날짜</p>
                <p className="text-sm text-zinc-200">{memoToday}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                <p className="text-[11px] text-zinc-600">담당</p>
                <p className="text-sm text-zinc-200">
                  {getUserName(data, contract.assignedStaffId)}
                </p>
              </div>
            </div>
            <Textarea
              label="메모 내용"
              value={memoDraft}
              onChange={(e) => onMemoDraftChange(e.target.value)}
              rows={3}
              placeholder="고객사 미팅, 연장 협의, 특이사항 등"
            />
            <div className="flex justify-end">
              <SaveButton
                type="submit"
                size="sm"
                dirty={memoDirty}
                disabled={!memoDraft.trim()}
                savedAt={saveMeta.savedAt}
                savedBy={saveMeta.savedBy}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                메모 저장
              </SaveButton>
            </div>
          </form>
        )}

        {contractMemos.length === 0 ? (
          <EmptyState message="등록된 메모가 없습니다" />
        ) : (
          <div className="space-y-3">
            {contractMemos.map((memo) => {
              const canDelete =
                canWriteMemo &&
                (memo.authorUserId === currentUserId ||
                  activeRole === "team_leader" ||
                  activeRole === "executive" ||
                  activeRole === "ceo");

              return (
                <div
                  key={memo.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <dl className="grid gap-1 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-zinc-600">날짜</dt>
                        <dd className="text-zinc-300">{memo.createdAt}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-600">담당</dt>
                        <dd className="text-zinc-300">
                          {getUserName(data, memo.assignedStaffId)}
                        </dd>
                      </div>
                    </dl>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => onDeleteMemo(memo.id)}
                        className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-rose-400"
                        title="메모 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">
                    {memo.body}
                  </p>
                  {memo.authorUserId !== memo.assignedStaffId && (
                    <p className="mt-2 text-[11px] text-zinc-600">
                      작성 · {getUserName(data, memo.authorUserId)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
