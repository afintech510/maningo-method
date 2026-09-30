import { fromZonedTime } from 'date-fns-tz';
import type { SupabaseClient } from '@supabase/supabase-js';
import { STUDIO_TIMEZONE } from '@/lib/timezone';

// October 2026 flash sale: 7 classes for $119 ($17/class — the studio's best
// rate). Credits never expire; only the *purchase window* is time-boxed, so
// this is an ordinary class pack that happens to be buyable for four days.
//
// The window is studio wall-clock converted to UTC instants, so it opens and
// closes at the right moment regardless of the visitor's (or the server's)
// timezone. The year is hardcoded so the sale can't silently reappear in 2027 —
// same reasoning as MemorialClassBanner.tsx:9-14. Edit here if it repeats.
export const OCTOBER_7PACK = {
  packType: '7pack',
  label: '7-Class Pack',
  credits: 7,
  amountCents: 11900,
  saleStartsAt: fromZonedTime('2026-10-01T00:00:00', STUDIO_TIMEZONE),
  saleEndsAt: fromZonedTime('2026-10-05T00:00:00', STUDIO_TIMEZONE), // through end of Oct 4
} as const;

export type PromoPhase = 'teaser' | 'live' | 'ended';

export function promoPhase(now: Date = new Date()): PromoPhase {
  const t = now.getTime();
  if (t < OCTOBER_7PACK.saleStartsAt.getTime()) return 'teaser';
  if (t < OCTOBER_7PACK.saleEndsAt.getTime()) return 'live';
  return 'ended';
}

export function isPromoPurchasable(now: Date = new Date()): boolean {
  return promoPhase(now) === 'live';
}

/**
 * One 7-pack per member, enforced server-side across BOTH purchase paths.
 *
 * Checking only credit_purchases isn't enough: cash grants the full pack
 * provisionally at submission (migration 022), so a member could submit a cash
 * request *and* pay by card and walk away with 14 credits for $119. A pending
 * manual_payment counts as claimed; a cancelled one frees the slot again.
 *
 * Throws on a query error so the caller's catch turns it into a 5xx rather
 * than silently letting a second purchase through.
 */
export async function hasClaimedOctober7Pack(
  supabase: SupabaseClient,
  studentId: string
): Promise<boolean> {
  const [purchased, manual] = await Promise.all([
    supabase
      .from('credit_purchases')
      .select('id')
      .eq('student_id', studentId)
      .eq('pack_type', OCTOBER_7PACK.packType)
      .limit(1),
    supabase
      .from('manual_payments')
      .select('id')
      .eq('student_id', studentId)
      .eq('pack_type', OCTOBER_7PACK.packType)
      .in('status', ['pending', 'paid'])
      .limit(1),
  ]);

  if (purchased.error) throw purchased.error;
  if (manual.error) throw manual.error;

  return (purchased.data?.length ?? 0) > 0 || (manual.data?.length ?? 0) > 0;
}
