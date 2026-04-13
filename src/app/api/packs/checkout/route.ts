import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { getStripe, getOrCreateStripeCustomer } from '@/lib/stripe';
import { getBaseUrl } from '@/lib/utils';
import { logger, generateCorrelationId } from '@/lib/logger';

const PACKS: Record<string, { priceEnv: string; credits: number; label: string }> = {
  intro: { priceEnv: 'STRIPE_INTRO_PRICE_ID', credits: 1, label: 'Intro Class' },
  single: { priceEnv: 'STRIPE_DROPIN_PRICE_ID', credits: 1, label: 'Single Class' },
  '4pack': { priceEnv: 'STRIPE_4PACK_PRICE_ID', credits: 4, label: '4-Class Pack' },
  '8pack': { priceEnv: 'STRIPE_8PACK_PRICE_ID', credits: 8, label: '8-Class Pack' },
  '12pack': { priceEnv: 'STRIPE_12PACK_PRICE_ID', credits: 12, label: '12-Class Pack' },
};

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const { pack_type } = await request.json();
    const pack = PACKS[pack_type];

    if (!pack) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid pack type.' } },
        { status: 400 }
      );
    }

    const priceId = process.env[pack.priceEnv];
    if (!priceId) {
      log.error({ pack_type }, 'Missing price ID env var');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
        { status: 500 }
      );
    }

    const customerId = await getOrCreateStripeCustomer(auth.user.id, auth.user.email);
    const stripe = getStripe();
    const baseUrl = getBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/booking-success?type=pack&pack=${pack_type}`,
      cancel_url: `${baseUrl}/dashboard?cancelled=true`,
      metadata: {
        student_id: auth.user.id,
        pack_type,
        credits: String(pack.credits),
      },
    });

    log.info({ sessionId: session.id, pack_type }, 'Pack checkout created');
    return NextResponse.json({ checkout_url: session.url });
  } catch (err) {
    log.error({ err }, 'Pack checkout failed');
    return NextResponse.json(
      { error: { code: 'STRIPE_ERROR', message: 'Payment system is temporarily unavailable.' } },
      { status: 502 }
    );
  }
}
