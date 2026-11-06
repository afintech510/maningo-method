import { describe, it, expect } from 'vitest';
import { formatStudioDate } from '@/lib/timezone';
import { OUTCAST_COLLAB, PARTNER_EVENTS } from '@/lib/partner-events';

// The schedule files a partner event under `day`, but shows `startsAt` on the
// card, so the two must agree in studio time.
describe('partner events', () => {
  it('starts on the day it is filed under, in studio time', () => {
    for (const e of PARTNER_EVENTS) {
      expect(formatStudioDate(e.startsAt, 'yyyy-MM-dd')).toBe(e.day);
    }
  });

  it('puts the Outcast collab at 9:30 AM Eastern on Nov 29', () => {
    // EST (UTC-5) — DST has ended by late November.
    expect(OUTCAST_COLLAB.startsAt.toISOString()).toBe('2026-11-29T14:30:00.000Z');
  });
});
