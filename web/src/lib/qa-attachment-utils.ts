import type { QaMessageAttachment } from "./types";

export const MAX_QA_ATTACHMENTS = 5;
export const MAX_QA_IMAGE_BYTES = 2_000_000;
export const MAX_QA_FILE_BYTES = 5_000_000;

/** Q&A 첨부 허용 MIME/확장자 */
export const QA_ATTACHMENT_ACCEPT =
  "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.hwp";

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function newAttachmentId(): string {
  return `qa-att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 파일 목록을 Q&A 첨부 객체로 변환 (용량·개수 제한 적용) */
export async function readFilesAsQaAttachments(
  files: FileList | File[],
  existingCount = 0,
): Promise<{ attachments: QaMessageAttachment[]; errors: string[] }> {
  const list = Array.from(files);
  const attachments: QaMessageAttachment[] = [];
  const errors: string[] = [];
  const slotsLeft = Math.max(0, MAX_QA_ATTACHMENTS - existingCount);

  for (const file of list) {
    if (attachments.length >= slotsLeft) {
      errors.push(`첨부는 최대 ${MAX_QA_ATTACHMENTS}개까지 가능합니다.`);
      break;
    }

    const image = isImageFile(file);
    const maxBytes = image ? MAX_QA_IMAGE_BYTES : MAX_QA_FILE_BYTES;

    if (file.size > maxBytes) {
      errors.push(
        `${file.name}: 용량 초과 (최대 ${Math.round(maxBytes / 1_000_000)}MB)`,
      );
      continue;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      attachments.push({
        id: newAttachmentId(),
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        kind: image ? "image" : "file",
        dataUrl,
        byteSize: file.size,
      });
    } catch {
      errors.push(`${file.name}: 파일을 읽지 못했습니다.`);
    }
  }

  return { attachments, errors };
}

export function formatQaAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
