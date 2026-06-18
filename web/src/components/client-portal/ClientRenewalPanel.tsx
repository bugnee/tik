"use client";

import { ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ClientRenewalInsight } from "@/lib/client-portal-utils";
import type { Contract } from "@/lib/types";
import { cn } from "@/lib/cn";

export function ClientRenewalPanel({
  contract,
  renewal,
  managerName,
  onRequestExtension,
  onGoToQa,
  previewMode,
}: {
  contract: Contract;
  renewal: ClientRenewalInsight;
  managerName: string;
  onRequestExtension: () => void;
  onGoToQa: () => void;
  previewMode?: boolean;
}) {
  const showCta =
    renewal.canRequestExtension ||
    renewal.urgency === "soon" ||
    renewal.urgency === "imminent";

  return (
    <Card
      id="client-action-renewal"
      glow
      className={cn(
        renewal.urgency === "imminent" && "ring-1 ring-amber-500/30",
        renewal.urgency === "soon" && "ring-1 ring-cyan-500/20",
      )}
    >
      <CardHeader
        title="재계약 · 파트너십"
        subtitle="성과를 바탕으로 다음 회차를 준비합니다"
      />

      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-zinc-100">{renewal.headline}</p>
              <p className="mt-1 text-sm text-zinc-500">{renewal.subline}</p>
            </div>
            {renewal.daysLeft != null && contract.status === "active" && (
              <Badge
                variant={
                  renewal.urgency === "imminent"
                    ? "warning"
                    : renewal.urgency === "soon"
                      ? "info"
                      : "default"
                }
              >
                D-{Math.max(0, renewal.daysLeft)}
              </Badge>
            )}
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-2 rounded-lg bg-zinc-900/50 px-3 py-2">
              <dt className="text-zinc-500">계약 기간</dt>
              <dd className="font-medium text-zinc-200">
                {contract.contractStartDate} ~ {contract.contractEndDate}
              </dd>
            </div>
            <div className="flex justify-between gap-2 rounded-lg bg-zinc-900/50 px-3 py-2">
              <dt className="text-zinc-500">담당 매니저</dt>
              <dd className="font-medium text-zinc-200">{managerName}</dd>
            </div>
          </dl>
        </div>

        {renewal.extensionApproval?.status === "pending" && (
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-200/90">
            재계약 신청 접수 · {renewal.extensionApproval.createdAt} · 검토 중
          </p>
        )}

        {showCta && !previewMode && (
          <div className="flex flex-wrap gap-2">
            {renewal.canRequestExtension && (
              <Button onClick={onRequestExtension}>
                <RefreshCw className="h-4 w-4" />
                재계약 상담 신청
              </Button>
            )}
            <Button variant="secondary" onClick={onGoToQa}>
              담당자에게 문의
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {!showCta && renewal.extensionApproval?.status !== "pending" && (
          <p className="text-xs text-zinc-600">
            궁금한 점은 소통 탭 Q&A로 남겨 주시면 담당 매니저가 답변드립니다.
          </p>
        )}
      </div>
    </Card>
  );
}
