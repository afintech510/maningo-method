import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyCreditDelta } from '@/lib/credits';
import { logger } from '@/lib/logger';

// Fallback verification path used by the booking-success page after a Stripe
// Checkout (session_id-based) flow. The integrated PaymentElement flow now
// runs through the webhook, so this only fires for the legacy hosted checkout.
// Referral rewards are handled centrally in the webhook (every pack purchase).
export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json();
    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const stripe = getStripe();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = (await stripe.checkout.sessions.retrieve(session_id)) as any;

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ credited: false, reason: 'not_paid' });
    }

    const studentId = session.metadata?.student_id;
    const packType = session.metadata?.pack_type;
    const credits = parseInt(session.metadata?.credits || '0', 10);

    if (!studentId || !packType || !credits) {
      return NextResponse.json({ credited: false, reason: 'missing_metadata' });
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from('credit_purchases')
      .select('id')
      .eq('stripe_checkout_session_id', session.id)
      .single();
    if (existing) {
      return NextResponse.json({ credited: true, already_processed: true });
    }

    await supabase.from('credit_purchases').insert({
      student_id: studentId,
      pack_type: packType,
      credits_added: credits,
      amount_paid_cents: session.amount_total || 0,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
    });

    await applyCreditDelta({
      studentId,
      delta: credits,
      reason: `Stripe purchase ${packType}`,
      source: 'stripe_purchase',
      relatedId: session.id,
    });

    if (packType === 'intro') {
      await supabase.from('profiles').update({ has_used_intro: true }).eq('id', studentId);
    }

    logger.info({ studentId, packType, credits }, 'Credits verified and added via success page');
    return NextResponse.json({ credited: true, credits_added: credits });
  } catch (err) {
    logger.error({ err }, 'Pack verify failed');
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
