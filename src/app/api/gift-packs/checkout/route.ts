import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { getStripe, getOrCreateStripeCustomer } from '@/lib/stripe';
import { getBaseUrl } from '@/lib/utils';
import { logger, generateCorrelationId } from '@/lib/logger';

const PRESET_PRICE_ENV: Record<string, { env: string; credits: number; label: string }> = {
  single: { env: 'STRIPE_DROPIN_PRICE_ID', credits: 1, label: 'Drop-In Class' },
  '5pack': { env: 'STRIPE_5PACK_PRICE_ID', credits: 5, label: '5-Class Pack' },
  '10pack': { env: 'STRIPE_10PACK_PRICE_ID', credits: 10, label: '10-Class Pack' },
};

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(auth.user.id, auth.user.email);
    const baseUrl = getBaseUrl();

    let lineItems: Array<{ price?: string; quantity: number; price_data?: unknown }>;
    let metadata: Record<string, string> = {
      purchaser_id: auth.user.id,
      gift: 'true',
    };

    if (body.type === 'preset') {
      const preset = PRESET_PRICE_ENV[body.pack];
      if (!preset) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Invalid gift pack.' } },
          { status: 400 }
        );
      }
      const priceId = process.env[preset.env];
      if (!priceId) {
        return NextResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Pricing not configured.' } },
          { status: 500 }
        );
      }
      lineItems = [{ price: priceId, quantity: 1 }];
      metadata = { ...metadata, gift_pack: body.pack, gift_credits: String(preset.credits), gift_label: preset.label };
    } else if (body.type === 'custom') {
      const amountCents = Number(body.amount_cents);
      if (!Number.isFinite(amountCents) || amountCents < 1000) {
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Minimum custom gift is $10.' } },
          { status: 400 }
        );
      }
      lineItems = [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(amountCents),
            product_data: { name: 'Custom Gift Pack — Maningo Method' },
          },
        },
      ];
      metadata = { ...metadata, gift_pack: 'custom', gift_amount_cents: String(amountCents) };
    } else {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request.' } },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      line_items: lineItems as any,
      success_url: `${baseUrl}/booking-success?type=gift&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard?cancelled=true`,
      metadata,
    });

    log.info({ sessionId: session.id, gift: metadata.gift_pack }, 'Gift checkout created');
    return NextResponse.json({ checkout_url: session.url });
  } catch (err) {
    log.error({ err }, 'Gift checkout failed');
    return NextResponse.json(
      { error: { code: 'STRIPE_ERROR', message: 'Payment system is temporarily unavailable.' } },
      { status: 502 }
    );
  }
}
