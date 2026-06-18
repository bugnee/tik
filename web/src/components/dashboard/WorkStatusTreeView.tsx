"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  User,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { TaskChannelBadge } from "@/components/ui/TaskChannelBadge";
import {
  getWorkStatusContractHref,
  WORK_STATUS_CATEGORY_LABELS,
  type WorkStatusCategory,
  type WorkStatusPanelMode,
  type WorkStatusTreeNode,
} from "@/lib/dashboard-work-status-utils";
import { getWorkOrderTaskLabel } from "@/lib/task-channel-utils";
import { WORK_ORDER_STAGE_LABELS } from "@/lib/work-order-utils";
import type { AppData, UserRole } from "@/lib/types";
import { cn } from "@/lib/cn";

export function WorkStatusTreeView({
  nodes,
  data,
  role,
  category,
  mode,
  onNavigate,
}: {
  nodes: WorkStatusTreeNode[];
  data: AppData;
  role: UserRole;
  category: WorkStatusCategory;
  mode: WorkStatusPanelMode;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const defaultExpanded = useMemo(
    () => collectGroupIds(nodes),
    [nodes],
  );
  const [expanded, setExpanded] = useState<Set<string>>(defaultExpanded);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function goToContract(contractId: string) {
    onNavigate?.();
    router.push(getWorkStatusContractHref(role, contractId));
  }

  if (nodes.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-zinc-500">
        해당하는 처리 내역이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
        <FolderTree className="h-3.5 w-3.5" />
        {mode === "executive"
          ? "팀장 → 담당 → 업무 순 트리"
          : mode === "team_leader"
            ? "담당 → 업무 순 트리"
            : "업무 목록"}
        · {WORK_STATUS_CATEGORY_LABELS[category]}
      </p>
      <div className="space-y-1">
        {nodes.map((node) => (
          <TreeNode
            key={node.type === "group" ? node.id : node.item.id}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={toggle}
            onNavigate={goToContract}
            data={data}
            category={category}
          />
        ))}
      </div>
    </div>
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  onNavigate,
  data,
  category,
}: {
  node: WorkStatusTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onNavigate: (contractId: string) => void;
  data: AppData;
  category: WorkStatusCategory;
}) {
  if (node.type === "item") {
    const item = node.item;
    return (
      <button
        type="button"
        onClick={() => onNavigate(item.contractId)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/30 px-3 py-2.5 text-left transition-colors hover:border-emerald-500/30 hover:bg-zinc-900",
        )}
        style={{ marginLeft: depth * 16 }}
      >
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-zinc-100">
              {item.clientName}
            </span>
            <TaskChannelBadge data={data} taskType={item.taskType} />
            <Badge
              variant={
                category === "completed" || item.stage === "order_ready" || item.stage === "paid"
                  ? "success"
                  : "default"
              }
              className="text-[10px]"
            >
              {WORK_ORDER_STAGE_LABELS[item.stage]}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">{item.title}</p>
          <p className="mt-0.5 text-[11px] text-zinc-600">
            {getWorkOrderTaskLabel(data, item.taskType)}
            {category === "completed" ? (
              <>
                {" "}
                · 완료{" "}
                <span className="text-emerald-400">{item.completedDate}</span>
                <span className="text-zinc-600"> · 마감 {item.dueDate}</span>
              </>
            ) : (
              <>
                {" "}
                · 마감 {item.dueDate}
                {category === "overdue" && item.daysFromDue > 0 && (
                  <span className="text-rose-400">
                    {" "}
                    · {item.daysFromDue}일 초과
                  </span>
                )}
              </>
            )}
          </p>
        </div>
      </button>
    );
  }

  const isOpen = expanded.has(node.id);
  const Icon = depth === 0 && node.sublabel?.includes("팀") ? Users : User;

  return (
    <div style={{ marginLeft: depth * 12 }}>
      <button
        type="button"
        onClick={() => onToggle(node.id)}
        className="flex w-full items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-left hover:bg-zinc-900"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
        )}
        <Icon className="h-4 w-4 shrink-0 text-cyan-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-100">{node.label}</p>
          {node.sublabel && (
            <p className="text-[11px] text-zinc-500">{node.sublabel}</p>
          )}
        </div>
        <Badge variant="info">{node.count}건</Badge>
      </button>
      {isOpen && (
        <div className="mt-1 space-y-1 border-l border-zinc-800/80 pl-2">
          {node.children.map((child) => (
            <TreeNode
              key={child.type === "group" ? child.id : child.item.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onNavigate={onNavigate}
              data={data}
              category={category}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function collectGroupIds(nodes: WorkStatusTreeNode[]): Set<string> {
  const ids = new Set<string>();
  for (const node of nodes) {
    if (node.type === "group") {
      ids.add(node.id);
      for (const id of collectGroupIds(node.children)) {
        ids.add(id);
      }
    }
  }
  return ids;
}
