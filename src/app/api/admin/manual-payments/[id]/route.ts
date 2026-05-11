import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger, generateCorrelationId } from '@/lib/logger';
import { applyCreditDelta } from '@/lib/credits';
import { sendAdminPurchase } from '@/lib/resend';
import { rewardReferrerOnce } from '@/lib/referrals';

const ADMIN_EMAIL = 'chelsea@maningomethod.com';
const PACK_LABEL: Record<string, string> = {
  single: 'Drop-In Class',
  '5pack': '5-Class Pack',
  '10pack': '10-Class Pack',
};

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  try {
    const { action } = await request.json();
    if (action !== 'mark_paid' && action !== 'cancel') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid action.' } },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: payment, error: fetchErr } = await supabase
      .from('manual_payments')
      .select(
        'id, student_id, credits, status, pack_type, amount_cents, payment_method, provisional_credits_applied'
      )
      .eq('id', params.id)
      .single();

    if (fetchErr || !payment) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Payment not found.' } },
        { status: 404 }
      );
    }
    if (payment.status !== 'pending') {
      return NextResponse.json(
        { error: { code: 'INVALID_STATE', message: `Payment is already ${payment.status}.` } },
        { status: 409 }
      );
    }

    if (action === 'mark_paid') {
      const { error: updateErr } = await supabase
        .from('manual_payments')
        .update({ status: 'paid', paid_at: new Date().toISOString(), paid_by: auth.user.id })
        .eq('id', params.id);
      if (updateErr) {
        log.error({ err: updateErr }, 'Failed to mark paid');
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'DB error.' } }, { status: 500 });
      }

      // Provisional credit was already granted at submission; only issue the
      // remainder here so the buyer doesn't end up with double credits.
      const provisional = payment.provisional_credits_applied || 0;
      const remaining = payment.credits - provisional;
      let newBalance: number | null = null;
      if (remaining > 0) {
        const r = await applyCreditDelta({
          studentId: payment.student_id,
          delta: remaining,
          reason: `Manual payment ${params.id} marked paid (remainder)`,
          source: 'manual_payment',
          adminId: auth.user.id,
          relatedId: params.id,
        });
        newBalance = r.newBalance;
      } else if (provisional > 0) {
        // No remainder to add — fetch current balance for the response.
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', payment.student_id)
          .single();
        newBalance = profile?.credits ?? null;
      }

      // Referral reward — one credit per referred friend, on their first paid pack
      void rewardReferrerOnce(payment.student_id, params.id, log);

      // Notify admin of the realized sale (after Chelsea confirmed payment)
      void (async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', payment.student_id)
          .single();
        await sendAdminPurchase(ADMIN_EMAIL, {
          buyerName: profile?.full_name || 'Unknown',
          buyerEmail: profile?.email || 'unknown',
          packLabel: PACK_LABEL[payment.pack_type] || payment.pack_type,
          credits: payment.credits,
          amount: `$${(payment.amount_cents / 100).toFixed(2)}`,
          channel: payment.payment_method === 'venmo' ? 'venmo' : 'cash',
          reference: params.id,
        });
      })();

      log.info(
        {
          paymentId: params.id,
          studentId: payment.student_id,
          credits: payment.credits,
          provisional,
          remaining,
          newBalance,
        },
        'Manual payment marked paid'
      );
      return NextResponse.json({
        status: 'paid',
        credits_added: payment.credits,
        provisional_already_granted: provisional,
        new_balance: newBalance,
      });
    }

    // cancel — claw back the provisional credit we granted at submission, but
    // never push the student's balance negative (they may have already booked
    // and attended a class on that credit). Audit row goes in either way.
    const provisional = payment.provisional_credits_applied || 0;
    let reclaimed = 0;
    if (provisional > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', payment.student_id)
        .single();
      reclaimed = Math.min(provisional, profile?.credits ?? 0);
      if (reclaimed > 0) {
        try {
          await applyCreditDelta({
            studentId: payment.student_id,
            delta: -reclaimed,
            reason: `Manual payment ${params.id} cancelled — reclaiming provisional credit`,
            source: 'manual_payment',
            adminId: auth.user.id,
            relatedId: params.id,
          });
        } catch (err) {
          log.error({ err, paymentId: params.id }, 'Provisional reclaim failed');
        }
      }
      if (reclaimed < provisional) {
        log.info(
          { paymentId: params.id, provisional, reclaimed },
          'Cancel could not reclaim all provisional credits (member already used some)'
        );
      }
    }

    const { error: cancelErr } = await supabase
      .from('manual_payments')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', params.id);
    if (cancelErr) {
      return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'DB error.' } }, { status: 500 });
    }
    return NextResponse.json({
      status: 'cancelled',
      provisional_reclaimed: reclaimed,
      provisional_outstanding: provisional - reclaimed,
    });
  } catch (err) {
    log.error({ err }, 'PATCH /api/admin/manual-payments/[id] failed');
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}
