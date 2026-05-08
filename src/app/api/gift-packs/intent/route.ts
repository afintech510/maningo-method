import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
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
});

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

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
      credits = Math.floor(baseCents / 2500); // $25 per credit
      label = 'Custom Gift Pack';
      packType = 'custom';
    }

    const fee = withServiceFee(baseCents);

    const metadata: Record<string, string> = {
      student_id: auth.user.id,
      gift: 'true',
      gift_pack: packType,
      gift_credits: String(credits),
      delivery_mode: input.delivery_mode,
      base_cents: String(fee.base_cents),
      service_fee_cents: String(fee.fee_cents),
    };
    if (input.recipient_name) metadata.recipient_name = input.recipient_name;
    if (input.recipient_email) metadata.recipient_email = input.recipient_email;
    if (input.sender_message) metadata.sender_message = input.sender_message;

    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(auth.user.id, auth.user.email);

    const intent = await stripe.paymentIntents.create({
      amount: fee.total_cents,
      currency: 'usd',
      customer: customerId,
      metadata,
      description: `Gift: ${label} (incl. 3% service fee)`,
      automatic_payment_methods: { enabled: true },
      receipt_email: auth.user.email,
    });

    log.info({ studentId: auth.user.id, packType, baseCents, totalCents: fee.total_cents, intentId: intent.id }, 'Gift PaymentIntent created');

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
