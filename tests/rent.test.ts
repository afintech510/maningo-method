import { describe, it, expect } from 'vitest';
import { computeMonthRent, WEEKDAY_RATE_CENTS, WEEKEND_RATE_CENTS, currentStudioMonth } from '@/lib/rent';

// Studio is America/New_York. Build ISO strings that resolve to 8 AM ET so
// DST math doesn't drift across runs.
function et(yyyy: number, mm: number, dd: number, hh = 8): string {
  // Aug → EDT (UTC-4) → 8 AM ET is 12:00 UTC
  // Feb → EST (UTC-5) → 8 AM ET is 13:00 UTC
  const isDst = mm >= 3 && mm <= 10; // approximation good enough for these dates
  const offset = isDst ? 4 : 5;
  const utc = new Date(Date.UTC(yyyy, mm - 1, dd, hh + offset, 0));
  return utc.toISOString();
}

describe('computeMonthRent', () => {
  it('counts each class as 1 hour regardless of duration', () => {
    const classes = [
      { starts_at: et(2026, 6, 2, 8) }, // Tue (weekday)
      { starts_at: et(2026, 6, 4, 8) }, // Thu (weekday)
      { starts_at: et(2026, 6, 6, 8) }, // Sat (weekend)
    ];
    const r = computeMonthRent(classes, 2026, 6);
    expect(r.weekday_hours).toBe(2);
    expect(r.weekend_hours).toBe(1);
    expect(r.class_count).toBe(3);
    expect(r.total_cents).toBe(2 * WEEKDAY_RATE_CENTS + 1 * WEEKEND_RATE_CENTS);
  });

  it('ignores classes outside the target month', () => {
    const classes = [
      { starts_at: et(2026, 5, 30, 8) }, // May
      { starts_at: et(2026, 6, 2, 8) },  // June
      { starts_at: et(2026, 7, 1, 8) },  // July
    ];
    const r = computeMonthRent(classes, 2026, 6);
    expect(r.class_count).toBe(1);
  });

  it('handles a DST boundary month (March)', () => {
    // Spring-forward in 2026 is Mar 8. Class on Mar 7 (Sat, EST) and Mar 9 (Mon, EDT).
    const classes = [
      { starts_at: et(2026, 3, 7, 8) },  // Sat (EST) → weekend
      { starts_at: et(2026, 3, 9, 8) },  // Mon (EDT) → weekday
    ];
    const r = computeMonthRent(classes, 2026, 3);
    expect(r.weekday_hours).toBe(1);
    expect(r.weekend_hours).toBe(1);
  });

  it('returns zeros for an empty month', () => {
    const r = computeMonthRent([], 2026, 6);
    expect(r.weekday_hours).toBe(0);
    expect(r.weekend_hours).toBe(0);
    expect(r.class_count).toBe(0);
    expect(r.total_cents).toBe(0);
  });

  it('respects custom rates', () => {
    const classes = [{ starts_at: et(2026, 6, 2, 8) }]; // Tue
    const r = computeMonthRent(classes, 2026, 6, { weekday: 5000, weekend: 9000 });
    expect(r.total_cents).toBe(5000);
  });
});

describe('currentStudioMonth', () => {
  it('returns 1-indexed month', () => {
    // Fix `now` to mid-month in ET. 2026-06-15 12:00 UTC = 8 AM ET → June.
    const m = currentStudioMonth(new Date('2026-06-15T12:00:00.000Z'));
    expect(m.year).toBe(2026);
    expect(m.month).toBe(6);
  });
});
