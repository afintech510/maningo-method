import { describe, it, expect } from 'vitest';
import { parseStripeEnabled } from '@/lib/feature-flags';

describe('parseStripeEnabled', () => {
  it('defaults to true when value is undefined', () => {
    expect(parseStripeEnabled(undefined)).toBe(true);
  });

  it('returns false for "false" (case-insensitive)', () => {
    expect(parseStripeEnabled('false')).toBe(false);
    expect(parseStripeEnabled('FALSE')).toBe(false);
    expect(parseStripeEnabled('False')).toBe(false);
  });

  it('returns true for any other value', () => {
    expect(parseStripeEnabled('true')).toBe(true);
    expect(parseStripeEnabled('1')).toBe(true);
    expect(parseStripeEnabled('')).toBe(true);
    expect(parseStripeEnabled('yes')).toBe(true);
  });
});
