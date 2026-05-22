// Pure projection math — no React, no DOM, no side effects. Drives both the
// single-view and compare-mode admin Projections tab, and is unit-testable in
// isolation. All currency values are in DOLLARS for ergonomics; the existing
// app stores rent in cents but this tab is purely a what-if planner.

export const WEEKS_PER_MONTH = 4.33;

export interface ProjectionParams {
  label: string;
  classesPerWeek: number;
  maxSeats: number;
  fillRate: number; // 0..1
  avgVisitsPerMember: number; // visits per active member per week
  pricePerClass: number;
  packDiscount: number; // 0..1 informational only
  venue: number;
  processing: number; // 0..1
  bookingPlatform: number;
  insurance: number;
  marketing: number;
  instructor: number;
  otherLabel: string;
  other: number;
}

export interface ProjectionResult {
  weeklyVisits: number;
  monthlyVisits: number;
  grossRevenue: number;
  netRevenue: number;
  membersNeeded: number;
  fixedExpenses: number;
  processingFee: number;
  totalExpenses: number;
  monthlyProfit: number;
  profitMargin: number; // 0..1
  /** 0..1 fill rate at which monthly profit would be zero given current pricing/expenses. */
  breakEvenFillRate: number | null;
}

export const DEFAULT_PARAMS: ProjectionParams = {
  label: 'Current',
  classesPerWeek: 8,
  maxSeats: 20,
  fillRate: 0.6,
  avgVisitsPerMember: 1.5,
  pricePerClass: 20,
  packDiscount: 0,
  venue: 2000,
  processing: 0.03,
  bookingPlatform: 125,
  insurance: 200,
  marketing: 300,
  instructor: 0,
  otherLabel: 'Other',
  other: 0,
};

function sumFixed(p: ProjectionParams): number {
  return p.venue + p.bookingPlatform + p.insurance + p.marketing + p.instructor + p.other;
}

export function calcProjections(p: ProjectionParams): ProjectionResult {
  const weeklySeats = p.classesPerWeek * p.maxSeats;
  const weeklyVisits = weeklySeats * p.fillRate;
  const monthlyVisits = weeklyVisits * WEEKS_PER_MONTH;

  const grossRevenue = monthlyVisits * p.pricePerClass;
  const processingFee = grossRevenue * p.processing;
  const netRevenue = grossRevenue - processingFee;

  const fixedExpenses = sumFixed(p);
  const totalExpenses = fixedExpenses + processingFee;
  const monthlyProfit = netRevenue - fixedExpenses;
  const profitMargin = grossRevenue > 0 ? monthlyProfit / grossRevenue : 0;

  const membersNeeded =
    p.avgVisitsPerMember > 0 ? weeklyVisits / p.avgVisitsPerMember : 0;

  // Break-even fill rate solves netRevenue - fixedExpenses = 0:
  //   fillRate × maxSeats × classesPerWeek × WEEKS_PER_MONTH × price × (1 - processing)
  //   = fixedExpenses
  const monthlyCapacity = p.classesPerWeek * p.maxSeats * WEEKS_PER_MONTH;
  const perFillRevenueAtNet = monthlyCapacity * p.pricePerClass * (1 - p.processing);
  let breakEvenFillRate: number | null = null;
  if (perFillRevenueAtNet > 0) {
    breakEvenFillRate = fixedExpenses / perFillRevenueAtNet;
  }

  return {
    weeklyVisits,
    monthlyVisits,
    grossRevenue,
    netRevenue,
    membersNeeded,
    fixedExpenses,
    processingFee,
    totalExpenses,
    monthlyProfit,
    profitMargin,
    breakEvenFillRate,
  };
}

/** Profit at a given fill rate, holding every other param constant. Used to
 *  generate the fill-rate curve on the chart. */
export function profitAtFillRate(p: ProjectionParams, fillRate: number): number {
  return calcProjections({ ...p, fillRate }).monthlyProfit;
}
