"use client";

import { useMemo } from "react";
import { CheckCircle2, Users, XCircle } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useExperience } from "@/features/experience/useExperience";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EXPERIENCE_PARTICIPATION_PROPOSAL_STATUS_LABELS } from "@/lib/experience-partner-slot-utils";
import { getUserName } from "@/lib/selectors";
import type { ExperienceParticipationProposal } from "@/lib/types";

export function ExperienceParticipationProposalsStaffPanel({
  campaignId,
  contractId,
  readOnly = false,
}: {
  campaignId: string;
  contractId: string;
  readOnly?: boolean;
}) {
  const data = useData();
  const {
    acceptExperienceParticipationProposal,
    rejectExperienceParticipationProposal,
  } = useExperience();
  const { currentUser } = useRole();
  const { partners } = data;

  const proposals = useMemo(() => {
    return (data.experienceParticipationProposals ?? [])
      .filter(
        (item) =>
          item.campaignId === campaignId && item.contractId === contractId,
      )
      .sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [data.experienceParticipationProposals, campaignId, contractId]);

  const pendingCount = proposals.filter((item) => item.status === "pending").length;

  if (proposals.length === 0) return null;

  return (
    <Card className="border-cyan-500/20">
      <CardHeader
        title="파트너 참여 제안"
        subtitle={
          pendingCount
            ? `${pendingCount}건 검토 대기`
            : "파트너가 제출한 체험단 참여 제안"
        }
        action={
          pendingCount > 0 ? (
            <Badge variant="warning">{pendingCount}건 검토 필요</Badge>
          ) : undefined
        }
      />
      <div className="space-y-2 px-4 pb-4">
        {proposals.map((proposal) => (
          <ProposalRow
            key={proposal.id}
            proposal={proposal}
            partnerName={
              partners.find((item) => item.id === proposal.partnerId)
                ?.companyName ?? "-"
            }
            proposerName={getUserName(data, proposal.proposedByUserId)}
            readOnly={readOnly}
            onAccept={() =>
              acceptExperienceParticipationProposal(proposal.id, currentUser.id)
            }
            onReject={() =>
              rejectExperienceParticipationProposal(proposal.id, currentUser.id)
            }
          />
        ))}
      </div>
    </Card>
  );
}

function ProposalRow({
  proposal,
  partnerName,
  proposerName,
  readOnly,
  onAccept,
  onReject,
}: {
  proposal: ExperienceParticipationProposal;
  partnerName: string;
  proposerName: string;
  readOnly: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-3">
      <div>
        <p className="text-sm font-medium text-zinc-100">{partnerName}</p>
        <p className="text-xs text-zinc-500">제안자 {proposerName}</p>
        <p className="mt-1 text-sm text-zinc-300">
          {proposal.visitDate}
          {proposal.visitTime
            ? ` ${proposal.visitTime}${proposal.visitEndTime ? `~${proposal.visitEndTime}` : ""}`
            : ""}
        </p>
        {proposal.headcount && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
            <Users className="h-3 w-3" />
            {proposal.headcount}명
          </p>
        )}
        {proposal.message && (
          <p className="mt-1 text-xs text-zinc-400">{proposal.message}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant={
            proposal.status === "accepted"
              ? "success"
              : proposal.status === "rejected"
                ? "danger"
                : "warning"
          }
        >
          {EXPERIENCE_PARTICIPATION_PROPOSAL_STATUS_LABELS[proposal.status]}
        </Badge>
        {!readOnly && proposal.status === "pending" && (
          <>
            <Button size="sm" onClick={onAccept}>
              <CheckCircle2 className="h-4 w-4" />
              승인
            </Button>
            <Button size="sm" variant="secondary" onClick={onReject}>
              <XCircle className="h-4 w-4" />
              반려
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
