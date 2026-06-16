"use client";

import { useRef, useState } from "react";
import { ImagePlus, MessageSquare, X } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import {
  canAddPostLinkOpinion,
  getPostLinkOpinionsForLink,
  MAX_LINK_OPINION_IMAGES,
  MAX_LINK_OPINION_IMAGE_BYTES,
  readImageFilesAsDataUrls,
} from "@/lib/post-link-opinion-utils";
import type { ClientReportLink } from "@/lib/selectors";

type PostLinkOpinionButtonProps = {
  contractId: string;
  link: ClientReportLink;
};

export function PostLinkOpinionButton({
  contractId,
  link,
}: PostLinkOpinionButtonProps) {
  const data = useData();
  const { currentUser, activeRole } = useRole();
  const { addPostLinkOpinion } = data;

  const existingCount = getPostLinkOpinionsForLink(
    data,
    contractId,
    link.id,
  ).length;

  const canAdd = canAddPostLinkOpinion(
    data,
    activeRole,
    currentUser.id,
    contractId,
  );

  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!canAdd) return null;

  function resetForm() {
    setBody("");
    setImages([]);
    setError("");
  }

  function handleClose() {
    setOpen(false);
    resetForm();
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    try {
      const next = await readImageFilesAsDataUrls(files);
      if (next.length === 0) {
        setError(
          `이미지 파일만 첨부할 수 있습니다. (최대 ${MAX_LINK_OPINION_IMAGES}장 · ${Math.round(MAX_LINK_OPINION_IMAGE_BYTES / 1_000_000)}MB)`,
        );
        return;
      }
      setImages((prev) =>
        [...prev, ...next].slice(0, MAX_LINK_OPINION_IMAGES),
      );
    } catch {
      setError("이미지를 불러오지 못했습니다.");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      setError("의견 내용을 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    addPostLinkOpinion({
      contractId,
      linkId: link.id,
      linkUrl: link.url,
      channel: link.channel,
      reportSource: link.source,
      taskType: link.taskType,
      executionType: link.executionType,
      body: body.trim(),
      imageUrls: images,
      authorUserId: currentUser.id,
    });
    setSubmitting(false);
    handleClose();
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => setOpen(true)}
        className="shrink-0"
      >
        <MessageSquare className="h-4 w-4" />
        의견
        {existingCount > 0 && (
          <Badge variant="info" className="ml-1 px-1.5 py-0 text-[10px]">
            {existingCount}
          </Badge>
        )}
      </Button>

      <Modal open={open} onClose={handleClose} title="링크 의견 등록">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-zinc-500">
            {link.channel} · {link.source}
          </p>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2.5 text-xs text-zinc-500">
            <p className="font-medium text-zinc-400">원본 링크</p>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate text-emerald-400 hover:underline"
            >
              {link.url}
            </a>
          </div>

          <Textarea
            label="의견"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="게시물에 대한 의견을 입력해 주세요"
            rows={4}
            required
          />

          <div>
            <p className="mb-2 text-xs font-medium text-zinc-400">
              사진 첨부 (최대 {MAX_LINK_OPINION_IMAGES}장)
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="flex flex-wrap gap-2">
              {images.map((src, index) => (
                <div
                  key={`${src.slice(0, 32)}-${index}`}
                  className="relative h-20 w-20 overflow-hidden rounded-lg border border-zinc-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`첨부 ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setImages((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="absolute right-1 top-1 rounded-full bg-zinc-950/80 p-0.5 text-zinc-300 hover:text-white"
                    aria-label="첨부 삭제"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < MAX_LINK_OPINION_IMAGES && (
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
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              등록
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleClose}
            >
              취소
            </Button>
          </div>

          <p className="text-[10px] text-zinc-600">
            등록한 의견은 플레이스 · 질의응답 목록에 원본 링크와 함께 표시됩니다.
          </p>
        </form>
      </Modal>
    </>
  );
}
