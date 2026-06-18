import type { AppData, Contract, PartnerReferralLead, PipelineCategory } from "./types";
import { getPipelineCategory } from "./contract-lifecycle";
import {
  createDefaultPeriodFilter,
  matchesPeriodDate,
  periodFilterLabel,
  type PeriodFilterValue,
} from "./date-filter-utils";
import { PIPELINE_CATEGORY_LABELS } from "./types";
import { getCompletionRate } from "./selectors";

export const REFERRAL_COMMISSION_RATE = 0.1;

export function calcReferralCommission(monthlyFee: number): number {
  return Math.round(monthlyFee * REFERRAL_COMMISSION_RATE);
}

export function getPartnerReferralLeads(
  data: AppData,
  partnerId: string,
): PartnerReferralLead[] {
  return (data.partnerReferralLeads ?? [])
    .filter((lead) => lead.partnerId === partnerId)
    .sort((a, b) => b.introducedAt.localeCompare(a.introducedAt));
}

export function getPartnerReferralContracts(
  data: AppData,
  partnerId: string,
): Contract[] {
  return data.contracts.filter(
    (c) => c.hasReferralPromo && c.referrerPartnerId === partnerId,
  );
}

export type PartnerReferralRowStatus =
  | "registered"
  | PipelineCategory
  | "terminated";

export interface PartnerReferralRow {
  id: string;
  leadId?: string;
  contractId?: string;
  clientName: string;
  introducedAt: string;
  memo: string;
  monthlyFee: number;
  commission: number;
  status: PartnerReferralRowStatus;
  statusLabel: string;
  progressPercent?: number;
}

export function resolvePartnerReferralStatus(
  contract: Contract | undefined,
): { status: PartnerReferralRowStatus; label: string } {
  if (!contract) {
    return { status: "registered", label: "등록 · 계약 대기" };
  }
  if (contract.status === "terminated") {
    return { status: "terminated", label: "계약 종료" };
  }
  const pipeline = getPipelineCategory(contract);
  return {
    status: pipeline,
    label: PIPELINE_CATEGORY_LABELS[pipeline],
  };
}

export function buildPartnerReferralRows(
  data: AppData,
  partnerId: string,
): PartnerReferralRow[] {
  const leads = getPartnerReferralLeads(data, partnerId);
  const contracts = getPartnerReferralContracts(data, partnerId);
  const contractById = new Map(contracts.map((c) => [c.id, c]));
  const linkedContractIds = new Set<string>();

  const rows: PartnerReferralRow[] = leads.map((lead) => {
    const contract = lead.contractId
      ? data.contracts.find((c) => c.id === lead.contractId)
      : undefined;
    if (lead.contractId) linkedContractIds.add(lead.contractId);
    const monthlyFee = contract?.monthlyFee ?? lead.estimatedMonthlyFee ?? 0;
    const { status, label } = resolvePartnerReferralStatus(contract);
    return {
      id: lead.id,
      leadId: lead.id,
      contractId: lead.contractId,
      clientName: lead.clientName,
      introducedAt: lead.introducedAt,
      memo: lead.memo,
      monthlyFee,
      commission: calcReferralCommission(monthlyFee),
      status,
      statusLabel: label,
      progressPercent: contract
        ? Math.round(getCompletionRate(data, contract))
        : undefined,
    };
  });

  for (const contract of contracts) {
    if (linkedContractIds.has(contract.id)) continue;
    const { status, label } = resolvePartnerReferralStatus(contract);
    rows.push({
      id: `contract-${contract.id}`,
      contractId: contract.id,
      clientName: contract.clientName,
      introducedAt: contract.contractStartDate,
      memo: "계약 연동 · 리셀러 프로모션",
      monthlyFee: contract.monthlyFee,
      commission: calcReferralCommission(contract.monthlyFee),
      status,
      statusLabel: label,
    });
  }

  return rows.sort((a, b) => b.introducedAt.localeCompare(a.introducedAt));
}

export function filterPartnerReferralRows(
  rows: PartnerReferralRow[],
  filter: PeriodFilterValue,
): PartnerReferralRow[] {
  return rows.filter((row) => matchesPeriodDate(row.introducedAt, filter));
}

export function summarizePartnerReferralRows(rows: PartnerReferralRow[]) {
  const totalMonthlyFee = rows.reduce((sum, row) => sum + row.monthlyFee, 0);
  const totalCommission = rows.reduce((sum, row) => sum + row.commission, 0);
  const contracted = rows.filter((row) => row.contractId).length;
  return {
    count: rows.length,
    contracted,
    pending: rows.length - contracted,
    totalMonthlyFee,
    totalCommission,
  };
}

export function partnerReferralRowsForPipeline(
  rows: PartnerReferralRow[],
  category: PipelineCategory,
): PartnerReferralRow[] {
  return rows.filter((row) => row.status === category);
}

export {
  createDefaultPeriodFilter,
  matchesPeriodDate,
  periodFilterLabel,
  type PeriodFilterValue,
};
