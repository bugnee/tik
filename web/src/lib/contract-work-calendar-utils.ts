import type { ExperienceCampaign } from "./types";
import type { EnrichedWorkOrder } from "./work-order-utils";
import {
  entriesDueOnDate,
  entriesOnDate,
  entriesStartingOnDate,
  toCalendarEntries,
  type PartnerWorkCalendarEntry,
} from "./partner-work-calendar-utils";

export interface ExperienceCalendarEvent {
  campaign: ExperienceCampaign;
  date: string;
  kind: "visit" | "proposal";
}

export interface ContractCalendarDayItem {
  kind: "work_start" | "work_due" | "work_range" | "experience_visit" | "experience_proposal";
  label: string;
  sublabel?: string;
  colorClass: string;
  workEntry?: PartnerWorkCalendarEntry;
  experienceEvent?: ExperienceCalendarEvent;
}

export function buildExperienceCalendarEvents(
  campaigns: ExperienceCampaign[],
): ExperienceCalendarEvent[] {
  const events: ExperienceCalendarEvent[] = [];
  for (const campaign of campaigns) {
    if (campaign.schedulingStatus === "cancelled") continue;
    if (campaign.confirmedVisitDate) {
      events.push({
        campaign,
        date: campaign.confirmedVisitDate,
        kind: "visit",
      });
    }
    for (const proposal of campaign.proposals) {
      if (proposal.status === "pending") {
        events.push({
          campaign,
          date: proposal.visitDate,
          kind: "proposal",
        });
      }
    }
  }
  return events;
}

export function experienceEventsOnDate(
  events: ExperienceCalendarEvent[],
  date: string,
): ExperienceCalendarEvent[] {
  return events.filter((e) => e.date === date);
}

export function buildContractCalendarDayItems(
  workOrders: EnrichedWorkOrder[],
  experienceCampaigns: ExperienceCampaign[],
  date: string,
): ContractCalendarDayItem[] {
  const items: ContractCalendarDayItem[] = [];
  const entries = toCalendarEntries(workOrders);
  const expEvents = buildExperienceCalendarEvents(experienceCampaigns);

  for (const entry of entriesStartingOnDate(entries, date)) {
    items.push({
      kind: "work_start",
      label: entry.order.title,
      sublabel: "업무 시작",
      colorClass: "bg-cyan-500/20 text-cyan-300 ring-cyan-500/30",
      workEntry: entry,
    });
  }
  for (const entry of entriesDueOnDate(entries, date)) {
    items.push({
      kind: "work_due",
      label: entry.order.title,
      sublabel: "마감",
      colorClass: "bg-amber-500/20 text-amber-300 ring-amber-500/30",
      workEntry: entry,
    });
  }
  for (const entry of entriesOnDate(entries, date)) {
    if (entry.startDate === date || entry.endDate === date) continue;
    items.push({
      kind: "work_range",
      label: entry.order.title,
      sublabel: "진행 중",
      colorClass: "bg-zinc-700/40 text-zinc-300 ring-zinc-600/30",
      workEntry: entry,
    });
  }

  for (const event of experienceEventsOnDate(expEvents, date)) {
    if (event.kind === "visit") {
      items.push({
        kind: "experience_visit",
        label: event.campaign.title,
        sublabel: `체험 확정 · ${event.campaign.participants.length}/${event.campaign.criteria.targetHeadcount}명`,
        colorClass: "bg-amber-500/25 text-amber-200 ring-amber-500/40",
        experienceEvent: event,
      });
    } else {
      items.push({
        kind: "experience_proposal",
        label: event.campaign.title,
        sublabel: "일정 제안 (조율 중)",
        colorClass: "bg-violet-500/20 text-violet-300 ring-violet-500/30",
        experienceEvent: event,
      });
    }
  }

  return items;
}

export function countCalendarMarkersOnDate(
  workOrders: EnrichedWorkOrder[],
  experienceCampaigns: ExperienceCampaign[],
  date: string,
): number {
  const entries = toCalendarEntries(workOrders);
  const expEvents = experienceEventsOnDate(
    buildExperienceCalendarEvents(experienceCampaigns),
    date,
  );
  const workCount = entriesOnDate(entries, date).length;
  return workCount + expEvents.length;
}

export { toCalendarEntries, entriesOnDate };
