import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { getStripe, getOrCreateStripeCustomer } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger, generateCorrelationId } from '@/lib/logger';
import { withServiceFee } from '@/lib/pricing';

const PACKS: Record<string, { credits: number; amount_cents: number; label: string }> = {
  single: { credits: 1, amount_cents: 2500, label: 'Drop-In Class' },
  '5pack': { credits: 5, amount_cents: 11200, label: '5-Class Pack' },
  '10pack': { credits: 10, amount_cents: 20000, label: '10-Class Pack' },
};

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const kind: 'pack' | 'gift_pack' | 'gift_custom' = body.kind;
    const packType: string | undefined = body.pack;
    const customAmountCents: number | undefined = body.amount_cents;

    let amountCents: number;
    let credits: number;
    let label: string;
    const metadata: Record<string, string> = {
      student_id: auth.user.id,
    };

    if (kind === 'pack') {
      const pack = packType ? PACKS[packType] : null;
      if (!pack) {
        return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid pack.' } }, { status: 400 });
      }
      amountCents = pack.amount_cents;
      credits = pack.credits;
      label = pack.label;
      metadata.pack_type = packType!;
      metadata.credits = String(credits);
    } else if (kind === 'gift_pack') {
      const pack = packType ? PACKS[packType] : null;
      if (!pack) {
        return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid gift pack.' } }, { status: 400 });
      }
      amountCents = pack.amount_cents;
      credits = pack.credits;
      label = `Gift: ${pack.label}`;
      metadata.gift = 'true';
      metadata.gift_pack = packType!;
      metadata.gift_credits = String(credits);
    } else if (kind === 'gift_custom') {
      const a = Number(customAmountCents);
      if (!Number.isFinite(a) || a < 1000) {
        return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Minimum custom gift is $10.' } }, { status: 400 });
      }
      amountCents = Math.round(a);
      credits = 0;
      label = 'Custom Gift Pack';
      metadata.gift = 'true';
      metadata.gift_pack = 'custom';
      metadata.gift_amount_cents = String(amountCents);
    } else {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid kind.' } }, { status: 400 });
    }

    // Intro pack guard (still applies if pack=intro is reintroduced)
    if (metadata.pack_type === 'intro') {
      const supabase = createAdminClient();
      const { data: profile } = await supabase.from('profiles').select('has_used_intro').eq('id', auth.user.id).single();
      if (profile?.has_used_intro) {
        return NextResponse.json({ error: { code: 'INTRO_ALREADY_USED', message: 'You can only buy one intro class.' } }, { status: 400 });
      }
    }

    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(auth.user.id, auth.user.email);

    const fee = withServiceFee(amountCents);
    const totalCents = fee.total_cents;

    metadata.base_cents = String(fee.base_cents);
    metadata.service_fee_cents = String(fee.fee_cents);

    const intent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'usd',
      customer: customerId,
      metadata,
      description: `${label} (incl. 3% service fee)`,
      automatic_payment_methods: { enabled: true },
      receipt_email: auth.user.email,
    });

    log.info({ studentId: auth.user.id, kind, baseCents: amountCents, totalCents, feeCents: fee.fee_cents, intentId: intent.id }, 'PaymentIntent created');

    return NextResponse.json({
      client_secret: intent.client_secret,
      base_cents: amountCents,
      service_fee_cents: fee.fee_cents,
      total_cents: totalCents,
      label,
      credits,
    });
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'PaymentIntent create failed');
    return NextResponse.json(
      { error: { code: 'STRIPE_ERROR', message: 'Could not start checkout. Please try again.' } },
      { status: 502 }
    );
  }
}
