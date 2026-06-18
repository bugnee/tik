"use client";

import { useRef, useState } from "react";
import { FileText, ImagePlus, Paperclip, X } from "lucide-react";
import {
  MAX_QA_ATTACHMENTS,
  MAX_QA_FILE_BYTES,
  MAX_QA_IMAGE_BYTES,
  QA_ATTACHMENT_ACCEPT,
  readFilesAsQaAttachments,
} from "@/lib/qa-attachment-utils";
import type { QaMessageAttachment } from "@/lib/types";
import { cn } from "@/lib/cn";

/** Q&A 작성·답변 폼용 첨부 선택 */
export function QaAttachmentField({
  attachments,
  onChange,
  className,
}: {
  attachments: QaMessageAttachment[];
  onChange: (next: QaMessageAttachment[]) => void;
  className?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const { attachments: next, errors } = await readFilesAsQaAttachments(
      files,
      attachments.length,
    );
    if (errors.length > 0) {
      setError(errors[0]);
    }
    if (next.length > 0) {
      onChange([...attachments, ...next].slice(0, MAX_QA_ATTACHMENTS));
    }
  }

  function remove(id: string) {
    onChange(attachments.filter((item) => item.id !== id));
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-zinc-400">
          첨부파일 (최대 {MAX_QA_ATTACHMENTS}개)
        </p>
        {attachments.length < MAX_QA_ATTACHMENTS && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
          >
            <Paperclip className="h-3 w-3" />
            파일 선택
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={QA_ATTACHMENT_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((item) =>
            item.kind === "image" ? (
              <div
                key={item.id}
                className="relative h-20 w-20 overflow-hidden rounded-lg border border-zinc-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.dataUrl}
                  alt={item.fileName}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="absolute right-1 top-1 rounded-full bg-zinc-950/80 p-0.5 text-zinc-300 hover:text-white"
                  aria-label="첨부 삭제"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div
                key={item.id}
                className="relative flex max-w-[160px] items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-2 py-1.5 pr-7"
              >
                <FileText className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="truncate text-[11px] text-zinc-300">
                  {item.fileName}
                </span>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="absolute right-1 top-1 rounded-full p-0.5 text-zinc-500 hover:text-zinc-200"
                  aria-label="첨부 삭제"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ),
          )}
          {attachments.length < MAX_QA_ATTACHMENTS && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
            >
              <ImagePlus className="h-5 w-5" />
              <span className="text-[10px]">추가</span>
            </button>
          )}
        </div>
      )}

      {error && <p className="text-xs text-rose-400">{error}</p>}
      <p className="text-[10px] text-zinc-600">
        이미지 · 문서(pdf/doc/xls 등) · 이미지 최대{" "}
        {Math.round(MAX_QA_IMAGE_BYTES / 1_000_000)}MB · 기타{" "}
        {Math.round(MAX_QA_FILE_BYTES / 1_000_000)}MB
      </p>
    </div>
  );
}

/** Q&A 메시지에 표시되는 첨부 목록 (사진은 썸네일) */
export function QaMessageAttachmentList({
  attachments,
}: {
  attachments: QaMessageAttachment[];
}) {
  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => a.kind === "image");
  const files = attachments.filter((a) => a.kind === "file");

  return (
    <div className="mt-2 space-y-2 border-t border-zinc-800/60 pt-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((item) => (
            <a
              key={item.id}
              href={item.dataUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-24 w-24 overflow-hidden rounded-lg border border-zinc-700/80 transition-opacity hover:opacity-90"
              title={item.fileName}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.dataUrl}
                alt={item.fileName}
                className="h-full w-full object-cover"
              />
            </a>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((item) => (
            <a
              key={item.id}
              href={item.dataUrl}
              download={item.fileName}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/80 bg-zinc-950/40 px-2 py-1 text-[11px] text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <span className="max-w-[140px] truncate">{item.fileName}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
