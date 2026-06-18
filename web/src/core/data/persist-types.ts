import type { AppData } from "@/lib/types";

/** AppData 변경 함수 — store·DataContext 공통 */
export type PersistFn = (updater: (prev: AppData) => AppData) => void;

export type IdFactory = (prefix: string) => string;

export type TodayFn = () => string;

export type StoreDeps = {
  persist: PersistFn;
  newId: IdFactory;
  todayISO: TodayFn;
};

/** ok 플래그가 있는 mutation 결과 */
export type MutationResult = {
  next: AppData;
  ok: boolean;
};
