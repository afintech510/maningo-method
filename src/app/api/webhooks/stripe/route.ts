import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
// Webhook event objects are validated via signature, so `any` is fine for shape access

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const supabase = createAdminClient();
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    logger.error({ err }, 'Webhook signature verification failed');
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
  }

  const log = logger.child({ eventId: event.id, eventType: event.type });

  // Idempotency check
  const { data: existing } = await supabase
    .from('processed_stripe_events')
    .select('event_id')
    .eq('event_id', event.id)
    .single();

  if (existing) {
    log.info('Duplicate event, skipping');
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = event.data.object as any;

        if (session.mode === 'payment') {
          const bookingId = session.metadata?.booking_id;
          const packType = session.metadata?.pack_type;
          const credits = session.metadata?.credits;
          const studentId = session.metadata?.student_id;
          const paymentIntent = session.payment_intent as string;

          if (packType && credits && studentId) {
            // Class pack purchase — add credits
            const creditsNum = parseInt(credits, 10);

            const { error: purchaseError } = await supabase
              .from('credit_purchases')
              .insert({
                student_id: studentId,
                pack_type: packType,
                credits_added: creditsNum,
                amount_paid_cents: session.amount_total || 0,
                stripe_checkout_session_id: session.id,
                stripe_payment_intent_id: paymentIntent,
              });

            if (purchaseError) {
              log.error({ err: purchaseError }, 'Failed to record credit purchase');
              return NextResponse.json({ error: 'DB error' }, { status: 500 });
            }

            // Add credits to profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('credits')
              .eq('id', studentId)
              .single();

            await supabase
              .from('profiles')
              .update({ credits: (profile?.credits || 0) + creditsNum })
              .eq('id', studentId);

            log.info({ studentId, packType, credits: creditsNum }, 'Credits added');
          } else if (bookingId) {
            // Legacy drop-in booking confirmation
            const { error } = await supabase
              .from('bookings')
              .update({
                status: 'confirmed',
                stripe_payment_intent_id: paymentIntent,
                amount_paid_cents: session.amount_total,
              })
              .eq('id', bookingId)
              .eq('status', 'pending');

            if (error) {
              log.error({ err: error, bookingId }, 'Failed to confirm drop-in booking');
              return NextResponse.json({ error: 'DB error' }, { status: 500 });
            }
            log.info({ bookingId }, 'Drop-in booking confirmed');
          }
        }
        break;
      }

      case 'payment_intent.succeeded': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const intent = event.data.object as any;
        const md = intent.metadata || {};
        const studentId: string | undefined = md.student_id;
        const packType: string | undefined = md.pack_type;
        const credits: string | undefined = md.credits;
        const isGift: boolean = md.gift === 'true';

        if (!studentId) {
          log.info({ intentId: intent.id }, 'PaymentIntent without student_id; skipping');
          break;
        }

        // Check if a checkout.session.completed already booked this intent (avoid double credit)
        const { data: existingPurchase } = await supabase
          .from('credit_purchases')
          .select('id')
          .eq('stripe_payment_intent_id', intent.id)
          .maybeSingle();
        if (existingPurchase) {
          log.info({ intentId: intent.id }, 'Already recorded by prior event');
          break;
        }

        if (isGift) {
          // Gift purchase — record but do not credit purchaser
          await supabase.from('credit_purchases').insert({
            student_id: studentId,
            pack_type: md.gift_pack || 'gift_custom',
            credits_added: 0,
            amount_paid_cents: intent.amount_received || intent.amount,
            stripe_payment_intent_id: intent.id,
          });
          log.info({ studentId, intentId: intent.id }, 'Gift purchase recorded');
          break;
        }

        if (packType && credits) {
          const creditsNum = parseInt(credits, 10);
          const { error: purchaseError } = await supabase.from('credit_purchases').insert({
            student_id: studentId,
            pack_type: packType,
            credits_added: creditsNum,
            amount_paid_cents: intent.amount_received || intent.amount,
            stripe_payment_intent_id: intent.id,
          });
          if (purchaseError) {
            log.error({ err: purchaseError }, 'Failed to record credit purchase (PI)');
            return NextResponse.json({ error: 'DB error' }, { status: 500 });
          }

          const { data: profile } = await supabase.from('profiles').select('credits').eq('id', studentId).single();
          await supabase
            .from('profiles')
            .update({ credits: (profile?.credits || 0) + creditsNum })
            .eq('id', studentId);

          log.info({ studentId, packType, credits: creditsNum, intentId: intent.id }, 'Credits added (PI)');
        }
        break;
      }

      default:
        log.info('Unhandled event type');
    }

    // Mark event as processed
    await supabase
      .from('processed_stripe_events')
      .insert({ event_id: event.id, event_type: event.type });

    return NextResponse.json({ received: true });
  } catch (err) {
    log.error({ err }, 'Webhook processing failed');
    // DO NOT mark as processed — Stripe will retry
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
