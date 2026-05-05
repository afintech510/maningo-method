import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger, generateCorrelationId } from '@/lib/logger';

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
      .select('id, student_id, credits, status')
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', payment.student_id)
        .single();

      await supabase
        .from('profiles')
        .update({ credits: (profile?.credits || 0) + payment.credits })
        .eq('id', payment.student_id);

      log.info({ paymentId: params.id, studentId: payment.student_id, credits: payment.credits }, 'Manual payment marked paid');
      return NextResponse.json({ status: 'paid', credits_added: payment.credits });
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
