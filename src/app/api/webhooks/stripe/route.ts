import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
// Stripe SDK v22 changes subscription type shapes; use `any` for webhook event objects
// since they're already validated by signature verification

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
        } else if (session.mode === 'subscription') {
          // Subscription created
          const studentId = session.metadata?.student_id;
          const subscriptionId = session.subscription as string;

          if (studentId && subscriptionId) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sub = await stripe.subscriptions.retrieve(subscriptionId) as any;

            const { error } = await supabase
              .from('subscriptions')
              .upsert({
                student_id: studentId,
                stripe_subscription_id: subscriptionId,
                status: 'active',
                current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
                current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              }, { onConflict: 'student_id' });

            if (error) {
              log.error({ err: error, studentId }, 'Failed to create subscription record');
              return NextResponse.json({ error: 'DB error' }, { status: 500 });
            }

            // Ensure stripe_customer_id is on profiles
            if (session.customer) {
              await supabase
                .from('profiles')
                .update({ stripe_customer_id: session.customer as string })
                .eq('id', studentId)
                .is('stripe_customer_id', null);
            }

            log.info({ studentId, subscriptionId }, 'Subscription created');
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = event.data.object as any;
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);

        if (error) {
          log.error({ err: error }, 'Failed to update subscription');
          return NextResponse.json({ error: 'DB error' }, { status: 500 });
        }
        log.info({ subId: sub.id, status: sub.status }, 'Subscription updated');
        break;
      }

      case 'customer.subscription.deleted': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = event.data.object as any;

        // Get student_id from subscription
        const { data: subRecord } = await supabase
          .from('subscriptions')
          .select('student_id')
          .eq('stripe_subscription_id', sub.id)
          .single();

        // Mark subscription cancelled
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', sub.id);

        if (updateError) {
          log.error({ err: updateError }, 'Failed to cancel subscription');
          return NextResponse.json({ error: 'DB error' }, { status: 500 });
        }

        // Cancel future subscription bookings (REV-008)
        if (subRecord?.student_id) {
          const { data: cancelled } = await supabase.rpc('cancel_future_subscription_bookings', {
            p_student_id: subRecord.student_id,
          });
          // If RPC doesn't exist yet, do it manually
          if (cancelled === null) {
            await supabase
              .from('bookings')
              .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
              .eq('student_id', subRecord.student_id)
              .eq('payment_type', 'subscription')
              .eq('status', 'confirmed');
          }
          log.info({ studentId: subRecord.student_id }, 'Subscription deleted, future bookings cancelled');
        }
        break;
      }

      case 'invoice.payment_failed': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const { data: subRecord } = await supabase
            .from('subscriptions')
            .select('student_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();

          const { error } = await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId);

          if (error) {
            log.error({ err: error }, 'Failed to mark subscription past_due');
            return NextResponse.json({ error: 'DB error' }, { status: 500 });
          }

          // Cancel future bookings
          if (subRecord?.student_id) {
            await supabase
              .from('bookings')
              .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
              .eq('student_id', subRecord.student_id)
              .eq('payment_type', 'subscription')
              .eq('status', 'confirmed');
          }

          log.info({ subscriptionId }, 'Invoice payment failed, future bookings cancelled');
        }
        break;
      }

      case 'invoice.paid': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_end: invoice.lines.data[0]?.period?.end
                ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
                : undefined,
            })
            .eq('stripe_subscription_id', subscriptionId);

          if (error) {
            log.error({ err: error }, 'Failed to reactivate subscription');
            return NextResponse.json({ error: 'DB error' }, { status: 500 });
          }
          log.info({ subscriptionId }, 'Invoice paid, subscription reactivated');
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
