import type { Contract, Expense, Partner } from "./types";
import type { BonusPolicySettings } from "./types";
import { seedPercent } from "./seed-data-generator";

/** 실제 운영 규모 — 43개 · 월 매출 6,000만 · 원가율 30% */
export const PORTFOLIO_CONTRACT_COUNT = 43;
export const PORTFOLIO_MONTHLY_REVENUE = 60_000_000;
export const PORTFOLIO_COST_RATIO = 0.3;

/** c-9~c-43 자동 생성용 업종·지역명 */
const EXTENDED_CLIENT_NAMES = [
  "강릉커피거리",
  "대구동성로식당",
  "전주한옥마을숙소",
  "여수밤바다횟집",
  "춘천닭갈비골",
  "포항과메기집",
  "통영케이블카리조트",
  "안동찜닭거리",
  "목포갈치타운",
  "순천만민박",
  "진주성곽카페",
  "원주빙수골",
  "충주호펜션",
  "청주상당맛집",
  "천안불당카페",
  "아산온천호텔",
  "공주한옥스테이",
  "보령머드축제숙소",
  "군산근대골목카페",
  "익산미륵사맛집",
  "정읍내장산펜션",
  "남원춘향테마파크",
  "광주양림동카페",
  "담양죽녹원카페",
  "보성녹차마을",
  "거제해금강리조트",
  "양양서핑펜션",
  "평창스키리조트",
  "경주황리단길카페",
  "수원행궁동카페",
  "용인보정동카페",
  "일산호수공원식당",
  "분당정자동뷰티",
  "판교테크밸리식당",
  "인천차이나타운",
  "김포한강뷰카페",
  "파주출판단지카페",
  "의정부부대찌개거리",
  "화성동탄신도시카페",
  "평택항횟집",
  "이천쌀마을식당",
  "가평자라섬카페",
  "춘천남이섬카페",
  "제주협재해변카페",
  "제주성산일출펜션",
  "제주애월카페",
  "제주서귀포호텔",
  "제주함덕서핑",
  "제주중문리조트",
  "제주우도펜션",
  "제주한림카페",
  "제주동문시장맛집",
  "제주올레시장식당",
  "제주테디베어카페",
  "제주신화월드맛집",
  "제주산방산맛집",
  "제주4·3평화공원카페",
] as const;

/** 포트폴리오 시나리오 — sample-client-seed의 큐레이션 + 확장 */
export interface PortfolioScenarioInput {
  id: string;
  name: string;
  index: number;
  monthlyFee: number;
  targetOptimized: number;
  targetInfluencer: number;
  targetExperience: number;
  targetInstaCard: number;
  hasPlaceSetting: boolean;
  isExtension: boolean;
  hasReferralPromo: boolean;
  referrerPartnerId?: string;
  assignedStaffId?: string;
  teamId?: string;
  status: "active" | "terminated";
  contractEndDate: string | ((demoToday: string, monthEnd: string) => string);
  contractStartMonthsAgo: number;
  renewalMonthCount: number;
  clientDepositStatus?: Contract["clientDepositStatus"];
  lastClientDepositDate?: string | ((monthStart: string) => string);
  terminationReason?: Contract["terminationReason"];
}

/** 활성 계약 monthlyFee 합을 목표 매출에 맞게 조정 */
export function scaleActiveMonthlyFees(
  scenarios: PortfolioScenarioInput[],
  targetTotal: number,
): void {
  const active = scenarios.filter((s) => s.status === "active");
  const rawSum = active.reduce((s, c) => s + c.monthlyFee, 0);
  if (rawSum <= 0 || active.length === 0) return;

  let allocated = 0;
  active.forEach((scenario, i) => {
    if (i === active.length - 1) {
      scenario.monthlyFee = Math.max(400_000, targetTotal - allocated);
      return;
    }
    const scaled = Math.round((scenario.monthlyFee / rawSum) * targetTotal);
    scenario.monthlyFee = Math.max(400_000, scaled);
    allocated += scenario.monthlyFee;
  });
}

/** c-9 ~ c-43 확장 시나리오 생성 */
export function buildExtendedPortfolioScenarios(
  startIndex: number,
  endIndex: number,
): PortfolioScenarioInput[] {
  const scenarios: PortfolioScenarioInput[] = [];

  for (let n = startIndex; n <= endIndex; n += 1) {
    const index = n - 1;
    const nameIdx = (n - startIndex) % EXTENDED_CLIENT_NAMES.length;
    const feeWeight = 0.88 + (seedPercent(n, "fee") % 25) / 100;
    const baseFee = Math.round(1_400_000 * feeWeight);

    scenarios.push({
      id: `c-${n}`,
      name: EXTENDED_CLIENT_NAMES[nameIdx] ?? `데모고객 ${n}`,
      index,
      monthlyFee: baseFee,
      targetOptimized: 5 + (index % 6),
      targetInfluencer: 3 + (index % 4),
      targetExperience: 4 + (index % 5),
      targetInstaCard: 2 + (index % 4),
      hasPlaceSetting: index % 4 !== 3,
      isExtension: index % 3 !== 0,
      hasReferralPromo: index % 5 === 4,
      ...(index % 5 === 4 && { referrerPartnerId: "p-referral-1" }),
      status: "active",
      contractEndDate: (_demoToday, monthEnd) => monthEnd,
      contractStartMonthsAgo: 2 + (index % 12),
      renewalMonthCount:
        index % 10 < 6 ? 4 + (index % 4) : 1 + (index % 3),
      clientDepositStatus: index % 11 === 0 ? "overdue" : "completed",
      lastClientDepositDate: (monthStart) => monthStart,
    });
  }

  return scenarios;
}

/** 원가 합계를 매출의 30%에 맞춰 건별 expenses 생성 */
export function buildPortfolioExpenses(
  contracts: Contract[],
  partners: Partner[],
  monthStart: string,
  addDaysFn: (iso: string, days: number) => string,
): Expense[] {
  const pressPartner = partners.find((p) => p.id === "p-press-1");
  const expPartner = partners.find((p) => p.id === "p-exp-1");
  if (!pressPartner || !expPartner) return [];

  const active = contracts.filter((c) => c.status === "active");
  const totalRevenue = active.reduce((s, c) => s + c.monthlyFee, 0);
  const targetCost = Math.round(totalRevenue * PORTFOLIO_COST_RATIO);

  const expenses: Expense[] = [];
  let allocated = 0;

  active.forEach((c, i) => {
    const contractCost =
      i === active.length - 1
        ? targetCost - allocated
        : Math.round((c.monthlyFee / totalRevenue) * targetCost);
    allocated += contractCost;

    const pressAmount = Math.round(contractCost * 0.58);
    const expAmount = contractCost - pressAmount;
    const requestDay = addDaysFn(monthStart, 3 + (i % 10));
    const expRequestDay = addDaysFn(monthStart, 5 + (i % 8));
    const statusCycle = i % 5;
    const pressStatus =
      statusCycle === 0
        ? "unpaid"
        : statusCycle === 1
          ? "pending_approval"
          : statusCycle === 2
            ? "pending_transfer"
            : "paid";
    const expStatus = i % 4 === 0 ? "unpaid" : "paid";

    expenses.push(
      {
        id: `e-${c.id}-press`,
        contractId: c.id,
        category: "press",
        description: `기자단 집행 (${requestDay.slice(5)} 신청)`,
        amount: pressAmount,
        bankAccount: pressPartner.bankAccount,
        accountHolder: pressPartner.accountHolder,
        partnerId: pressPartner.id,
        paymentDueDate: addDaysFn(requestDay, 10),
        payoutStatus: pressStatus,
        ...(pressStatus === "pending_approval"
          ? {
              payoutRequestedBy: c.assignedStaffId,
              payoutRequestedAt: addDaysFn(requestDay, 2),
            }
          : {}),
        ...(pressStatus === "pending_transfer" || pressStatus === "paid"
          ? {
              payoutRequestedBy: c.assignedStaffId,
              payoutRequestedAt: addDaysFn(requestDay, 2),
              payoutApprovedBy: "u-exec-1",
              payoutApprovedAt: addDaysFn(requestDay, 4),
            }
          : {}),
      },
      {
        id: `e-${c.id}-exp`,
        contractId: c.id,
        category: "experience",
        description: `체험단 원고비 (${expRequestDay.slice(5)} 집행)`,
        amount: expAmount,
        bankAccount: expPartner.bankAccount,
        accountHolder: expPartner.accountHolder,
        partnerId: expPartner.id,
        paymentDueDate: addDaysFn(expRequestDay, 7),
        payoutStatus: expStatus,
      },
    );
  });

  return expenses;
}

/** 실무 기준 성과급 정책 — 임원 15% · 팀장+담당 5% · 리셀러 10% 별도 */
export function portfolioBonusPolicy(): BonusPolicySettings {
  return {
    executiveMaxPercent: { "u-exec-1": 15 },
    teamLeaderMaxPercent: {
      "u-leader-1": 5,
      "u-leader-2": 5,
    },
    staffPercent: {
      "u-staff-1": 2.5,
      "u-staff-2": 2,
      "u-staff-3": 2.5,
    },
  };
}
