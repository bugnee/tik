"use client";

import { Modal } from "@/components/ui/Modal";
import { formatPercent } from "@/lib/finance";
import type { TeamMemberStats } from "@/lib/types";

type TeamMemberListModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  members: TeamMemberStats[];
};

export function TeamMemberListModal({
  open,
  onClose,
  title,
  description,
  members,
}: TeamMemberListModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {description && (
        <p className="mb-4 text-sm text-zinc-500">{description}</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th className="pb-3 pr-4 font-medium">이름</th>
              <th className="pb-3 pr-4 font-medium">담당 업체</th>
              <th className="pb-3 pr-4 font-medium">달성률</th>
              <th className="pb-3 font-medium">연장 전환율</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr
                key={m.id}
                className="border-b border-zinc-800/50 text-zinc-300"
              >
                <td className="py-3 pr-4 font-medium text-zinc-200">
                  {m.name}
                </td>
                <td className="py-3 pr-4">{m.clientCount}개</td>
                <td className="py-3 pr-4">
                  <span
                    className={
                      m.completionRate >= 85
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }
                  >
                    {formatPercent(m.completionRate)}
                  </span>
                </td>
                <td className="py-3">{formatPercent(m.extensionRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && (
          <p className="py-12 text-center text-sm text-zinc-500">
            등록된 팀원이 없습니다
          </p>
        )}
      </div>
    </Modal>
  );
}
