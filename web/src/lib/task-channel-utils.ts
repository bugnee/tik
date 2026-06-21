import type {
  AppData,
  Contract,
  ExecutionType,
  ExpenseCategory,
  PartnerCategory,
  TaskChannelAccent,
  TaskChannelDefinition,
  TaskChannelInput,
  WorkOrderTaskType,
} from "@/lib/types";
import { EXECUTION_TYPE_LABELS } from "@/lib/types";

export const TASK_CHANNEL_BADGE_CLASSES: Record<TaskChannelAccent, string> = {
  cyan: "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30",
  emerald: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
  violet: "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30",
  fuchsia: "bg-fuchsia-500/15 text-fuchsia-400 ring-1 ring-fuchsia-500/30",
  amber: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
  orange: "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30",
  rose: "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30",
  sky: "bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30",
  lime: "bg-lime-500/15 text-lime-400 ring-1 ring-lime-500/30",
};

/** KPI 스트립 — 채널별 카드 테두리·배경 */
export const TASK_CHANNEL_KPI_CHIP_CLASSES: Record<TaskChannelAccent, string> = {
  cyan: "border-cyan-500/35 bg-cyan-500/10",
  emerald: "border-emerald-500/35 bg-emerald-500/10",
  violet: "border-violet-500/35 bg-violet-500/10",
  fuchsia: "border-fuchsia-500/35 bg-fuchsia-500/10",
  amber: "border-amber-500/35 bg-amber-500/10",
  orange: "border-orange-500/35 bg-orange-500/10",
  rose: "border-rose-500/35 bg-rose-500/10",
  sky: "border-sky-500/35 bg-sky-500/10",
  lime: "border-lime-500/35 bg-lime-500/10",
};

/** KPI 스트립 — 채널별 달성 수치 색 */
export const TASK_CHANNEL_KPI_VALUE_CLASSES: Record<TaskChannelAccent, string> =
  {
    cyan: "text-cyan-400",
    emerald: "text-emerald-400",
    violet: "text-violet-400",
    fuchsia: "text-fuchsia-400",
    amber: "text-amber-400",
    orange: "text-orange-400",
    rose: "text-rose-400",
    sky: "text-sky-400",
    lime: "text-lime-400",
  };

export const TASK_CHANNEL_ACCENT_LABELS: Record<TaskChannelAccent, string> = {
  cyan: "시안",
  emerald: "에메랄드",
  violet: "보라",
  fuchsia: "푸시아",
  amber: "앰버",
  orange: "오렌지",
  rose: "로즈",
  sky: "스카이",
  lime: "라임",
};

export const TASK_CHANNEL_ACCENT_OPTIONS: TaskChannelAccent[] = [
  "cyan",
  "emerald",
  "violet",
  "fuchsia",
  "amber",
  "orange",
  "rose",
  "sky",
  "lime",
];

const DEFAULT_CHANNEL_ACCENTS: Record<string, TaskChannelAccent> = {
  blog: "cyan",
  influencer: "violet",
  experience: "amber",
  insta_card: "fuchsia",
  youtube: "rose",
  instagram: "orange",
  clip: "lime",
  tiktok: "emerald",
  press: "sky",
  referral: "sky",
};

/** SNS·숏폼 집행 채널 — 인플루언서 유형으로 매핑 (파트너 분야는 채널별 ID) */
const SOCIAL_INFLUENCER_CHANNEL_IDS = new Set([
  "influencer",
  "insta_card",
  "instagram",
  "youtube",
  "clip",
  "tiktok",
]);

const DEFAULT_EXECUTION_ACCENTS: Record<ExecutionType, TaskChannelAccent> = {
  optimized: "cyan",
  influencer: "violet",
  experience: "amber",
  press: "sky",
};

export const DEFAULT_TASK_CHANNELS: TaskChannelDefinition[] = [
  {
    id: "blog",
    label: "최적블로그",
    sortOrder: 1,
    isActive: true,
    kind: "contract_target",
    accentColor: "cyan",
    contractTargetField: "targetOptimized",
    contractDoneField: "optimizedDone",
    executionType: "optimized",
    partnerCategory: "blog",
    expenseCategory: "other",
    syncExecution: true,
  },
  {
    id: "influencer",
    label: "인플루언서",
    sortOrder: 2,
    isActive: true,
    kind: "contract_target",
    accentColor: "violet",
    contractTargetField: "targetInfluencer",
    contractDoneField: "influencerDone",
    executionType: "influencer",
    partnerCategory: "influencer",
    expenseCategory: "influencer",
    syncExecution: true,
  },
  {
    id: "experience",
    label: "체험단",
    sortOrder: 3,
    isActive: true,
    kind: "contract_target",
    accentColor: "amber",
    contractTargetField: "targetExperience",
    executionType: "experience",
    partnerCategory: "experience",
    expenseCategory: "experience",
    syncExecution: true,
  },
  {
    id: "insta_card",
    label: "인스타카드",
    sortOrder: 4,
    isActive: true,
    kind: "contract_target",
    accentColor: "fuchsia",
    contractTargetField: "targetInstaCard",
    executionType: "influencer",
    partnerCategory: "influencer",
    expenseCategory: "influencer",
    syncExecution: true,
  },
  {
    id: "youtube",
    label: "유튜브",
    sortOrder: 5,
    isActive: true,
    kind: "contract_target",
    accentColor: "rose",
    contractTargetField: "targetYoutube",
    contractDoneField: "youtubeDone",
    executionType: "influencer",
    partnerCategory: "youtube",
    expenseCategory: "youtube",
    syncExecution: true,
  },
  {
    id: "instagram",
    label: "인스타",
    sortOrder: 6,
    isActive: true,
    kind: "contract_target",
    accentColor: "orange",
    contractTargetField: "targetInstagram",
    contractDoneField: "instagramDone",
    executionType: "influencer",
    partnerCategory: "instagram",
    expenseCategory: "instagram",
    syncExecution: true,
  },
  {
    id: "clip",
    label: "클립",
    sortOrder: 7,
    isActive: true,
    kind: "contract_target",
    accentColor: "lime",
    contractTargetField: "targetClip",
    contractDoneField: "clipDone",
    executionType: "influencer",
    partnerCategory: "clip",
    expenseCategory: "clip",
    syncExecution: true,
  },
  {
    id: "tiktok",
    label: "틱톡",
    sortOrder: 8,
    isActive: true,
    kind: "contract_target",
    accentColor: "emerald",
    contractTargetField: "targetTiktok",
    contractDoneField: "tiktokDone",
    executionType: "influencer",
    partnerCategory: "tiktok",
    expenseCategory: "tiktok",
    syncExecution: true,
  },
  {
    id: "press",
    label: "기자단",
    sortOrder: 9,
    isActive: true,
    kind: "execution_only",
    accentColor: "sky",
    executionType: "press",
    partnerCategory: "press",
    expenseCategory: "press",
    syncExecution: false,
  },
  {
    id: "referral",
    label: "리셀러",
    sortOrder: 99,
    isActive: true,
    isSystem: true,
    kind: "referral_promo",
    accentColor: "rose",
    partnerCategory: "referral",
    expenseCategory: "other",
    syncExecution: false,
  },
];

export function normalizeTaskChannels(
  channels?: TaskChannelDefinition[],
): TaskChannelDefinition[] {
  if (!channels?.length) return [...DEFAULT_TASK_CHANNELS];

  const byId = new Map(channels.map((c) => [c.id, c]));
  const merged: TaskChannelDefinition[] = DEFAULT_TASK_CHANNELS.map((def) => {
    const existing = byId.get(def.id);
    return existing ? { ...def, ...existing, isSystem: def.isSystem, kind: def.kind } : { ...def };
  });

  for (const ch of channels) {
    if (!DEFAULT_TASK_CHANNELS.some((d) => d.id === ch.id)) {
      merged.push(ch);
    }
  }

  return merged.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getSortedTaskChannels(
  channels: TaskChannelDefinition[],
): TaskChannelDefinition[] {
  return [...channels].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getActiveTaskChannels(
  channels: TaskChannelDefinition[],
): TaskChannelDefinition[] {
  return getSortedTaskChannels(channels).filter((c) => c.isActive);
}

export function getWorkOrderTaskChannels(
  channels: TaskChannelDefinition[],
): TaskChannelDefinition[] {
  return getActiveTaskChannels(channels).filter(
    (c) => c.kind === "contract_target" || c.kind === "referral_promo",
  );
}

export function getContractTargetChannels(
  channels: TaskChannelDefinition[],
): TaskChannelDefinition[] {
  return getActiveTaskChannels(channels).filter(
    (c) => c.kind === "contract_target",
  );
}

export function getTaskChannelLabel(
  channels: TaskChannelDefinition[],
  id: string,
): string {
  return (
    channels.find((c) => c.id === id)?.label ??
    DEFAULT_TASK_CHANNELS.find((c) => c.id === id)?.label ??
    id
  );
}

export function getTaskChannelAccent(
  channels: TaskChannelDefinition[],
  taskType: string,
): TaskChannelAccent {
  const channel = channels.find((c) => c.id === taskType);
  if (channel?.accentColor) return channel.accentColor;
  return DEFAULT_CHANNEL_ACCENTS[taskType] ?? "emerald";
}

export function getExecutionTypeAccent(
  channels: TaskChannelDefinition[],
  type: ExecutionType,
): TaskChannelAccent {
  const linked = channels.find(
    (c) => c.executionType === type && c.isActive && c.accentColor,
  );
  if (linked?.accentColor) return linked.accentColor;
  const byType = channels.find((c) => c.executionType === type && c.isActive);
  if (byType) return getTaskChannelAccent(channels, byType.id);
  return DEFAULT_EXECUTION_ACCENTS[type] ?? "emerald";
}

export function getTaskChannelBadgeClassName(
  channels: TaskChannelDefinition[],
  taskType: string,
): string {
  return TASK_CHANNEL_BADGE_CLASSES[getTaskChannelAccent(channels, taskType)];
}

export function getTaskChannelKpiChipClasses(
  channels: TaskChannelDefinition[],
  taskType: string,
): { chip: string; value: string } {
  const accent = getTaskChannelAccent(channels, taskType);
  return {
    chip: TASK_CHANNEL_KPI_CHIP_CLASSES[accent],
    value: TASK_CHANNEL_KPI_VALUE_CLASSES[accent],
  };
}

export function getExecutionTypeBadgeClassName(
  channels: TaskChannelDefinition[],
  type: ExecutionType,
): string {
  return TASK_CHANNEL_BADGE_CLASSES[getExecutionTypeAccent(channels, type)];
}

export function getTaskChannelProgressBarColor(
  accent: TaskChannelAccent,
): "emerald" | "cyan" | "amber" {
  if (accent === "cyan" || accent === "sky" || accent === "violet" || accent === "fuchsia") {
    return "cyan";
  }
  if (accent === "amber" || accent === "orange" || accent === "rose" || accent === "lime") {
    return "amber";
  }
  return "emerald";
}

export function getWorkOrderTaskLabel(data: AppData, taskType: string): string {
  return getTaskChannelLabel(data.taskChannels, taskType);
}

export function getExecutionTypeLabel(
  data: AppData,
  type: ExecutionType,
): string {
  const linked = data.taskChannels.find(
    (c) => c.executionType === type && c.isActive,
  );
  if (linked) return linked.label;
  return EXECUTION_TYPE_LABELS[type];
}

export function getExecutionTypeLabels(
  data: AppData,
): Record<ExecutionType, string> {
  return {
    optimized: getExecutionTypeLabel(data, "optimized"),
    influencer: getExecutionTypeLabel(data, "influencer"),
    experience: getExecutionTypeLabel(data, "experience"),
    press: getExecutionTypeLabel(data, "press"),
  };
}

export function getContractDoneCount(
  contract: Contract,
  channel: TaskChannelDefinition,
): number {
  if (channel.contractDoneField) {
    return contract[channel.contractDoneField] ?? 0;
  }
  return 0;
}

export function getContractChannelProgress(
  contract: Contract,
  channel: TaskChannelDefinition,
): number {
  const target = getContractTargetCount(contract, channel);
  if (target <= 0) return 0;
  return (getContractDoneCount(contract, channel) / target) * 100;
}

export function getContractCompletionRate(
  channels: TaskChannelDefinition[],
  contract: Contract,
): number {
  let totalTarget = 0;
  let totalDone = 0;
  for (const channel of getContractTargetChannels(channels)) {
    const target = getContractTargetCount(contract, channel);
    if (target <= 0) continue;
    totalTarget += target;
    totalDone += getContractDoneCount(contract, channel);
  }
  if (totalTarget === 0) return 0;
  return (totalDone / totalTarget) * 100;
}

export function getContractTargetUnit(channel: TaskChannelDefinition): string {
  if (channel.id === "experience") return "명";
  return "건";
}

export function formatContractTargetSummary(
  contract: Contract,
  channel: TaskChannelDefinition,
): string {
  const target = getContractTargetCount(contract, channel);
  if (channel.contractDoneField) {
    return `${getContractDoneCount(contract, channel)}/${target}`;
  }
  return `${target}${getContractTargetUnit(channel)}`;
}

export function shouldShowContractTargetRow(
  contract: Contract,
  channel: TaskChannelDefinition,
): boolean {
  if (channel.contractDoneField) {
    return (
      getContractTargetCount(contract, channel) > 0 ||
      getContractDoneCount(contract, channel) > 0
    );
  }
  return getContractTargetCount(contract, channel) > 0;
}

/** 계약 화면·KPI에 표시할 집행 채널 */
export function getContractVisibleTargetChannels(
  contract: Contract,
  channels: TaskChannelDefinition[],
): TaskChannelDefinition[] {
  return getContractTargetChannels(channels).filter((c) =>
    shouldShowContractTargetRow(contract, c),
  );
}

export function getContractTargetCount(
  contract: Contract,
  channel: TaskChannelDefinition,
): number {
  if (channel.kind === "referral_promo") {
    return contract.hasReferralPromo ? 1 : 0;
  }
  if (channel.contractTargetField) {
    return contract[channel.contractTargetField] ?? 0;
  }
  return contract.channelTargets?.[channel.id] ?? 0;
}

export function setContractTargetCount(
  contract: Contract,
  channel: TaskChannelDefinition,
  value: number,
): Contract {
  if (channel.contractTargetField) {
    return { ...contract, [channel.contractTargetField]: value };
  }
  return {
    ...contract,
    channelTargets: {
      ...contract.channelTargets,
      [channel.id]: value,
    },
  };
}

export function taskChannelToPartnerCategory(
  channels: TaskChannelDefinition[],
  taskType: WorkOrderTaskType,
): PartnerCategory {
  const channel = channels.find((c) => c.id === taskType);
  if (channel?.partnerCategory) return channel.partnerCategory;
  if (taskType === "referral") return "referral";
  if (taskType === "blog") return "blog";
  if (SOCIAL_INFLUENCER_CHANNEL_IDS.has(taskType)) return "influencer";
  if (taskType === "experience") return "experience";
  return "press";
}

export function taskChannelToExecutionType(
  channels: TaskChannelDefinition[],
  taskType: WorkOrderTaskType,
): ExecutionType {
  const channel = channels.find((c) => c.id === taskType);
  if (channel?.executionType) return channel.executionType;
  if (taskType === "blog") return "optimized";
  if (SOCIAL_INFLUENCER_CHANNEL_IDS.has(taskType)) return "influencer";
  if (taskType === "experience") return "experience";
  return "press";
}

export function taskChannelToExpenseCategory(
  channels: TaskChannelDefinition[],
  taskType: WorkOrderTaskType,
): ExpenseCategory {
  const channel = channels.find((c) => c.id === taskType);
  if (channel?.expenseCategory) return channel.expenseCategory;
  if (taskType === "referral") return "other";
  if (taskType === "blog") return "other";
  if (taskType === "youtube") return "youtube";
  if (taskType === "instagram") return "instagram";
  if (taskType === "clip") return "clip";
  if (taskType === "tiktok") return "tiktok";
  if (SOCIAL_INFLUENCER_CHANNEL_IDS.has(taskType)) return "influencer";
  if (taskType === "experience") return "experience";
  return "press";
}

export function shouldSyncExecutionForChannel(
  channels: TaskChannelDefinition[],
  taskType: WorkOrderTaskType,
): boolean {
  const channel = channels.find((c) => c.id === taskType);
  if (channel) return channel.syncExecution ?? false;
  return taskType !== "referral";
}

export function slugifyChannelId(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣_-]/g, "")
    .slice(0, 24);
  return base ? `ch-${base}` : `ch-${Date.now()}`;
}

export function createTaskChannelInput(
  label: string,
  channels: TaskChannelDefinition[],
): TaskChannelInput {
  let id = slugifyChannelId(label);
  let n = 1;
  while (channels.some((c) => c.id === id)) {
    id = `${slugifyChannelId(label)}-${n++}`;
  }
  const maxOrder = channels.reduce((m, c) => Math.max(m, c.sortOrder), 0);
  const usedAccents = new Set(
    channels.map((c) => c.accentColor).filter(Boolean) as TaskChannelAccent[],
  );
  const accentColor =
    TASK_CHANNEL_ACCENT_OPTIONS.find((a) => !usedAccents.has(a)) ?? "lime";
  return {
    id,
    label,
    sortOrder: maxOrder + 1,
    isActive: true,
    kind: "contract_target",
    accentColor,
    partnerCategory: "blog",
    expenseCategory: "other",
    syncExecution: true,
    executionType: "optimized",
  };
}
