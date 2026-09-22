import { NextResponse } from 'next/server';
import { getStudioSettings } from '@/lib/studio-settings';

/**
 * Member-facing copy shown wherever a buy action used to be, and returned as
 * the API error message. Deliberately says nothing about WHY selling is off.
 * Change it here and every surface follows.
 */
export const PURCHASES_CLOSED_MESSAGE = 'Get in touch.';

export const STUDIO_PHONE = '(631) 252-5227';
export const STUDIO_PHONE_HREF = 'tel:+16312525227';
export const STUDIO_EMAIL = 'chelsea@maningomethod.com';

/**
 * Master switch for selling NEW credits — card packs, cash packs, promos, and
 * gift packs. Does not affect redeeming an existing gift code, booking with
 * credits already held, waitlists, or admin credit adjustments.
 */
export async function arePurchasesEnabled(): Promise<boolean> {
  const settings = await getStudioSettings();
  return settings.purchases_enabled;
}

/**
 * Guard for every route that takes money or mints credits. Returns a response
 * to return early, or null to continue.
 *
 *   const closed = await purchasesClosedGuard();
 *   if (closed) return closed;
 *
 * 503 rather than 400: the request is well-formed, the capability is just
 * unavailable right now.
 */
export async function purchasesClosedGuard(): Promise<NextResponse | null> {
  if (await arePurchasesEnabled()) return null;
  return NextResponse.json(
    { error: { code: 'PURCHASES_DISABLED', message: PURCHASES_CLOSED_MESSAGE } },
    { status: 503 }
  );
}
