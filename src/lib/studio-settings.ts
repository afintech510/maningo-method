import { createAdminClient } from '@/lib/supabase/admin';

export const STUDIO_SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export interface StudioSettings {
  booking_horizon_days: number;
  /** Master switch for selling new credits. See src/lib/purchases.ts. */
  purchases_enabled: boolean;
}

const DEFAULTS: StudioSettings = {
  booking_horizon_days: 30,
  // Default true so migration 044 is a no-op until the switch is flipped, and
  // so a settings-read failure never silently stops the studio selling.
  purchases_enabled: true,
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
    // `select('*')` rather than naming columns: if migration 044 hasn't been
    // applied yet, naming purchases_enabled would error the whole query and
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
  };
  cached = { value, at: now };
  return value;
}

/** Invalidate after the admin writes new values so the next read picks them up. */
export function invalidateStudioSettingsCache() {
  cached = null;
}
