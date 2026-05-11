import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger, generateCorrelationId } from '@/lib/logger';
import { sendManualPaymentSubmitted } from '@/lib/resend';
import { applyCreditDelta } from '@/lib/credits';

const ADMIN_EMAIL = 'chelsea@maningomethod.com';
const PROVISIONAL_CREDITS = 1;

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
    const { pack_type, payment_method } = await request.json();
    const pack = PACK_PRICING[pack_type];
    if (!pack || !VALID_METHODS.has(payment_method)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid pack or payment method.' } },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Provisional grant: give the buyer 1 credit immediately so they can book
    // and attend one class while we wait on the actual payment. The remainder
    // lands on mark_paid; admin cancel claws this back (subject to balance).
    const provisional = Math.min(PROVISIONAL_CREDITS, pack.credits);

    const { data: payment, error } = await supabase
      .from('manual_payments')
      .insert({
        student_id: auth.user.id,
        pack_type,
        credits: pack.credits,
        amount_cents: pack.amount_cents,
        payment_method,
        provisional_credits_applied: provisional,
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

    let newBalance: number | null = null;
    if (provisional > 0) {
      try {
        const result = await applyCreditDelta({
          studentId: auth.user.id,
          delta: provisional,
          reason: `Manual payment ${payment.id} — provisional credit at submission`,
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
          amount: `$${(pack.amount_cents / 100).toFixed(2)}`,
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
      amount_cents: pack.amount_cents,
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
