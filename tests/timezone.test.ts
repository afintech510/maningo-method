import { describe, it, expect } from 'vitest';
import { formatStudioDate, formatStudioTime, formatStudioDateTime } from '@/lib/timezone';

describe('timezone helpers', () => {
  // 8:00 AM Eastern on June 2, 2026 (DST = UTC-4) is 12:00 UTC
  const summerEt8am = '2026-06-02T12:00:00.000Z';

  it('formatStudioTime renders ET wall-clock regardless of host timezone', () => {
    expect(formatStudioTime(summerEt8am)).toBe('8:00 AM');
  });

  it('formatStudioDate renders ET-local day even from a UTC timestamp', () => {
    expect(formatStudioDate(summerEt8am)).toBe('Tue Jun 2');
    expect(formatStudioDate(summerEt8am, 'EEEE, MMMM d, yyyy')).toBe('Tuesday, June 2, 2026');
  });

  it('formatStudioDateTime combines both', () => {
    expect(formatStudioDateTime(summerEt8am)).toBe('Tue Jun 2 · 8:00 AM');
  });

  it('handles winter time (EST = UTC-5) correctly', () => {
    // 8:00 AM ET on Jan 15, 2026 = 13:00 UTC
    expect(formatStudioTime('2026-01-15T13:00:00.000Z')).toBe('8:00 AM');
  });

  it('a timestamp on the boundary of midnight ET reports the ET-local date', () => {
    // 11:30 PM ET on June 1 (DST) = 03:30 UTC on June 2 — must render Jun 1 ET
    expect(formatStudioDate('2026-06-02T03:30:00.000Z')).toBe('Mon Jun 1');
  });
});
