import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeMonthRent, WEEKDAY_RATE_CENTS, WEEKEND_RATE_CENTS } from '@/lib/rent';
import { logger, generateCorrelationId } from '@/lib/logger';

const schema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
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

  // Refuse if already locked.
  const { data: existing } = await supabase
    .from('rent_months')
    .select('id')
    .eq('year', parsed.data.year)
    .eq('month', parsed.data.month)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: { code: 'ALREADY_LOCKED', message: 'This month is already locked.' } },
      { status: 409 }
    );
  }

  const { data: classes } = await supabase
    .from('classes')
    .select('starts_at, status')
    .eq('status', 'scheduled');

  const bucket = computeMonthRent(
    (classes || []) as { starts_at: string }[],
    parsed.data.year,
    parsed.data.month,
  );

  const { data: inserted, error } = await supabase
    .from('rent_months')
    .insert({
      year: bucket.year,
      month: bucket.month,
      weekday_hours: bucket.weekday_hours,
      weekend_hours: bucket.weekend_hours,
      weekday_rate_cents: WEEKDAY_RATE_CENTS,
      weekend_rate_cents: WEEKEND_RATE_CENTS,
      total_cents: bucket.total_cents,
      locked_by: auth.user.id,
      notes: parsed.data.notes ?? null,
    })
    .select('*')
    .single();

  if (error) {
    log.error({ err: error, year: parsed.data.year, month: parsed.data.month }, 'Failed to lock rent month');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not lock month.' } },
      { status: 500 }
    );
  }

  log.info(
    { rentMonthId: inserted.id, year: bucket.year, month: bucket.month, totalCents: bucket.total_cents, lockedBy: auth.user.id },
    'Rent month locked',
  );

  return NextResponse.json({ rent_month: inserted });
}
