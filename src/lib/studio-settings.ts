import { createAdminClient } from '@/lib/supabase/admin';

export const STUDIO_SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export interface StudioSettings {
  booking_horizon_days: number;
  /** Master switch for selling new credits. See src/lib/purchases.ts. */
  purchases_enabled: boolean;
  /** Which pack types may be bought, when the master switch allows it. */
  sellable_pack_types: string[];
  /** Gift cards are prepaid credits with no expiry, so they switch separately. */
  gift_purchases_enabled: boolean;
}

const DEFAULTS: StudioSettings = {
  booking_horizon_days: 30,
  // Defaults are permissive so migrations 044/045 are no-ops until the switches
  // are set, and so a settings-read failure never silently stops the studio
  // selling. The live values come from the DB row.
  purchases_enabled: true,
  sellable_pack_types: ['single', '5pack', '10pack'],
  gift_purchases_enabled: true,
};

let cached: { value: StudioSettings; at: number } | null = null;
const CACHE_TTL_MS = 30_000;

/**
 * Read the studio's tunable knobs. Cached for 30s server-side so /api/classes
 * doesn't pay a DB hit on every public schedule fetch.
 */
export async function getStudioSettings(): Promise<StudioSettings> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.value;

  // Wrapped: the public homepage reads this now, so a thrown client/network
  // error must degrade to defaults rather than 500 the marketing page.
  let data: Record<string, unknown> | null = null;
  try {
    const supabase = createAdminClient();
    // `select('*')` rather than naming columns: if migration 044/045 hasn't
    // been applied yet, naming a new column would error the whole query and
    // silently reset booking_horizon_days to its default too.
    const res = await supabase
      .from('studio_settings')
      .select('*')
      .eq('id', STUDIO_SETTINGS_ID)
      .maybeSingle();
    data = res.data;
  } catch {
    data = null;
  }

  const value: StudioSettings = {
    booking_horizon_days:
      (data?.booking_horizon_days as number | undefined) ?? DEFAULTS.booking_horizon_days,
    purchases_enabled:
      (data?.purchases_enabled as boolean | undefined) ?? DEFAULTS.purchases_enabled,
    // Postgres text[] arrives as a JS array; guard anyway so a malformed value
    // can't make every pack look unsellable.
    sellable_pack_types: Array.isArray(data?.sellable_pack_types)
      ? (data.sellable_pack_types as string[])
      : DEFAULTS.sellable_pack_types,
    gift_purchases_enabled:
      (data?.gift_purchases_enabled as boolean | undefined) ?? DEFAULTS.gift_purchases_enabled,
  };
  cached = { value, at: now };
  return value;
}

/** Invalidate after the admin writes new values so the next read picks them up. */
export function invalidateStudioSettingsCache() {
  cached = null;
}
