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

/** Every pack type the app knows how to sell, in display order. */
export const ALL_PACK_TYPES = ['single', '5pack', '10pack'] as const;

/**
 * What the studio is currently willing to sell. Three switches, all of which
 * must allow a sale:
 *
 *   purchases_enabled      master kill switch (migration 044)
 *   sellable_pack_types    which packs specifically (migration 045)
 *   gift_purchases_enabled gift cards, which are prepaid credits (045)
 *
 * None of this affects redeeming a gift code already bought, booking with
 * credits already held, waitlists, or admin credit adjustments.
 */
export interface PurchaseAvailability {
  /** Master switch. False means nothing at all is for sale. */
  enabled: boolean;
  /** Pack types that can actually be bought right now. */
  sellablePacks: string[];
  /** Whether gift cards can be bought. */
  giftsEnabled: boolean;
  /** True when at least one pack is buyable — drives "is there anything to sell". */
  anyPackSellable: boolean;
}

export async function getPurchaseAvailability(): Promise<PurchaseAvailability> {
  const settings = await getStudioSettings();
  const enabled = settings.purchases_enabled;
  const sellablePacks = enabled
    ? ALL_PACK_TYPES.filter((p) => settings.sellable_pack_types.includes(p))
    : [];
  return {
    enabled,
    sellablePacks,
    giftsEnabled: enabled && settings.gift_purchases_enabled,
    anyPackSellable: sellablePacks.length > 0,
  };
}

/** Master switch only. Prefer isPackSellable/areGiftsSellable for buy actions. */
export async function arePurchasesEnabled(): Promise<boolean> {
  return (await getPurchaseAvailability()).enabled;
}

export async function isPackSellable(packType: string | undefined | null): Promise<boolean> {
  if (!packType) return false;
  return (await getPurchaseAvailability()).sellablePacks.includes(packType);
}

export async function areGiftsSellable(): Promise<boolean> {
  return (await getPurchaseAvailability()).giftsEnabled;
}

/**
 * 503 rather than 400: the request is well-formed, the capability is just
 * unavailable right now.
 */
function closedResponse(): NextResponse {
  return NextResponse.json(
    { error: { code: 'PURCHASES_DISABLED', message: PURCHASES_CLOSED_MESSAGE } },
    { status: 503 }
  );
}

/**
 * Guard for a route selling a specific pack. Returns a response to return
 * early, or null to continue.
 *
 *   const closed = await packClosedGuard(pack_type);
 *   if (closed) return closed;
 *
 * An unknown pack type is treated as not sellable — the route's own validation
 * then reports it properly.
 */
export async function packClosedGuard(
  packType: string | undefined | null
): Promise<NextResponse | null> {
  return (await isPackSellable(packType)) ? null : closedResponse();
}

/** Guard for any route that sells a gift card. */
export async function giftClosedGuard(): Promise<NextResponse | null> {
  return (await areGiftsSellable()) ? null : closedResponse();
}

/** Guard for routes that sell something but resolve which thing later. */
export async function purchasesClosedGuard(): Promise<NextResponse | null> {
  return (await arePurchasesEnabled()) ? null : closedResponse();
}
