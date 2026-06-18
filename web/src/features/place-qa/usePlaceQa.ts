"use client";

import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { useQaStore } from "@/features/place-qa/QaStoreContext";
import type { QaStore } from "@/features/place-qa/create-qa-store";

/** Q&A · 플레이스 접속정보 슬라이스 + mutation */
export function usePlaceQa(): QaStore & {
  qaThreads: ReturnType<typeof useData>["qaThreads"];
  qaMessages: ReturnType<typeof useData>["qaMessages"];
  placeCredentials: ReturnType<typeof useData>["placeCredentials"];
  postLinkOpinions: ReturnType<typeof useData>["postLinkOpinions"];
} {
  const data = useData();
  const store = useQaStore();
  return useMemo(
    () => ({
      qaThreads: data.qaThreads,
      qaMessages: data.qaMessages,
      placeCredentials: data.placeCredentials,
      postLinkOpinions: data.postLinkOpinions,
      ...store,
    }),
    [
      data.qaThreads,
      data.qaMessages,
      data.placeCredentials,
      data.postLinkOpinions,
      store,
    ],
  );
}
