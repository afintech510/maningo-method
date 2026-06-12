import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateGiftCode } from '@/lib/gift-codes';
import {
  sendGiftPurchaseManualPending,
  sendAdminGiftPending,
} from '@/lib/resend';
import { formatCents } from '@/lib/pricing';
import { logger, generateCorrelationId } from '@/lib/logger';

const ADMIN_EMAIL = 'chelsea@maningomethod.com';
const VENMO_HANDLE = '@Chelsea-Maningo';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.maningomethod.com';

const PACK: Record<string, { credits: number; amount_cents: number; label: string }> = {
  single: { credits: 1, amount_cents: 2500, label: 'Drop-In Class' },
  '5pack': { credits: 5, amount_cents: 11200, label: '5-Class Pack' },
  '10pack': { credits: 10, amount_cents: 20000, label: '10-Class Pack' },
};

const manualSchema = z.object({
  kind: z.enum(['preset', 'custom']),
  pack: z.enum(['single', '5pack', '10pack']).optional(),
  amount_cents: z.number().int().min(1000).max(100000).optional(),
  recipient_name: z.string().max(120).optional().nullable(),
  recipient_email: z.string().email().optional().nullable(),
  sender_message: z.string().max(280).optional().nullable(),
  delivery_mode: z.enum(['email', 'share']),
  payment_method: z.literal('cash'),
  // Guest fields (used only when no auth)
  purchaser_name: z.string().max(120).optional().nullable(),
  purchaser_email: z.string().email().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await getAuth();

  try {
    const body = await request.json();
    const result = manualSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.issues[0]?.message ?? 'Invalid input' } },
        { status: 400 }
      );
    }
    const input = result.data;

    const purchaserId = auth?.user.id ?? null;
    const purchaserEmail = auth?.user.email ?? input.purchaser_email ?? null;
    const purchaserName = auth?.user.full_name ?? input.purchaser_name ?? null;

    if (!purchaserEmail || !purchaserName) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Your name and email are required.' } },
        { status: 400 }
      );
    }

    if (input.delivery_mode === 'email' && (!input.recipient_email || !input.recipient_name)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Recipient name and email are required when emailing the gift.' } },
        { status: 400 }
      );
    }

    let amountCents: number;
    let credits: number;
    let label: string;
    let packType: string;

    if (input.kind === 'preset') {
      const pack = input.pack ? PACK[input.pack] : null;
      if (!pack) {
        return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid gift pack.' } }, { status: 400 });
      }
      amountCents = pack.amount_cents;
      credits = pack.credits;
      label = pack.label;
      packType = input.pack!;
    } else {
      const a = Number(input.amount_cents);
      if (!Number.isFinite(a) || a < 1000) {
        return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Minimum custom gift is $10.' } }, { status: 400 });
      }
      amountCents = Math.round(a);
      // Dollar-balance gift card — see /api/gift-packs/intent for the
      // rationale. credits stays 0; amount_cents is authoritative.
      credits = 0;
      label = 'Custom Gift Card';
      packType = 'custom';
    }

    const supabase = createAdminClient();

    // Generate code with collision retries
    let code = '';
    let inserted: { id: string; code: string } | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      code = generateGiftCode();
      const { data, error } = await supabase
        .from('gift_packs')
        .insert({
          code,
          purchaser_id: purchaserId,
          purchaser_email: purchaserEmail,
          purchaser_name: purchaserName,
          recipient_name: input.recipient_name ?? null,
          recipient_email: input.recipient_email ?? null,
          sender_message: input.sender_message ?? null,
          delivery_mode: input.delivery_mode,
          pack_type: packType,
          credits,
          amount_cents: amountCents,
          status: 'pending',
        })
        .select('id, code')
        .single();
      if (!error && data) {
        inserted = data;
        break;
      }
      // 23505 = unique violation; retry with new code
      if (!error || (error.code !== '23505' && !/duplicate/i.test(error.message))) {
        log.error({ err: error }, 'Failed to insert pending gift_pack');
        return NextResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Could not create gift. Try again.' } },
          { status: 500 }
        );
      }
    }

    if (!inserted) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Could not generate a unique code. Please try again.' } },
        { status: 500 }
      );
    }

    const amountDisplay = formatCents(amountCents);
    const redemptionUrl = `${SITE_URL}/redeem`;

    // Fire-and-forget emails
    void sendGiftPurchaseManualPending(purchaserEmail, {
      purchaserName,
      recipientName: input.recipient_name ?? null,
      packLabel: label,
      amountDisplay,
      code: inserted.code,
      redemptionUrl,
      paymentMethod: input.payment_method,
      venmoHandle: VENMO_HANDLE,
      deliveryMode: input.delivery_mode,
    });
    void sendAdminGiftPending(ADMIN_EMAIL, {
      purchaserName,
      purchaserEmail,
      packLabel: label,
      amount: amountDisplay,
      code: inserted.code,
      paymentMethod: input.payment_method,
      giftId: inserted.id,
    });

    log.info(
      { giftId: inserted.id, packType, amountCents, paymentMethod: input.payment_method, isGuest: !purchaserId },
      'Pending manual gift created'
    );

    return NextResponse.json({
      gift_id: inserted.id,
      code: inserted.code,
      amount_cents: amountCents,
      amount_display: amountDisplay,
      label,
      payment_method: input.payment_method,
      venmo_handle: VENMO_HANDLE,
    });
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'POST /api/gift-packs/manual failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
