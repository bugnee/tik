import {
  dedupeAllExecutions,
  ensureAllContractExecutions,
} from "@/lib/execution-generation-utils";
import { syncAllContractProgress } from "@/lib/selectors";
import { dedupeWorkOrders } from "@/lib/work-order-utils";
import type { AppData } from "@/lib/types";

/** 계약·실행·워크오더·채널 변경 시 진행률·execution 동기화 필요 */
export function needsHeavyContractSync(prev: AppData, next: AppData): boolean {
  return (
    prev.contracts !== next.contracts ||
    prev.workOrders !== next.workOrders ||
    prev.executions !== next.executions ||
    prev.taskChannels !== next.taskChannels
  );
}

export type AppDataSyncPipeline = {
  normalize: (data: AppData) => AppData;
  newExecutionId: () => string;
};

/**
 * 상태 변경 후 관계형 동기화 — persist 레이어에서 단일 진입점
 */
export function commitAppData(
  prev: AppData,
  next: AppData,
  pipeline: AppDataSyncPipeline,
): AppData {
  if (needsHeavyContractSync(prev, next)) {
    return applyFullContractSync(next, pipeline);
  }
  if (prev.workOrders !== next.workOrders) {
    return { ...next, contracts: syncAllContractProgress(next) };
  }
  return next;
}

export function applyFullContractSync(
  data: AppData,
  pipeline: AppDataSyncPipeline,
): AppData {
  const normalized = pipeline.normalize(data);
  const dedupedOrders = dedupeWorkOrders(normalized.workOrders);
  const base = { ...normalized, workOrders: dedupedOrders };
  const dedupedExecutions = dedupeAllExecutions(base, base.taskChannels);
  const withProgress = {
    ...base,
    executions: dedupedExecutions,
    contracts: syncAllContractProgress({
      ...base,
      executions: dedupedExecutions,
    }),
  };
  return pipeline.normalize({
    ...withProgress,
    executions: ensureAllContractExecutions(
      withProgress,
      pipeline.newExecutionId,
    ),
  });
}
