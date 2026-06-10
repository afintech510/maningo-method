import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { applyCreditDelta } from '@/lib/credits';
import { generateGiftCode } from '@/lib/gift-codes';
import {
  sendGiftPurchaseConfirmation,
  sendGiftReceived,
  sendCreditPurchaseReceipt,
  sendAdminPurchase,
} from '@/lib/resend';
import { rewardReferrerOnce } from '@/lib/referrals';
import { getBaseUrl } from '@/lib/utils';

const ADMIN_EMAIL = 'chelsea@maningomethod.com';

const PACK_LABEL: Record<string, string> = {
  single: 'Drop-In Class',
  '5pack': '5-Class Pack',
  '10pack': '10-Class Pack',
  custom: 'Custom Gift Pack',
};

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
        if (session.mode !== 'payment') break;

        const md = session.metadata || {};
        const studentId: string | undefined = md.student_id;
        const bookingId: string | undefined = md.booking_id;
        const packType: string | undefined = md.pack_type;
        const credits: string | undefined = md.credits;
        const paymentIntent = session.payment_intent as string;

        if (packType && credits && studentId) {
          const creditsNum = parseInt(credits, 10);

          const { error: purchaseError } = await supabase.from('credit_purchases').insert({
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

          await applyCreditDelta({
            studentId,
            delta: creditsNum,
            reason: `Stripe purchase ${packType}`,
            source: 'stripe_purchase',
            relatedId: paymentIntent || session.id,
          });
          log.info({ studentId, packType, credits: creditsNum }, 'Credits added (checkout.session)');

          await sendPurchaseReceipt({
            studentId,
            packType,
            creditsAdded: creditsNum,
            amountCents: session.amount_total || 0,
            log,
          });
          await notifyAdminPurchase({
            studentId,
            packType,
            creditsAdded: creditsNum,
            amountCents: session.amount_total || 0,
            channel: 'card',
            reference: paymentIntent || session.id,
            log,
          });
          await rewardReferrerOnce(studentId, paymentIntent || session.id, log);
          await markDiscountCodeRedeemed(supabase, md.discount_code_id, 'credit_pack', log);
        } else if (bookingId) {
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
        break;
      }

      case 'payment_intent.succeeded': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const intent = event.data.object as any;
        const md = intent.metadata || {};
        const studentId: string | undefined = md.student_id;
        const isGift: boolean = md.gift === 'true';

        // Gifts may be guest purchases (no student_id). Non-gift packs always require one.
        if (!studentId && !isGift) {
          log.info({ intentId: intent.id }, 'PaymentIntent without student_id; skipping');
          break;
        }

        // Avoid double credit: check if checkout.session.completed already processed this PI
        const { data: existingPurchase } = await supabase
          .from('credit_purchases')
          .select('id')
          .eq('stripe_payment_intent_id', intent.id)
          .maybeSingle();

        if (isGift) {
          // Gift purchase: generate code, insert gift_packs row, send emails.
          // No credits go to the purchaser.
          const { data: existingGift } = await supabase
            .from('gift_packs')
            .select('id')
            .eq('stripe_payment_intent_id', intent.id)
            .maybeSingle();
          if (existingGift) {
            log.info({ intentId: intent.id, giftId: existingGift.id }, 'Gift already recorded');
            break;
          }

          const packType: string = md.gift_pack || 'custom';
          const giftCredits: number = Number(md.gift_credits || 0);
          const recipientName: string | null = md.recipient_name || null;
          const recipientEmail: string | null = md.recipient_email || null;
          const senderMessage: string | null = md.sender_message || null;
          const deliveryMode: 'email' | 'share' = md.delivery_mode === 'email' ? 'email' : 'share';

          // Try generate unique code (3 attempts)
          let code = generateGiftCode();
          for (let i = 0; i < 3; i++) {
            const { data: existingCode } = await supabase
              .from('gift_packs')
              .select('id')
              .eq('code', code)
              .maybeSingle();
            if (!existingCode) break;
            code = generateGiftCode();
          }

          // Resolve purchaser identity: prefer authed studentId, fall back to
          // metadata fields captured during guest checkout.
          let purchaserName: string | null = md.purchaser_name || null;
          let purchaserEmail: string | null = md.purchaser_email || null;
          if (studentId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', studentId)
              .single();
            if (profile?.email) purchaserEmail = profile.email;
            if (profile?.full_name) purchaserName = profile.full_name;
          }

          const { data: gift, error: insertErr } = await supabase
            .from('gift_packs')
            .insert({
              code,
              purchaser_id: studentId || null,
              purchaser_email: purchaserEmail,
              purchaser_name: purchaserName,
              recipient_name: recipientName,
              recipient_email: recipientEmail,
              sender_message: senderMessage,
              delivery_mode: deliveryMode,
              pack_type: packType,
              credits: giftCredits,
              amount_cents: intent.amount_received || intent.amount,
              stripe_payment_intent_id: intent.id,
              status: 'active',
            })
            .select('id, code')
            .single();
          if (insertErr) {
            log.error({ err: insertErr, intentId: intent.id }, 'Failed to insert gift_pack row');
            return NextResponse.json({ error: 'DB error' }, { status: 500 });
          }

          const baseUrl = getBaseUrl();
          const redemptionUrl = `${baseUrl}/redeem`;
          const packLabel = PACK_LABEL[packType] || 'Maningo Method gift';
          const amountDisplay = `$${((intent.amount_received || intent.amount) / 100).toFixed(2)}`;

          const isDollarBalance = packType === 'custom';
          if (purchaserEmail) {
            await sendGiftPurchaseConfirmation(purchaserEmail, {
              purchaserName: purchaserName || 'there',
              recipientName,
              packLabel,
              amountDisplay,
              code: gift.code,
              redemptionUrl,
              deliveryMode,
              isDollarBalance,
            });
          }
          if (deliveryMode === 'email' && recipientEmail) {
            await sendGiftReceived(recipientEmail, {
              recipientName: recipientName || 'friend',
              senderName: purchaserName || 'A Maningo Method gift',
              senderMessage,
              packLabel,
              code: gift.code,
              redemptionUrl,
              amountDisplay: isDollarBalance ? amountDisplay : null,
              isDollarBalance,
            });
          }
          // Notify admin of the new gift sale
          await sendAdminPurchase(ADMIN_EMAIL, {
            buyerName: purchaserName || 'Guest',
            buyerEmail: purchaserEmail || 'unknown',
            packLabel,
            credits: giftCredits,
            amount: amountDisplay,
            channel: 'gift',
            giftCode: gift.code,
            recipientName,
            recipientEmail,
            reference: intent.id,
          });

          log.info({ giftId: gift.id, code: gift.code, deliveryMode }, 'Gift purchase complete');
          break;
        }

        // Non-gift pack purchase via PaymentIntent (integrated checkout)
        if (!studentId) {
          log.info({ intentId: intent.id }, 'Non-gift PI without student_id; skipping');
          break;
        }
        if (existingPurchase) {
          log.info({ intentId: intent.id }, 'Already recorded by prior event');
          break;
        }

        const packType: string | undefined = md.pack_type;
        const credits: string | undefined = md.credits;
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

          await applyCreditDelta({
            studentId,
            delta: creditsNum,
            reason: `Stripe purchase ${packType}`,
            source: 'stripe_purchase',
            relatedId: intent.id,
          });
          log.info({ studentId, packType, credits: creditsNum, intentId: intent.id }, 'Credits added (PI)');

          await sendPurchaseReceipt({
            studentId,
            packType,
            creditsAdded: creditsNum,
            amountCents: intent.amount_received || intent.amount,
            serviceFeeCents: Number(md.service_fee_cents || 0),
            log,
          });
          await notifyAdminPurchase({
            studentId,
            packType,
            creditsAdded: creditsNum,
            amountCents: intent.amount_received || intent.amount,
            channel: 'card',
            reference: intent.id,
            log,
          });
          await rewardReferrerOnce(studentId, intent.id, log);
          await markDiscountCodeRedeemed(supabase, md.discount_code_id, 'credit_pack', log);
        } else if (!isGift && md.discount_code_id) {
          // Drop-in inline path or any other discounted non-pack PI.
          await markDiscountCodeRedeemed(supabase, md.discount_code_id, 'drop_in', log);
        }
        break;
      }

      default:
        log.info('Unhandled event type');
    }

    await supabase.from('processed_stripe_events').insert({ event_id: event.id, event_type: event.type });
    return NextResponse.json({ received: true });
  } catch (err) {
    log.error({ err }, 'Webhook processing failed');
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function markDiscountCodeRedeemed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  codeId: string | undefined,
  context: 'credit_pack' | 'drop_in' | 'gift_card',
  log: { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void },
): Promise<void> {
  if (!codeId) return;
  // Atomic increment: bumps redemption_count, stamps first-use metadata, and
  // deactivates the code once it hits its cap. Webhook duplicate events are
  // already filtered by the processed_stripe_events guard, so this fires once
  // per real purchase.
  const { error } = await supabase.rpc('consume_discount_code', {
    p_id: codeId,
    p_context: context,
  });
  if (error) {
    log.error({ err: error, codeId }, 'Failed to mark discount code redeemed');
  } else {
    log.info({ codeId, context }, 'Discount code redeemed');
  }
}

// Send the post-purchase receipt email after credits land.
async function sendPurchaseReceipt(args: {
  studentId: string;
  packType: string;
  creditsAdded: number;
  amountCents: number;
  serviceFeeCents?: number;
  log: { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void };
}): Promise<void> {
  const { studentId, packType, creditsAdded, amountCents, serviceFeeCents, log } = args;
  try {
    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, credits')
      .eq('id', studentId)
      .single();
    if (!profile?.email) return;

    const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    await sendCreditPurchaseReceipt(profile.email, {
      studentName: (profile.full_name || '').split(' ')[0] || 'there',
      packLabel: PACK_LABEL[packType] || packType,
      creditsAdded,
      amountPaid: fmt(amountCents),
      serviceFee: serviceFeeCents ? fmt(serviceFeeCents) : undefined,
      newBalance: profile.credits || 0,
    });
    log.info({ studentId, packType, creditsAdded }, 'Purchase receipt sent');
  } catch (err) {
    log.error({ err, studentId }, 'Purchase receipt email failed');
  }
}

// Send "new sale" notification to Chelsea for every paid purchase.
async function notifyAdminPurchase(args: {
  studentId: string;
  packType: string;
  creditsAdded: number;
  amountCents: number;
  channel: 'card' | 'cash' | 'venmo';
  reference?: string;
  log: { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void };
}): Promise<void> {
  const { studentId, packType, creditsAdded, amountCents, channel, reference, log } = args;
  try {
    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', studentId)
      .single();
    await sendAdminPurchase(ADMIN_EMAIL, {
      buyerName: profile?.full_name || 'Unknown',
      buyerEmail: profile?.email || 'unknown',
      packLabel: PACK_LABEL[packType] || packType,
      credits: creditsAdded,
      amount: `$${(amountCents / 100).toFixed(2)}`,
      channel,
      reference,
    });
  } catch (err) {
    log.error({ err, studentId }, 'Admin purchase notification failed');
  }
}

