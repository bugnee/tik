"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useData } from "@/context/DataContext";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, EmptyState, Td, Th, Tr } from "@/components/ui/DataTable";
import { PostLinksCell } from "@/components/executions/PostLinksField";
import { ContractDetailIconBtn } from "@/components/contracts/detail/ContractDetailIconBtn";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import type { Execution } from "@/lib/types";
import { EXECUTION_STATUS_LABELS } from "@/lib/types";

export function ContractExecutionsTab({
  executions,
  onEdit,
  onDelete,
}: {
  executions: Execution[];
  onEdit: (e: Execution) => void;
  onDelete: (id: string) => void;
}) {
  const data = useData();

  return (
    <Card>
      <CardHeader
        title={`실행 진행 (${executions.length}건)`}
        subtitle="계약 집행 목표에 따라 자동 생성 · 유형별 색상 구분"
      />
      {executions.length === 0 ? (
        <EmptyState message="계약 목표가 없거나 집행 항목이 비활성 상태입니다" />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>유형</Th>
              <Th>진행</Th>
              <Th>포스팅 링크</Th>
              <Th>상태</Th>
              <Th>마감</Th>
              <Th>메모</Th>
              <Th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {executions.map((e) => (
              <Tr key={e.id}>
                <Td>
                  <TaskChannelBadge
                    data={data}
                    taskType={e.taskChannelId}
                    executionType={e.type}
                  />
                </Td>
                <Td className="font-mono">
                  {e.completedCount}/{e.targetCount}
                </Td>
                <Td>
                  <PostLinksCell links={e.postLinks} fallbackDueDate={e.dueDate} />
                </Td>
                <Td>
                  <Badge
                    variant={
                      e.status === "completed"
                        ? "success"
                        : e.status === "delayed"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {EXECUTION_STATUS_LABELS[e.status]}
                  </Badge>
                </Td>
                <Td>{e.dueDate ?? "-"}</Td>
                <Td className="max-w-[160px] truncate text-zinc-500">
                  {e.memo ?? "-"}
                </Td>
                <Td>
                  <div className="flex gap-1">
                    <ContractDetailIconBtn onClick={() => onEdit(e)} icon={Pencil} />
                    <ContractDetailIconBtn
                      onClick={() => onDelete(e.id)}
                      icon={Trash2}
                      danger
                    />
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </Card>
  );
}
