import { describe, it, expect } from 'vitest';
import {
  calcProjections,
  profitAtFillRate,
  DEFAULT_PARAMS,
  WEEKS_PER_MONTH,
} from '@/lib/projections';

describe('calcProjections', () => {
  it('computes the default scenario correctly', () => {
    const r = calcProjections(DEFAULT_PARAMS);
    // 8 classes * 20 seats * 0.6 fill = 96 weekly visits → 96 * 4.33 ≈ 415.68 monthly
    expect(r.weeklyVisits).toBeCloseTo(96, 4);
    expect(r.monthlyVisits).toBeCloseTo(96 * WEEKS_PER_MONTH, 4);
    // gross = monthly visits * $20
    expect(r.grossRevenue).toBeCloseTo(96 * WEEKS_PER_MONTH * 20, 2);
    // processing 3% of gross
    expect(r.processingFee).toBeCloseTo(r.grossRevenue * 0.03, 2);
    // fixed = 2000 + 125 + 200 + 300 + 0 + 0
    expect(r.fixedExpenses).toBe(2625);
  });

  it('returns negative profit when expenses exceed revenue', () => {
    const r = calcProjections({ ...DEFAULT_PARAMS, fillRate: 0.05, venue: 5000 });
    expect(r.monthlyProfit).toBeLessThan(0);
  });

  it('computes break-even fill rate within (0, 1] for a realistic scenario', () => {
    const r = calcProjections(DEFAULT_PARAMS);
    expect(r.breakEvenFillRate).not.toBeNull();
    expect(r.breakEvenFillRate!).toBeGreaterThan(0);
    expect(r.breakEvenFillRate!).toBeLessThanOrEqual(1);
  });

  it('returns null break-even when capacity * price * (1 - processing) is zero', () => {
    const r = calcProjections({ ...DEFAULT_PARAMS, pricePerClass: 0 });
    expect(r.breakEvenFillRate).toBeNull();
  });

  it('members-needed scales with weekly visits', () => {
    const half = calcProjections({ ...DEFAULT_PARAMS, fillRate: 0.3 });
    const full = calcProjections({ ...DEFAULT_PARAMS, fillRate: 0.6 });
    expect(full.membersNeeded).toBeCloseTo(half.membersNeeded * 2, 3);
  });

  it('profit at break-even fill rate is ~0', () => {
    const r = calcProjections(DEFAULT_PARAMS);
    expect(r.breakEvenFillRate).not.toBeNull();
    const atBreakEven = profitAtFillRate(DEFAULT_PARAMS, r.breakEvenFillRate!);
    expect(Math.abs(atBreakEven)).toBeLessThan(0.01);
  });
});
