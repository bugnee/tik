import { todayISO } from "@/lib/execution-utils";
import type {
  AppData,
  Contract,
  Execution,
  ExecutionInput,
  ExecutionStatus,
  ExecutionType,
  TaskChannelDefinition,
  WorkOrderTaskType,
} from "@/lib/types";
import {
  getContractDoneCount,
  getContractTargetChannels,
  getContractTargetCount,
  getTaskChannelLabel,
  shouldSyncExecutionForChannel,
  taskChannelToExecutionType,
} from "@/lib/task-channel-utils";
import { spreadDueDate } from "@/lib/work-order-utils";

const LEGACY_CHANNEL_BY_TYPE: Partial<Record<ExecutionType, WorkOrderTaskType>> = {
  optimized: "blog",
  influencer: "influencer",
  experience: "experience",
  press: "press",
};

export function getSyncExecutionChannels(
  contract: Contract,
  channels: TaskChannelDefinition[],
): TaskChannelDefinition[] {
  return getContractTargetChannels(channels).filter(
    (channel) =>
      shouldSyncExecutionForChannel(channels, channel.id) &&
      getContractTargetCount(contract, channel) > 0,
  );
}

function deriveStatus(
  current: ExecutionStatus,
  done: number,
  target: number,
): ExecutionStatus {
  if (target > 0 && done >= target) return "completed";
  if (done > 0) return current === "delayed" ? "delayed" : "in_progress";
  return current === "completed" ? "pending" : current;
}

export function syncExecutionFromContract(
  execution: Execution,
  contract: Contract,
  channels: TaskChannelDefinition[],
): Execution {
  const channelId =
    execution.taskChannelId ?? LEGACY_CHANNEL_BY_TYPE[execution.type];
  const channel = channelId
    ? channels.find((c) => c.id === channelId)
    : undefined;
  if (!channel) return execution;

  const target = getContractTargetCount(contract, channel);
  const done = getContractDoneCount(contract, channel);

  return {
    ...execution,
    taskChannelId: execution.taskChannelId ?? channel.id,
    type: taskChannelToExecutionType(channels, channel.id),
    targetCount: target,
    completedCount: Math.min(done, target || done),
    status: deriveStatus(execution.status, done, target),
    dueDate: execution.dueDate || contract.contractEndDate,
  };
}

export function generateExecutionsForContract(
  contract: Contract,
  existing: Execution[],
  channels: TaskChannelDefinition[],
): ExecutionInput[] {
  if (contract.status !== "active") return [];

  const contractExecutions = existing.filter((e) => e.contractId === contract.id);
  const hasChannel = (channelId: string) =>
    contractExecutions.some(
      (e) =>
        e.taskChannelId === channelId ||
        (!e.taskChannelId &&
          LEGACY_CHANNEL_BY_TYPE[e.type] === channelId),
    );

  const created: ExecutionInput[] = [];
  const syncChannels = getSyncExecutionChannels(contract, channels);

  syncChannels.forEach((channel, index) => {
    if (hasChannel(channel.id)) return;

    const target = getContractTargetCount(contract, channel);
    const done = getContractDoneCount(contract, channel);
    const label = getTaskChannelLabel(channels, channel.id);
    const execType = taskChannelToExecutionType(channels, channel.id);

    created.push({
      contractId: contract.id,
      type: execType,
      taskChannelId: channel.id,
      status: deriveStatus("pending", done, target),
      completedCount: Math.min(done, target),
      targetCount: target,
      dueDate: spreadDueDate(contract, index, syncChannels.length),
      enteredAt: todayISO(),
      postLinks: [],
      memo: `${label} · 계약 목표 ${target}건`,
    });
  });

  return created;
}

export function ensureExecutionsForContract(
  contract: Contract,
  executions: Execution[],
  channels: TaskChannelDefinition[],
  createId: () => string,
): Execution[] {
  let next = executions.map((ex) =>
    ex.contractId === contract.id
      ? syncExecutionFromContract(ex, contract, channels)
      : ex,
  );

  const generated = generateExecutionsForContract(contract, next, channels);
  if (generated.length > 0) {
    next = [
      ...next,
      ...generated.map((input) => ({ ...input, id: createId() })),
    ];
  }

  return next;
}

export function executionSnapshotEqual(a: Execution[], b: Execution[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((ex, i) => {
    const other = b[i];
    return (
      ex.id === other.id &&
      ex.taskChannelId === other.taskChannelId &&
      ex.type === other.type &&
      ex.targetCount === other.targetCount &&
      ex.completedCount === other.completedCount &&
      ex.status === other.status &&
      ex.dueDate === other.dueDate
    );
  });
}

export function ensureAllContractExecutions(
  data: AppData,
  createId: () => string,
): Execution[] {
  let executions = [...data.executions];

  for (const contract of data.contracts) {
    if (contract.status !== "active") continue;
    const next = ensureExecutionsForContract(
      contract,
      executions,
      data.taskChannels,
      createId,
    );
    if (!executionSnapshotEqual(executions, next)) {
      executions = next;
    }
  }

  return executions;
}

export function sortExecutionsByChannel(
  executions: Execution[],
  channels: TaskChannelDefinition[],
): Execution[] {
  const order = new Map(
    channels.map((c, i) => [c.id, c.sortOrder ?? i] as const),
  );
  return [...executions].sort((a, b) => {
    const aKey = a.taskChannelId ?? LEGACY_CHANNEL_BY_TYPE[a.type] ?? a.type;
    const bKey = b.taskChannelId ?? LEGACY_CHANNEL_BY_TYPE[b.type] ?? b.type;
    return (order.get(aKey) ?? 99) - (order.get(bKey) ?? 99);
  });
}

export function findExecutionForWorkOrder(
  executions: Execution[],
  contractId: string,
  taskType: WorkOrderTaskType,
  channels: TaskChannelDefinition[],
): Execution | undefined {
  const execType = taskChannelToExecutionType(channels, taskType);
  return executions.find(
    (e) =>
      e.contractId === contractId &&
      (e.taskChannelId === taskType ||
        (!e.taskChannelId && e.type === execType && taskType !== "insta_card")),
  );
}
