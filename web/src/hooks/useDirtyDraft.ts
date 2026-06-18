import { useEffect, useState } from "react";

/** 저장된 값과 동기화되는 단일 필드 draft + 변경 여부 */
export function useDirtyDraft(saved: string) {
  const [draft, setDraft] = useState(saved);

  useEffect(() => {
    setDraft(saved);
  }, [saved]);

  const isDirty = draft !== saved;

  return { draft, setDraft, isDirty };
}
