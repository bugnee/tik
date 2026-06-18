"use client";

import { createContext, useContext } from "react";
import type { QaStore } from "@/features/place-qa/create-qa-store";

const QaStoreContext = createContext<QaStore | null>(null);

export function QaStoreProvider({
  value,
  children,
}: {
  value: QaStore;
  children: React.ReactNode;
}) {
  return (
    <QaStoreContext.Provider value={value}>{children}</QaStoreContext.Provider>
  );
}

/** 플레이스 Q&A · 접속정보 전용 store */
export function useQaStore(): QaStore {
  const store = useContext(QaStoreContext);
  if (!store) {
    throw new Error("useQaStore는 QaStoreProvider 내부에서 사용하세요.");
  }
  return store;
}
