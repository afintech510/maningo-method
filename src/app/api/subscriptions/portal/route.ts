import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', auth.user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: { code: 'NO_ACTIVE_SUBSCRIPTION', message: 'No subscription found.' } },
        { status: 402 }
      );
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${getBaseUrl()}/subscription`,
    });

    log.info('Portal session created');
    return NextResponse.json({ portal_url: session.url });
  } catch (err) {
    log.error({ err }, 'Portal session failed');
    return NextResponse.json(
      { error: { code: 'STRIPE_ERROR', message: 'Payment system is temporarily unavailable.' } },
      { status: 502 }
    );
  }
}
