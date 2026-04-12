import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { getStripe, getOrCreateStripeCustomer } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { getBaseUrl } from '@/lib/utils';
import { logger, generateCorrelationId } from '@/lib/logger';

export async function POST() {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const supabase = createClient();

    // Check existing active subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('student_id', auth.user.id)
      .eq('status', 'active')
      .single();

    if (existingSub) {
      return NextResponse.json(
        { error: { code: 'ALREADY_SUBSCRIBED', message: 'You already have an active subscription.' } },
        { status: 409 }
      );
    }

    const customerId = await getOrCreateStripeCustomer(auth.user.id, auth.user.email);
    const stripe = getStripe();
    const baseUrl = getBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID!, quantity: 1 }],
      success_url: `${baseUrl}/booking-success?type=subscription&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscription?cancelled=true`,
      metadata: { student_id: auth.user.id },
    });

    log.info({ sessionId: session.id }, 'Subscription checkout created');
    return NextResponse.json({ checkout_url: session.url });
  } catch (err) {
    log.error({ err }, 'Subscription checkout failed');
    return NextResponse.json(
      { error: { code: 'STRIPE_ERROR', message: 'Payment system is temporarily unavailable.' } },
      { status: 502 }
    );
  }
}
