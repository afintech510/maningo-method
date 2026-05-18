import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger, generateCorrelationId } from '@/lib/logger';

const schema = z.object({
  rent_month_id: z.string().uuid(),
  amount_cents: z.number().int().min(0).max(10_000_000),
  paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('superadmin');
  if (isAuthError(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('rent_payments')
    .insert({
      rent_month_id: parsed.data.rent_month_id,
      amount_cents: parsed.data.amount_cents,
      paid_on: parsed.data.paid_on,
      notes: parsed.data.notes ?? null,
      recorded_by: auth.user.id,
    })
    .select('*')
    .single();

  if (error) {
    log.error({ err: error }, 'Failed to record rent payment');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not record payment.' } },
      { status: 500 }
    );
  }
  return NextResponse.json({ payment: data });
}
