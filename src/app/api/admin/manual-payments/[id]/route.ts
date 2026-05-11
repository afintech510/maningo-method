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
      .select('id, student_id, credits, status, pack_type, amount_cents, payment_method')
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

      const { newBalance } = await applyCreditDelta({
        studentId: payment.student_id,
        delta: payment.credits,
        reason: `Manual payment ${params.id} marked paid`,
        source: 'manual_payment',
        adminId: auth.user.id,
        relatedId: params.id,
      });

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
        { paymentId: params.id, studentId: payment.student_id, credits: payment.credits, newBalance },
        'Manual payment marked paid'
      );
      return NextResponse.json({ status: 'paid', credits_added: payment.credits, new_balance: newBalance });
    }

    const { error: cancelErr } = await supabase
      .from('manual_payments')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', params.id);
    if (cancelErr) {
      return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'DB error.' } }, { status: 500 });
    }
    return NextResponse.json({ status: 'cancelled' });
  } catch (err) {
    log.error({ err }, 'PATCH /api/admin/manual-payments/[id] failed');
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}
