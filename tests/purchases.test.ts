import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// getStudioSettings hits Supabase, so stub it and drive the flags directly.
const getStudioSettings = vi.hoisted(() => vi.fn());
vi.mock('@/lib/studio-settings', () => ({ getStudioSettings }));

import {
  getPurchaseAvailability,
  arePurchasesEnabled,
  isPackSellable,
  areGiftsSellable,
  packClosedGuard,
  giftClosedGuard,
  PURCHASES_CLOSED_MESSAGE,
} from '@/lib/purchases';

function settings(opts: {
  purchases_enabled?: boolean;
  sellable_pack_types?: string[];
  gift_purchases_enabled?: boolean;
}) {
  getStudioSettings.mockResolvedValue({
    booking_horizon_days: 30,
    purchases_enabled: opts.purchases_enabled ?? true,
    sellable_pack_types: opts.sellable_pack_types ?? ['single', '5pack', '10pack'],
    gift_purchases_enabled: opts.gift_purchases_enabled ?? true,
  });
}

beforeEach(() => {
  getStudioSettings.mockReset();
});

describe('master switch', () => {
  it('off means nothing at all is sellable', async () => {
    settings({ purchases_enabled: false });
    const a = await getPurchaseAvailability();
    expect(a.enabled).toBe(false);
    expect(a.sellablePacks).toEqual([]);
    expect(a.anyPackSellable).toBe(false);
    expect(a.giftsEnabled).toBe(false);
  });

  it('off overrides a permissive pack list', async () => {
    settings({ purchases_enabled: false, sellable_pack_types: ['single', '5pack', '10pack'] });
    expect(await isPackSellable('single')).toBe(false);
    expect(await areGiftsSellable()).toBe(false);
  });

  it('on with everything allowed sells everything', async () => {
    settings({});
    const a = await getPurchaseAvailability();
    expect(a.sellablePacks).toEqual(['single', '5pack', '10pack']);
    expect(a.giftsEnabled).toBe(true);
    expect(await arePurchasesEnabled()).toBe(true);
  });
});

// The state the studio actually runs in right now.
describe('drop-in only', () => {
  beforeEach(() => {
    settings({ sellable_pack_types: ['single'], gift_purchases_enabled: false });
  });

  it('sells the drop-in', async () => {
    expect(await isPackSellable('single')).toBe(true);
    expect(await packClosedGuard('single')).toBeNull();
  });

  it('refuses both multi-packs', async () => {
    expect(await isPackSellable('5pack')).toBe(false);
    expect(await isPackSellable('10pack')).toBe(false);
    expect(await packClosedGuard('5pack')).not.toBeNull();
    expect(await packClosedGuard('10pack')).not.toBeNull();
  });

  it('refuses gift cards, which are prepaid credits', async () => {
    expect(await areGiftsSellable()).toBe(false);
    expect(await giftClosedGuard()).not.toBeNull();
  });

  it('still reports something is on sale', async () => {
    expect((await getPurchaseAvailability()).anyPackSellable).toBe(true);
  });
});

// The 7-pack has no admin tickbox: its fixed sale window plus the master
// switch decide. Clock pinned so these don't depend on when the suite runs.
describe('October 7-pack', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const BEFORE = new Date('2026-09-30T12:00:00-04:00');
  const DURING = new Date('2026-10-02T12:00:00-04:00');
  const AFTER = new Date('2026-10-05T12:00:00-04:00');

  it('is sellable during the window even with no pack tickboxes on', async () => {
    vi.useFakeTimers({ now: DURING });
    settings({ sellable_pack_types: [] });
    expect(await isPackSellable('7pack')).toBe(true);
    expect(await packClosedGuard('7pack')).toBeNull();
  });

  it('is refused before and after the window', async () => {
    settings({});
    vi.useFakeTimers({ now: BEFORE });
    expect(await isPackSellable('7pack')).toBe(false);
    vi.setSystemTime(AFTER);
    expect(await isPackSellable('7pack')).toBe(false);
    expect(await packClosedGuard('7pack')).not.toBeNull();
  });

  it('obeys the master switch during the window', async () => {
    vi.useFakeTimers({ now: DURING });
    settings({ purchases_enabled: false });
    expect(await isPackSellable('7pack')).toBe(false);
  });

  it('never shows up in the tickbox-driven pack list', async () => {
    vi.useFakeTimers({ now: DURING });
    settings({});
    expect((await getPurchaseAvailability()).sellablePacks).not.toContain('7pack');
  });
});

describe('guards', () => {
  it('blocks with 503 + PURCHASES_DISABLED and leaks no reason', async () => {
    settings({ sellable_pack_types: ['single'] });
    const res = await packClosedGuard('10pack');
    expect(res!.status).toBe(503);

    const body = await res!.json();
    expect(body.error.code).toBe('PURCHASES_DISABLED');
    expect(body.error.message).toBe(PURCHASES_CLOSED_MESSAGE);
  });

  it('treats an unknown or missing pack type as not sellable', async () => {
    settings({});
    expect(await isPackSellable('20pack')).toBe(false);
    expect(await isPackSellable(undefined)).toBe(false);
    expect(await packClosedGuard(undefined)).not.toBeNull();
  });

  it('never explains why selling stopped', async () => {
    const forbidden = /landlord|chelsea|studio use|evict|lease|closing|moving/i;
    expect(PURCHASES_CLOSED_MESSAGE).not.toMatch(forbidden);
  });
});
