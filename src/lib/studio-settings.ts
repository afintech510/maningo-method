import { createAdminClient } from '@/lib/supabase/admin';

export const STUDIO_SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export interface StudioSettings {
  booking_horizon_days: number;
}

const DEFAULTS: StudioSettings = {
  booking_horizon_days: 30,
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

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('studio_settings')
    .select('booking_horizon_days')
    .eq('id', STUDIO_SETTINGS_ID)
    .maybeSingle();

  const value: StudioSettings = {
    booking_horizon_days: data?.booking_horizon_days ?? DEFAULTS.booking_horizon_days,
  };
  cached = { value, at: now };
  return value;
}

/** Invalidate after the admin writes new values so the next read picks them up. */
export function invalidateStudioSettingsCache() {
  cached = null;
}
