import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  OCTOBER_7PACK,
  hasClaimedOctober7Pack,
  promoPhase,
  isPromoPurchasable,
} from '@/lib/promos';

// October 2026 is EDT (UTC-4), so ET wall-clock + 4h = UTC.
const SEP_30_2359_ET = new Date('2026-10-01T03:59:59.000Z');
const OCT_1_0000_ET = new Date('2026-10-01T04:00:00.000Z');
const OCT_4_2359_ET = new Date('2026-10-05T03:59:59.000Z');
const OCT_5_0000_ET = new Date('2026-10-05T04:00:00.000Z');

describe('October 7-pack promo window', () => {
  it('has the agreed offer terms', () => {
    expect(OCTOBER_7PACK.credits).toBe(7);
    expect(OCTOBER_7PACK.amountCents).toBe(11900);
    // $17.00 a class exactly — the marketing hook.
    expect(OCTOBER_7PACK.amountCents / OCTOBER_7PACK.credits).toBe(1700);
  });

  it('converts the studio wall-clock window to the right UTC instants', () => {
    expect(OCTOBER_7PACK.saleStartsAt.toISOString()).toBe('2026-10-01T04:00:00.000Z');
    expect(OCTOBER_7PACK.saleEndsAt.toISOString()).toBe('2026-10-05T04:00:00.000Z');
  });

  it('teaser at Sept 30 23:59 ET', () => {
    expect(promoPhase(SEP_30_2359_ET)).toBe('teaser');
    expect(isPromoPurchasable(SEP_30_2359_ET)).toBe(false);
  });

  it('live the instant Oct 1 00:00 ET arrives', () => {
    expect(promoPhase(OCT_1_0000_ET)).toBe('live');
    expect(isPromoPurchasable(OCT_1_0000_ET)).toBe(true);
  });

  it('still live at Oct 4 23:59 ET', () => {
    expect(promoPhase(OCT_4_2359_ET)).toBe('live');
    expect(isPromoPurchasable(OCT_4_2359_ET)).toBe(true);
  });

  it('ended the instant Oct 5 00:00 ET arrives', () => {
    expect(promoPhase(OCT_5_0000_ET)).toBe('ended');
    expect(isPromoPurchasable(OCT_5_0000_ET)).toBe(false);
  });

  it('is unaffected by the host timezone', () => {
    // These are absolute instants; the whole point of fromZonedTime is that
    // the answer is identical whether the box runs UTC or US/Pacific. The
    // suite is run under both TZs, and this pins the resolved instant.
    expect(new Date('2026-10-01T04:00:00.000Z').getTime()).toBe(
      OCTOBER_7PACK.saleStartsAt.getTime()
    );
  });
});

/**
 * Stub of the fluent PostgREST builder — every filter returns `this`, and
 * awaiting it yields whatever rows the named table was seeded with. Enough to
 * exercise the branching in hasClaimedOctober7Pack without a live database.
 */
function fakeSupabase(rows: Record<string, unknown[]>, failOn?: string) {
  return {
    from(table: string) {
      const builder: Record<string, unknown> = {};
      for (const fn of ['select', 'eq', 'in', 'limit']) {
        builder[fn] = () => builder;
      }
      builder.then = (resolve: (v: unknown) => unknown) =>
        resolve(
          failOn === table
            ? { data: null, error: new Error(`boom: ${table}`) }
            : { data: rows[table] ?? [], error: null }
        );
      return builder;
    },
  } as unknown as SupabaseClient;
}

describe('October 7-pack one-per-member check', () => {
  const STUDENT = '00000000-0000-0000-0000-000000000001';

  it('allows a member who has never claimed it', async () => {
    const db = fakeSupabase({ credit_purchases: [], manual_payments: [] });
    expect(await hasClaimedOctober7Pack(db, STUDENT)).toBe(false);
  });

  it('blocks a member who already bought it on card', async () => {
    const db = fakeSupabase({ credit_purchases: [{ id: 'p1' }], manual_payments: [] });
    expect(await hasClaimedOctober7Pack(db, STUDENT)).toBe(true);
  });

  // The important one: cash grants the pack provisionally at submission, so a
  // pending manual payment must block the card route too — otherwise it's 14
  // credits for $119.
  it('blocks a member with only a pending/paid cash request', async () => {
    const db = fakeSupabase({ credit_purchases: [], manual_payments: [{ id: 'm1' }] });
    expect(await hasClaimedOctober7Pack(db, STUDENT)).toBe(true);
  });

  it('fails loud on a query error rather than waving the purchase through', async () => {
    const db = fakeSupabase({ credit_purchases: [], manual_payments: [] }, 'manual_payments');
    await expect(hasClaimedOctober7Pack(db, STUDENT)).rejects.toThrow('boom');
  });
});
