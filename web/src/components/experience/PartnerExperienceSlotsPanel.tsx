"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, MapPin, Send, Users } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useExperience } from "@/features/experience/useExperience";
import { useRole } from "@/context/RoleContext";
import { LocationProfilePanel } from "@/components/location/LocationProfilePanel";
import { RegionSelect } from "@/components/location/RegionSelect";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/FormFields";
import { TabBar } from "@/components/ui/TabBar";
import {
  EXPERIENCE_PARTICIPATION_PROPOSAL_STATUS_LABELS,
  formatContractExperienceLocation,
  formatExperienceOfferSchedule,
  formatExperienceSlotLocation,
  getPartnerExperienceOffers,
  getPartnerParticipationProposals,
  partnerHasPendingProposal,
  type PartnerExperienceOffer,
} from "@/lib/experience-partner-slot-utils";
import { ExperienceOfferVerifyInfo } from "@/components/experience/ExperienceOfferVerifyInfo";
import {
  getContractLocation,
  getPartnerLocation,
  isRegionMatch,
  LOCATION_FIELD_HINT,
} from "@/lib/location-profile-utils";

type PanelTab = "offers" | "proposals";

function offerLocationProfile(offer: PartnerExperienceOffer) {
  if (offer.kind === "slot") {
    return {
      regionProvince: offer.slot.regionProvince,
      regionCity: offer.slot.regionCity,
      address: offer.slot.address,
    };
  }
  return getContractLocation(offer.contract);
}

export function PartnerExperienceSlotsPanel({
  partnerId,
}: {
  partnerId: string;
}) {
  const data = useData();
  const { submitExperienceParticipationProposal } = useExperience();
  const { currentUser } = useRole();
  const { partners, updatePartnerLocation } = data;

  const partner = partners.find((item) => item.id === partnerId);
  const [panelTab, setPanelTab] = useState<PanelTab>("offers");
  const [filterProvince, setFilterProvince] = useState("");
  const [filterCity, setFilterCity] = useState("");

  const allOffers = useMemo(() => {
    if (!partner) return [];
    return getPartnerExperienceOffers(data, partner);
  }, [data, partner]);

  const regionFilter = useMemo(
    () => ({
      regionProvince: filterProvince || undefined,
      regionCity: filterCity || undefined,
    }),
    [filterProvince, filterCity],
  );

  const offers = useMemo(() => {
    if (!filterProvince) return allOffers;
    return allOffers.filter((offer) =>
      isRegionMatch(regionFilter, offerLocationProfile(offer)),
    );
  }, [allOffers, filterProvince, regionFilter]);

  const myProposals = useMemo(
    () => getPartnerParticipationProposals(data, partnerId),
    [data, partnerId],
  );

  const pendingProposalCount = myProposals.filter(
    (item) => item.status === "pending",
  ).length;

  if (!partner) return null;

  const location = getPartnerLocation(partner);

  return (
    <div className="space-y-6">
      <LocationProfilePanel
        variant="partner"
        value={location}
        onSave={(input) => updatePartnerLocation(partnerId, input)}
      />

      <TabBar
        active={panelTab}
        onChange={setPanelTab}
        items={[
          {
            id: "offers",
            label: `참여 가능${offers.length ? ` (${offers.length})` : ""}`,
            shortLabel: "일정",
            accent: "amber",
          },
          {
            id: "proposals",
            label: `내 제안${myProposals.length ? ` (${myProposals.length})` : ""}`,
            shortLabel: "제안",
            accent: "cyan",
          },
        ]}
      />

      {panelTab === "offers" && (
        <Card glow className="border-amber-500/25">
          <CardHeader
            title="공유된 체험단 일정"
            subtitle="진행 중인 체험단 일정 · 지역 필터는 검색용입니다"
          />
          <div className="space-y-3 px-4 pb-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
              <p className="mb-2 text-xs font-medium text-zinc-400">
                지역으로 검색 (선택)
              </p>
              <RegionSelect
                province={filterProvince}
                city={filterCity}
                onProvinceChange={(regionProvince) => {
                  setFilterProvince(regionProvince);
                  setFilterCity("");
                }}
                onCityChange={setFilterCity}
                hint={LOCATION_FIELD_HINT}
              />
            </div>

            {offers.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-500">
                {filterProvince
                  ? "선택한 지역에 해당하는 일정이 없습니다."
                  : "현재 참여 가능한 체험단 일정이 없습니다."}
              </p>
            )}

            {offers.map((offer) => (
              <ExperienceOfferCard
                key={offer.key}
                offer={offer}
                partnerId={partnerId}
                userId={currentUser.id}
                hasPending={
                  partnerHasPendingProposal(
                    data.experienceParticipationProposals ?? [],
                    partnerId,
                    offer.campaign.id,
                    offer.kind === "slot" ? offer.slot.id : undefined,
                  )
                }
                onSubmit={submitExperienceParticipationProposal}
              />
            ))}
          </div>
        </Card>
      )}

      {panelTab === "proposals" && (
        <Card className="border-cyan-500/20">
          <CardHeader
            title="내 참여 제안"
            subtitle={
              pendingProposalCount
                ? `${pendingProposalCount}건 검토 중`
                : "제출한 체험단 참여 제안 현황"
            }
          />
          <div className="space-y-3 px-4 pb-4">
            {myProposals.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                아직 제안한 체험단 일정이 없습니다.
              </p>
            ) : (
              myProposals.map((proposal) => {
                const campaign = (data.experienceCampaigns ?? []).find(
                  (item) => item.id === proposal.campaignId,
                );
                const contract = data.contracts.find(
                  (item) => item.id === proposal.contractId,
                );
                return (
                  <div
                    key={proposal.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-100">
                          {contract?.clientName ?? "-"}
                        </p>
                        <p className="text-sm text-amber-200/90">
                          {campaign?.title ?? "체험단"}
                        </p>
                        <p className="mt-1 text-sm text-zinc-300">
                          {proposal.visitDate}
                          {proposal.visitTime
                            ? ` ${proposal.visitTime}${proposal.visitEndTime ? `~${proposal.visitEndTime}` : ""}`
                            : ""}
                        </p>
                        {proposal.headcount && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                            <Users className="h-3.5 w-3.5" />
                            {proposal.headcount}명
                          </p>
                        )}
                        {proposal.message && (
                          <p className="mt-2 text-xs text-zinc-400">
                            {proposal.message}
                          </p>
                        )}
                        {campaign && contract && (
                          <ExperienceOfferVerifyInfo
                            contract={contract}
                            campaign={campaign}
                            className="mt-3 border-t border-zinc-800/80 pt-3"
                          />
                        )}
                        {proposal.reviewNote && proposal.status !== "pending" && (
                          <p className="mt-2 text-xs text-zinc-500">
                            검토: {proposal.reviewNote}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          proposal.status === "accepted"
                            ? "success"
                            : proposal.status === "rejected"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {
                          EXPERIENCE_PARTICIPATION_PROPOSAL_STATUS_LABELS[
                            proposal.status
                          ]
                        }
                      </Badge>
                    </div>
                    <p className="mt-2 text-[11px] text-zinc-600">
                      제안일 {proposal.createdAt}
                      {proposal.reviewedAt &&
                        ` · 검토 ${proposal.reviewedAt}`}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function ExperienceOfferCard({
  offer,
  partnerId,
  userId,
  hasPending,
  onSubmit,
}: {
  offer: PartnerExperienceOffer;
  partnerId: string;
  userId: string;
  hasPending: boolean;
  onSubmit: ReturnType<typeof useExperience>["submitExperienceParticipationProposal"];
}) {
  const [open, setOpen] = useState(false);
  const [visitDate, setVisitDate] = useState(
    offer.kind === "slot"
      ? offer.slot.visitDate
      : offer.suggestedDate ?? "",
  );
  const [visitTime, setVisitTime] = useState(
    offer.kind === "slot"
      ? offer.slot.visitTime ?? ""
      : offer.suggestedTime ?? "",
  );
  const [visitEndTime, setVisitEndTime] = useState(
    offer.kind === "slot"
      ? offer.slot.visitEndTime ?? ""
      : offer.suggestedEndTime ?? "",
  );
  const [headcount, setHeadcount] = useState(
    String(offer.campaign.criteria.targetHeadcount ?? 2),
  );
  const [message, setMessage] = useState("");

  const locationLabel =
    offer.kind === "slot"
      ? formatExperienceSlotLocation(offer.slot)
      : formatContractExperienceLocation(offer.contract);

  function handleSubmit() {
    if (!visitDate) return;
    const created = onSubmit({
      campaignId: offer.campaign.id,
      contractId: offer.contract.id,
      slotId: offer.kind === "slot" ? offer.slot.id : undefined,
      partnerId,
      proposedByUserId: userId,
      visitDate,
      visitTime: visitTime || undefined,
      visitEndTime: visitEndTime || undefined,
      headcount: Number(headcount) || undefined,
      message: message.trim() || undefined,
    });
    if (created) {
      setOpen(false);
      setMessage("");
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-100">{offer.contract.clientName}</p>
          <p className="text-sm text-amber-200/90">{offer.campaign.title}</p>
          <p className="mt-1 text-sm text-zinc-300">
            {formatExperienceOfferSchedule(offer)}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
            <MapPin className="h-3.5 w-3.5" />
            {locationLabel}
          </p>
          {offer.campaign.criteria.providedBenefit && (
            <p className="mt-2 text-xs text-zinc-400">
              혜택: {offer.campaign.criteria.providedBenefit}
            </p>
          )}
          <ExperienceOfferVerifyInfo
            contract={offer.contract}
            campaign={offer.campaign}
            className="mt-3 border-t border-zinc-800/80 pt-3"
          />
          {offer.kind === "slot" && offer.slot.note && (
            <p className="mt-1 text-xs text-zinc-400">{offer.slot.note}</p>
          )}
        </div>
        <Badge variant={offer.kind === "slot" ? "warning" : "info"}>
          {offer.kind === "slot" ? "공유 일정" : "모집 중"}
        </Badge>
      </div>

      {open ? (
        <div className="mt-4 space-y-3 border-t border-zinc-800 pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="희망 체험일"
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
          <Input
            label="참여 인원"
            type="number"
            min={1}
            value={headcount}
            onChange={(e) => setHeadcount(e.target.value)}
          />
          <Textarea
            label="제안 메모"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="블로그 채널 · 가능 일정 · 문의 사항"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button size="sm" disabled={!visitDate} onClick={handleSubmit}>
              <Send className="h-4 w-4" />
              참여 제안 보내기
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          className="mt-4"
          disabled={hasPending}
          onClick={() => setOpen(true)}
        >
          <CalendarCheck className="h-4 w-4" />
          {hasPending ? "제안 검토 중" : "이 체험단에 제안하기"}
        </Button>
      )}
    </div>
  );
}
