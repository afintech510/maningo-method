import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger, generateCorrelationId } from '@/lib/logger';
import { sendManualPaymentSubmitted } from '@/lib/resend';
import { applyCreditDelta } from '@/lib/credits';
import { validateDiscountCode, applyDiscount } from '@/lib/marketing/discountCode';

const ADMIN_EMAIL = 'chelsea@maningomethod.com';

const PACK_PRICING: Record<string, { credits: number; amount_cents: number; label: string }> = {
  single: { credits: 1, amount_cents: 2500, label: 'Drop-In Class' },
  '5pack': { credits: 5, amount_cents: 11200, label: '5-Class Pack' },
  '10pack': { credits: 10, amount_cents: 20000, label: '10-Class Pack' },
};

const VALID_METHODS = new Set(['cash', 'venmo']);

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const { pack_type, payment_method, discount_code } = await request.json();
    const pack = PACK_PRICING[pack_type];
    if (!pack || !VALID_METHODS.has(payment_method)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid pack or payment method.' } },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Optional discount code — reduces the dollar amount owed to Chelsea; the
    // credit grant is unchanged. Validated server-side so the client can't
    // forge a discount.
    let amountCents = pack.amount_cents;
    let discountCodeId: string | null = null;
    let discountAmountCents = 0;
    if (discount_code) {
      const result = await validateDiscountCode(supabase, discount_code, auth.user.id);
      if (!result.valid) {
        return NextResponse.json(
          { error: { code: 'INVALID_DISCOUNT', message: result.message || 'Invalid discount code.' } },
          { status: 400 }
        );
      }
      const discounted = applyDiscount(amountCents, result.discount!);
      discountAmountCents = amountCents - discounted;
      amountCents = discounted;
      discountCodeId = result.discount!.id;
    }

    // Provisional grant: drop the FULL pack onto the buyer's balance right away
    // so they can book any class while we wait on the cash/Venmo to land.
    // Admin mark-paid is a no-op for credits afterwards; admin cancel claws
    // back whatever's still on the balance.
    const provisional = pack.credits;

    const { data: payment, error } = await supabase
      .from('manual_payments')
      .insert({
        student_id: auth.user.id,
        pack_type,
        credits: pack.credits,
        amount_cents: amountCents,
        payment_method,
        provisional_credits_applied: provisional,
        discount_code_id: discountCodeId,
        discount_amount_cents: discountAmountCents,
      })
      .select('id')
      .single();

    if (error || !payment) {
      log.error({ err: error }, 'Failed to insert manual payment');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Could not record your payment request.' } },
        { status: 500 }
      );
    }

    // Consume the discount code now (mirrors the Stripe webhook). Cash/Venmo
    // credits are granted provisionally at submission, so the code is spent at
    // the same moment. If an admin later cancels, they can re-activate the code
    // in the marketing manager.
    if (discountCodeId) {
      const { error: rpcErr } = await supabase.rpc('consume_discount_code', {
        p_id: discountCodeId,
        p_context: 'credit_pack',
        p_member_id: auth.user.id,
      });
      if (rpcErr) log.error({ err: rpcErr, discountCodeId }, 'Failed to consume discount code (manual)');
    }

    let newBalance: number | null = null;
    if (provisional > 0) {
      try {
        const result = await applyCreditDelta({
          studentId: auth.user.id,
          delta: provisional,
          reason: `Manual payment ${payment.id} — full pack credited at submission (cash/venmo)`,
          source: 'manual_payment',
          relatedId: payment.id,
        });
        newBalance = result.newBalance;
      } catch (err) {
        // If the provisional grant fails for any reason, the row stays as
        // submitted but we zero the column so mark_paid issues the full amount.
        log.error({ err, paymentId: payment.id }, 'Provisional credit grant failed');
        await supabase
          .from('manual_payments')
          .update({ provisional_credits_applied: 0 })
          .eq('id', payment.id);
      }
    }

    log.info(
      { studentId: auth.user.id, packType: pack_type, method: payment_method, paymentId: payment.id, provisional },
      'Manual payment created'
    );

    // Notify Chelsea so she can keep an eye out for the transfer.
    void (async () => {
      try {
        const { data: studentProfile } = await supabase
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', auth.user.id)
          .single();
        if (!studentProfile) return;
        await sendManualPaymentSubmitted(ADMIN_EMAIL, {
          studentName: studentProfile.full_name || 'Unknown',
          studentEmail: studentProfile.email || auth.user.email,
          studentPhone: studentProfile.phone,
          packLabel: pack.label,
          amount: `$${(amountCents / 100).toFixed(2)}`,
          method: payment_method as 'cash' | 'venmo',
          paymentId: payment.id,
        });
      } catch (err) {
        log.error({ err, paymentId: payment.id }, 'Manual payment notification email failed');
      }
    })();

    return NextResponse.json({
      payment_id: payment.id,
      label: pack.label,
      amount_cents: amountCents,
      discount_amount_cents: discountAmountCents,
      provisional_credits: provisional,
      new_balance: newBalance,
    });
  } catch (err) {
    log.error({ err }, 'POST /api/manual-payments failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
