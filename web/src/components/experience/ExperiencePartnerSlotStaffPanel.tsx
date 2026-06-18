"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, MapPin, Users } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useExperience } from "@/features/experience/useExperience";
import { useRole } from "@/context/RoleContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/FormFields";
import { ExperienceParticipationProposalsStaffPanel } from "@/components/experience/ExperienceParticipationProposalsStaffPanel";
import {
  buildSlotFromContractLocation,
  EXPERIENCE_PARTNER_SLOT_STATUS_LABELS,
  formatContractExperienceLocation,
  formatExperienceSlotLocation,
  formatExperienceSlotSchedule,
  getCampaignPartnerSlots,
} from "@/lib/experience-partner-slot-utils";
import {
  hasLocationMetadata,
  LOCATION_FIELD_HINT,
} from "@/lib/location-profile-utils";
import type { ExperienceCampaign, ExperiencePartnerSlot } from "@/lib/types";

export function ExperiencePartnerSlotStaffPanel({
  campaign,
  contractId,
  readOnly = false,
}: {
  campaign: ExperienceCampaign;
  contractId: string;
  readOnly?: boolean;
}) {
  const data = useData();
  const { publishExperiencePartnerSlot, cancelExperiencePartnerSlot } =
    useExperience();
  const { currentUser } = useRole();
  const { contracts, partners } = data;

  const contract = contracts.find((item) => item.id === contractId);
  const slots = useMemo(
    () => getCampaignPartnerSlots(data.experiencePartnerSlots ?? [], campaign.id),
    [data.experiencePartnerSlots, campaign.id],
  );

  const [visitDate, setVisitDate] = useState(
    campaign.confirmedVisitDate ?? "",
  );
  const [visitTime, setVisitTime] = useState(
    campaign.confirmedVisitTime ?? "12:00",
  );
  const [visitEndTime, setVisitEndTime] = useState(
    campaign.confirmedVisitEndTime ?? "15:00",
  );
  const [note, setNote] = useState("");

  if (!contract) return null;

  const hasLocationRef = hasLocationMetadata(contract);

  function handlePublish() {
    if (!visitDate) return;
    const location = buildSlotFromContractLocation(contract!);
    publishExperiencePartnerSlot({
      campaignId: campaign.id,
      contractId,
      visitDate,
      visitTime: visitTime || undefined,
      visitEndTime: visitEndTime || undefined,
      note: note || undefined,
      regionProvince: location.regionProvince,
      regionCity: location.regionCity,
      address: location.address,
      createdByUserId: currentUser.id,
    });
    setNote("");
  }

  return (
    <>
      <Card className="border-amber-500/20">
        <CardHeader
          title="파트너 체험 일정 공유"
          subtitle="체험단 파트너에게 일정 공개 · 지역은 참고·검색용"
          action={
            hasLocationRef ? (
              <Badge variant="default">지역 참고 정보</Badge>
            ) : undefined
          }
        />
        <div className="space-y-4 px-4 pb-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400">
            <p className="flex items-center gap-1.5 text-zinc-300">
              <MapPin className="h-3.5 w-3.5 text-amber-300" />
              {formatContractExperienceLocation(contract)}
            </p>
            <p className="mt-1 text-zinc-500">{LOCATION_FIELD_HINT}</p>
          </div>

          {!readOnly && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="체험일"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
              />
              <Input
                label="시작"
                type="time"
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
              />
              <Input
                label="종료"
                type="time"
                value={visitEndTime}
                onChange={(e) => setVisitEndTime(e.target.value)}
              />
            </div>
          )}
          {!readOnly && (
            <>
              <Input
                label="안내 메모"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="집합 장소 · 제공 혜택 · 준비물"
              />
              <Button
                size="sm"
                disabled={!visitDate}
                onClick={handlePublish}
              >
                <CalendarPlus className="h-4 w-4" />
                파트너에게 일정 공개
              </Button>
            </>
          )}

          <div className="space-y-2">
            {slots.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500">
                공유된 파트너 일정이 없습니다.
              </p>
            ) : (
              slots.map((slot) => (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  partnerName={
                    slot.claimedByPartnerId
                      ? partners.find((p) => p.id === slot.claimedByPartnerId)
                          ?.companyName ?? "-"
                      : undefined
                  }
                  onCancel={
                    !readOnly && slot.status === "open"
                      ? () => cancelExperiencePartnerSlot(slot.id)
                      : undefined
                  }
                />
              ))
            )}
          </div>
        </div>
      </Card>
      <ExperienceParticipationProposalsStaffPanel
        campaignId={campaign.id}
        contractId={contractId}
        readOnly={readOnly}
      />
    </>
  );
}

function SlotRow({
  slot,
  partnerName,
  onCancel,
}: {
  slot: ExperiencePartnerSlot;
  partnerName?: string;
  onCancel?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-3">
      <div>
        <p className="text-sm font-medium text-zinc-100">
          {formatExperienceSlotSchedule(slot)}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {formatExperienceSlotLocation(slot)}
        </p>
        {slot.note && <p className="mt-1 text-xs text-zinc-400">{slot.note}</p>}
        {partnerName && (
          <p className="mt-1 flex items-center gap-1 text-xs text-cyan-300">
            <Users className="h-3 w-3" />
            선정 {partnerName}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={slot.status === "claimed" ? "success" : "warning"}>
          {EXPERIENCE_PARTNER_SLOT_STATUS_LABELS[slot.status]}
        </Badge>
        {onCancel && (
          <Button size="sm" variant="secondary" onClick={onCancel}>
            취소
          </Button>
        )}
      </div>
    </div>
  );
}
