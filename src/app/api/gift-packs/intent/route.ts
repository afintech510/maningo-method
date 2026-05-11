import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuth } from '@/lib/auth';
import { getStripe, getOrCreateStripeCustomer } from '@/lib/stripe';
import { withServiceFee } from '@/lib/pricing';
import { logger, generateCorrelationId } from '@/lib/logger';

const PACK: Record<string, { credits: number; amount_cents: number; label: string }> = {
  single: { credits: 1, amount_cents: 2500, label: 'Drop-In Class' },
  '5pack': { credits: 5, amount_cents: 11200, label: '5-Class Pack' },
  '10pack': { credits: 10, amount_cents: 20000, label: '10-Class Pack' },
};

const intentSchema = z.object({
  kind: z.enum(['preset', 'custom']),
  pack: z.enum(['single', '5pack', '10pack']).optional(),
  amount_cents: z.number().int().min(1000).max(100000).optional(),
  recipient_name: z.string().max(120).optional().nullable(),
  recipient_email: z.string().email().optional().nullable(),
  sender_message: z.string().max(280).optional().nullable(),
  delivery_mode: z.enum(['email', 'share']),
  // Guest checkout fields (used only when no auth session present)
  purchaser_name: z.string().max(120).optional().nullable(),
  purchaser_email: z.string().email().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await getAuth();

  try {
    const body = await request.json();
    const result = intentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.issues[0]?.message ?? 'Invalid input' } },
        { status: 400 }
      );
    }
    const input = result.data;

    // Resolve purchaser identity (logged-in OR guest)
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

    let baseCents: number;
    let credits: number;
    let label: string;
    let packType: string;

    if (input.kind === 'preset') {
      const pack = input.pack ? PACK[input.pack] : null;
      if (!pack) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid gift pack.' } }, { status: 400 });
      baseCents = pack.amount_cents;
      credits = pack.credits;
      label = pack.label;
      packType = input.pack!;
    } else {
      const a = Number(input.amount_cents);
      if (!Number.isFinite(a) || a < 1000) {
        return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Minimum custom gift is $10.' } }, { status: 400 });
      }
      baseCents = Math.round(a);
      // Dollar-balance gift card — full amount transfers to recipient at
      // redemption. Stored credits=0; amount_cents is the source of truth.
      credits = 0;
      label = 'Custom Gift Card';
      packType = 'custom';
    }

    const fee = withServiceFee(baseCents);

    const metadata: Record<string, string> = {
      gift: 'true',
      gift_pack: packType,
      gift_credits: String(credits),
      delivery_mode: input.delivery_mode,
      base_cents: String(fee.base_cents),
      service_fee_cents: String(fee.fee_cents),
      purchaser_email: purchaserEmail,
      purchaser_name: purchaserName,
    };
    if (purchaserId) metadata.student_id = purchaserId;
    if (input.recipient_name) metadata.recipient_name = input.recipient_name;
    if (input.recipient_email) metadata.recipient_email = input.recipient_email;
    if (input.sender_message) metadata.sender_message = input.sender_message;

    const stripe = getStripe();
    let customerId: string | undefined;
    if (purchaserId && auth) {
      customerId = await getOrCreateStripeCustomer(purchaserId, auth.user.email);
    } else {
      // Guest: find/create Stripe customer by email so receipts and future
      // refund-by-email work without polluting our profiles table.
      const existing = await stripe.customers.list({ email: purchaserEmail, limit: 1 });
      if (existing.data[0]) {
        customerId = existing.data[0].id;
      } else {
        const c = await stripe.customers.create({
          email: purchaserEmail,
          name: purchaserName,
          metadata: { source: 'guest_gift_purchase' },
        });
        customerId = c.id;
      }
    }

    const intent = await stripe.paymentIntents.create({
      amount: fee.total_cents,
      currency: 'usd',
      customer: customerId,
      metadata,
      description: `Gift: ${label} (incl. 3% service fee)`,
      automatic_payment_methods: { enabled: true },
      receipt_email: purchaserEmail,
    });

    log.info(
      { purchaserId, isGuest: !purchaserId, packType, baseCents, totalCents: fee.total_cents, intentId: intent.id },
      'Gift PaymentIntent created'
    );

    return NextResponse.json({
      client_secret: intent.client_secret,
      base_cents: fee.base_cents,
      service_fee_cents: fee.fee_cents,
      total_cents: fee.total_cents,
      label: `Gift: ${label}`,
      credits,
    });
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'Gift PaymentIntent failed');
    return NextResponse.json(
      { error: { code: 'STRIPE_ERROR', message: 'Could not start checkout. Please try again.' } },
      { status: 502 }
    );
  }
}
