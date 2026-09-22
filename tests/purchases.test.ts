import { describe, it, expect, vi, beforeEach } from 'vitest';

// getStudioSettings hits Supabase, so stub it and drive the flag directly.
const getStudioSettings = vi.hoisted(() => vi.fn());
vi.mock('@/lib/studio-settings', () => ({ getStudioSettings }));

import {
  arePurchasesEnabled,
  purchasesClosedGuard,
  PURCHASES_CLOSED_MESSAGE,
} from '@/lib/purchases';

function settings(purchases_enabled: boolean) {
  getStudioSettings.mockResolvedValue({ booking_horizon_days: 30, purchases_enabled });
}

beforeEach(() => {
  getStudioSettings.mockReset();
});

describe('arePurchasesEnabled', () => {
  it('is true when the studio has selling switched on', async () => {
    settings(true);
    expect(await arePurchasesEnabled()).toBe(true);
  });

  it('is false when the studio has selling switched off', async () => {
    settings(false);
    expect(await arePurchasesEnabled()).toBe(false);
  });
});

describe('purchasesClosedGuard', () => {
  it('lets the request through while selling is on', async () => {
    settings(true);
    expect(await purchasesClosedGuard()).toBeNull();
  });

  it('blocks with 503 + PURCHASES_DISABLED while selling is off', async () => {
    settings(false);
    const res = await purchasesClosedGuard();
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);

    const body = await res!.json();
    expect(body.error.code).toBe('PURCHASES_DISABLED');
    // The member-facing copy is deliberately the only thing we leak — no
    // mention of why the studio stopped selling.
    expect(body.error.message).toBe(PURCHASES_CLOSED_MESSAGE);
  });

  it('never explains why selling stopped', async () => {
    const forbidden = /landlord|chelsea|studio use|evict|lease|closing|moving/i;
    expect(PURCHASES_CLOSED_MESSAGE).not.toMatch(forbidden);
  });
});
