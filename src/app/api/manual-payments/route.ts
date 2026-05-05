import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger, generateCorrelationId } from '@/lib/logger';

const PACK_PRICING: Record<string, { credits: number; amount_cents: number; label: string }> = {
  single: { credits: 1, amount_cents: 2500, label: 'Drop-In Class' },
  '5pack': { credits: 5, amount_cents: 11200, label: '5-Class Pack' },
  '10pack': { credits: 10, amount_cents: 20000, label: '10-Class Pack' },
};

const VALID_METHODS = new Set(['cash', 'zelle', 'venmo']);

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
    const { data: payment, error } = await supabase
      .from('manual_payments')
      .insert({
        student_id: auth.user.id,
        pack_type,
        credits: pack.credits,
        amount_cents: pack.amount_cents,
        payment_method,
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

    log.info({ studentId: auth.user.id, packType: pack_type, method: payment_method, paymentId: payment.id }, 'Manual payment created');
    return NextResponse.json({ payment_id: payment.id, label: pack.label, amount_cents: pack.amount_cents });
  } catch (err) {
    log.error({ err }, 'POST /api/manual-payments failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
