import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json();
    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const stripe = getStripe();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await stripe.checkout.sessions.retrieve(session_id) as any;

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ credited: false, reason: 'not_paid' });
    }

    const studentId = session.metadata?.student_id;
    const packType = session.metadata?.pack_type;
    const credits = parseInt(session.metadata?.credits || '0', 10);
    const referralCode = session.metadata?.referral_code;

    if (!studentId || !packType || !credits) {
      return NextResponse.json({ credited: false, reason: 'missing_metadata' });
    }

    const supabase = createAdminClient();

    // Check if already processed (idempotency)
    const { data: existing } = await supabase
      .from('credit_purchases')
      .select('id')
      .eq('stripe_checkout_session_id', session.id)
      .single();

    if (existing) {
      return NextResponse.json({ credited: true, already_processed: true });
    }

    // Record purchase
    await supabase.from('credit_purchases').insert({
      student_id: studentId,
      pack_type: packType,
      credits_added: credits,
      amount_paid_cents: session.amount_total || 0,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
    });

    // Add credits and mark intro as used if applicable
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', studentId)
      .single();

    const updateData: Record<string, unknown> = { credits: (profile?.credits || 0) + credits };
    if (packType === 'intro') {
      updateData.has_used_intro = true;
    }

    await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', studentId);

    // Handle referral reward if applicable
    if (referralCode && packType === 'intro') {
      // Find the referrer by their referral code
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id, credits')
        .eq('referral_code', referralCode)
        .single();

      if (referrer) {
        // Give referrer 1 free class credit
        await supabase
          .from('profiles')
          .update({ credits: (referrer.credits || 0) + 1 })
          .eq('id', referrer.id);

        logger.info({ referrerId: referrer.id, newStudentId: studentId }, 'Referral reward: +1 credit');
      }
    }

    logger.info({ studentId, packType, credits }, 'Credits verified and added via success page');
    return NextResponse.json({ credited: true, credits_added: credits });
  } catch (err) {
    logger.error({ err }, 'Pack verify failed');
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
