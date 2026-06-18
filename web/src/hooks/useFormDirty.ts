import { useRef } from "react";
import { cloneFormValue, valuesEqual } from "@/lib/form-dirty";

/**
 * 모달·폼 세션이 열릴 때 baseline을 잡고, 현재 값과 비교해 변경 여부를 반환합니다.
 * sessionKey는 편집 대상이 바뀔 때마다 갱신하세요 (예: editing?.id ?? "create").
 */
export function useFormDirty<T>(
  active: boolean,
  sessionKey: string | number,
  current: T,
): boolean {
  const baselineRef = useRef(current);
  const sessionRef = useRef(sessionKey);
  const activeRef = useRef(active);

  if (active && (!activeRef.current || sessionRef.current !== sessionKey)) {
    baselineRef.current = cloneFormValue(current);
    sessionRef.current = sessionKey;
  }
  activeRef.current = active;

  return active && !valuesEqual(current, baselineRef.current);
}
