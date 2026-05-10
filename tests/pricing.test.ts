import { describe, it, expect } from 'vitest';
import {
  SERVICE_FEE_BPS,
  computeServiceFeeCents,
  withServiceFee,
  formatCents,
} from '@/lib/pricing';

describe('pricing', () => {
  it('SERVICE_FEE_BPS is 3% (300 basis points)', () => {
    expect(SERVICE_FEE_BPS).toBe(300);
  });

  it.each([
    // [base_cents, expected_fee_cents]
    [2500, 75], // drop-in
    [11200, 336], // 5-pack
    [20000, 600], // 10-pack
    [10000, 300], // round case
    [100, 3], // tiny
  ])('computeServiceFeeCents(%i) == %i', (base, fee) => {
    expect(computeServiceFeeCents(base)).toBe(fee);
  });

  it('returns 0 for invalid / non-positive amounts', () => {
    expect(computeServiceFeeCents(0)).toBe(0);
    expect(computeServiceFeeCents(-500)).toBe(0);
    expect(computeServiceFeeCents(NaN)).toBe(0);
    expect(computeServiceFeeCents(Infinity)).toBe(0);
  });

  it('withServiceFee returns base + fee + total', () => {
    expect(withServiceFee(11200)).toEqual({
      base_cents: 11200,
      fee_cents: 336,
      total_cents: 11536,
    });
  });

  it('formatCents formats US dollars with 2 decimals', () => {
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(2500)).toBe('$25.00');
    expect(formatCents(11536)).toBe('$115.36');
  });
});
