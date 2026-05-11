import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyCreditDelta } from '@/lib/credits';
import { sendGiftRedeemed } from '@/lib/resend';
import { isValidGiftCodeFormat, normalizeGiftCode } from '@/lib/gift-codes';
import { logger, generateCorrelationId } from '@/lib/logger';

const PACK_LABEL: Record<string, string> = {
  single: 'Drop-In Class',
  '5pack': '5-Class Pack',
  '10pack': '10-Class Pack',
  custom: 'Custom Gift Pack',
};

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const rawCode: string = body.code || '';
    const normalized = normalizeGiftCode(rawCode);
    if (!isValidGiftCodeFormat(rawCode)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'That code does not look right. Double-check and try again.' } },
        { status: 400 }
      );
    }

    // Re-apply formatting for case-insensitive lookup; gift codes are stored as MM-XXXX-XXXX-XXXX
    const formatted = `MM-${normalized.slice(2, 6)}-${normalized.slice(6, 10)}-${normalized.slice(10, 14)}`;

    const supabase = createAdminClient();
    const { data: gift, error: fetchErr } = await supabase
      .from('gift_packs')
      .select(
        'id, code, status, credits, amount_cents, pack_type, purchaser_id, purchaser_email, purchaser_name, recipient_name'
      )
      .eq('code', formatted)
      .maybeSingle();

    if (fetchErr || !gift) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'No gift found with that code.' } },
        { status: 404 }
      );
    }

    if (gift.status === 'redeemed') {
      return NextResponse.json(
        { error: { code: 'ALREADY_REDEEMED', message: 'This gift has already been redeemed.' } },
        { status: 409 }
      );
    }
    if (gift.status === 'cancelled') {
      return NextResponse.json(
        { error: { code: 'CANCELLED', message: 'This gift was cancelled and cannot be redeemed.' } },
        { status: 409 }
      );
    }
    if (gift.status !== 'active') {
      return NextResponse.json(
        { error: { code: 'NOT_REDEEMABLE', message: 'This gift is not yet active. Try again in a moment.' } },
        { status: 409 }
      );
    }

    if (gift.purchaser_id === auth.user.id) {
      return NextResponse.json(
        { error: { code: 'SELF_REDEEM', message: "You can't redeem your own gift purchase." } },
        { status: 400 }
      );
    }

    // Two transfer modes:
    //   - Custom gifts → full amount_cents lands on profile.gift_balance_cents,
    //     no fractional credits to round away.
    //   - Preset gifts → credits transfer (existing semantics).
    const isCustom = gift.pack_type === 'custom';
    const credits = gift.credits || 0;
    const amountCents = gift.amount_cents || 0;
    if (isCustom ? amountCents <= 0 : credits <= 0) {
      return NextResponse.json(
        { error: { code: 'NO_CREDITS', message: 'This gift has no value to apply.' } },
        { status: 400 }
      );
    }

    // Mark redeemed first; if the credit/balance apply fails, we revert
    const { error: markErr } = await supabase
      .from('gift_packs')
      .update({
        status: 'redeemed',
        redeemed_by: auth.user.id,
        redeemed_at: new Date().toISOString(),
      })
      .eq('id', gift.id)
      .eq('status', 'active');
    if (markErr) {
      log.error({ err: markErr, giftId: gift.id }, 'Failed to mark gift redeemed');
      return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Could not redeem.' } }, { status: 500 });
    }

    try {
      let newBalance = 0;
      let giftBalanceAddedCents = 0;
      let creditsAdded = 0;

      if (isCustom) {
        // Add full dollar amount to gift_balance_cents on the redeemer's
        // profile. Gift-redeem flows are inherently rare and per-user, so a
        // read-then-write is acceptable; in the worst case two concurrent
        // redemptions by the same person could lose one, which we accept.
        const { data: profile } = await supabase
          .from('profiles')
          .select('gift_balance_cents, credits')
          .eq('id', auth.user.id)
          .single();
        const next = (profile?.gift_balance_cents || 0) + amountCents;
        const { error: writeErr } = await supabase
          .from('profiles')
          .update({ gift_balance_cents: next })
          .eq('id', auth.user.id);
        if (writeErr) throw writeErr;
        giftBalanceAddedCents = amountCents;
        newBalance = profile?.credits || 0;
      } else {
        const r = await applyCreditDelta({
          studentId: auth.user.id,
          delta: credits,
          reason: `Gift redemption (${gift.code})`,
          source: 'gift_redeem',
          relatedId: gift.id,
        });
        newBalance = r.newBalance;
        creditsAdded = credits;
      }

      // Notify the original purchaser. For account purchases, use the live
      // profile. For guest purchases, fall back to fields stored on the gift row.
      let purchaserEmail: string | null = gift.purchaser_email || null;
      let purchaserName: string | null = gift.purchaser_name || null;
      if (gift.purchaser_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', gift.purchaser_id)
          .single();
        if (profile?.email) purchaserEmail = profile.email;
        if (profile?.full_name) purchaserName = profile.full_name;
      }
      const { data: redeemer } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', auth.user.id)
        .single();
      if (purchaserEmail) {
        await sendGiftRedeemed(purchaserEmail, {
          purchaserName: purchaserName || 'there',
          recipientName: gift.recipient_name,
          packLabel: PACK_LABEL[gift.pack_type] || 'gift',
          redeemerName: redeemer?.full_name || null,
        });
      }

      log.info(
        {
          giftId: gift.id,
          redeemerId: auth.user.id,
          isCustom,
          creditsAdded,
          giftBalanceAddedCents,
        },
        'Gift redeemed'
      );
      return NextResponse.json({
        kind: isCustom ? 'balance' : 'credits',
        credits_added: creditsAdded,
        gift_balance_added_cents: giftBalanceAddedCents,
        new_balance: newBalance,
      });
    } catch (err) {
      // Revert gift status
      await supabase
        .from('gift_packs')
        .update({ status: 'active', redeemed_by: null, redeemed_at: null })
        .eq('id', gift.id);
      log.error({ err, giftId: gift.id }, 'Credit apply failed during redemption — reverted');
      return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Could not redeem. Please try again.' } }, { status: 500 });
    }
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'POST /api/gift-packs/redeem failed');
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}
