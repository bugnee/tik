"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  buildLinkOpinionSourceLabel,
  formatPostLinkOpinionAuthor,
} from "@/lib/post-link-opinion-utils";
import type { PostLinkOpinion } from "@/lib/types";
import type { AppData } from "@/lib/types";

export function PostLinkOpinionDetail({
  data,
  opinion,
}: {
  data: AppData;
  opinion: PostLinkOpinion;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-zinc-100">링크 보고서 의견</h3>
            <Badge variant="info">원본 표시</Badge>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {formatPostLinkOpinionAuthor(data, opinion)} · {opinion.createdAt}
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-400/80">
          원본 출처
        </p>
        <p className="mt-1 text-xs text-zinc-300">
          {buildLinkOpinionSourceLabel(opinion)}
        </p>
        <a
          href={opinion.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center gap-1 truncate text-sm text-emerald-400 hover:underline"
        >
          {opinion.linkUrl}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      </div>

      <div className="rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm text-zinc-200">
        <p className="mb-1 text-[10px] font-medium text-zinc-500">의견 내용</p>
        <p className="whitespace-pre-wrap">{opinion.body}</p>
      </div>

      {opinion.imageUrls.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-zinc-500">
            첨부 사진 {opinion.imageUrls.length}장
          </p>
          <div className="flex flex-wrap gap-2">
            {opinion.imageUrls.map((src, index) => (
              <a
                key={`${opinion.id}-img-${index}`}
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-24 w-24 overflow-hidden rounded-lg border border-zinc-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`첨부 ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
