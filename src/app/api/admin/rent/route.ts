import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeMonthRent, currentStudioMonth, WEEKDAY_RATE_CENTS, WEEKEND_RATE_CENTS } from '@/lib/rent';

export async function GET() {
  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const supabase = createAdminClient();

  const [{ data: locked }, { data: payments }, { data: classes }] = await Promise.all([
    supabase
      .from('rent_months')
      .select('id, year, month, weekday_hours, weekend_hours, weekday_rate_cents, weekend_rate_cents, total_cents, locked_at, locked_by, notes')
      .order('year', { ascending: false })
      .order('month', { ascending: false }),
    supabase
      .from('rent_payments')
      .select('id, rent_month_id, amount_cents, paid_on, recorded_at, recorded_by, notes')
      .order('paid_on', { ascending: false }),
    supabase
      .from('classes')
      .select('starts_at, status')
      .eq('status', 'scheduled'),
  ]);

  // Roll payments up per month
  const paymentsByMonth = new Map<string, { id: string; rent_month_id: string; amount_cents: number; paid_on: string; recorded_at: string; recorded_by: string | null; notes: string | null }[]>();
  type Payment = { id: string; rent_month_id: string; amount_cents: number; paid_on: string; recorded_at: string; recorded_by: string | null; notes: string | null };
  (payments as Payment[] | null)?.forEach((p) => {
    const arr = paymentsByMonth.get(p.rent_month_id) || [];
    arr.push(p);
    paymentsByMonth.set(p.rent_month_id, arr);
  });

  const lockedWithPayments = (locked || []).map((m) => {
    const ps = paymentsByMonth.get(m.id) || [];
    const paidCents = ps.reduce((s, p) => s + (p.amount_cents || 0), 0);
    return {
      ...m,
      payments: ps,
      paid_cents: paidCents,
      paid_in_full: paidCents >= (m.total_cents || 0) && (m.total_cents || 0) > 0,
    };
  });

  // Next un-locked month preview: start from current studio month and walk
  // forward until we find one without a rent_months row.
  const lockedKeySet = new Set((locked || []).map((m) => `${m.year}-${m.month}`));
  const cm = currentStudioMonth();
  let py = cm.year;
  let pm = cm.month;
  for (let i = 0; i < 13; i++) {
    if (!lockedKeySet.has(`${py}-${pm}`)) break;
    if (pm === 12) {
      py += 1;
      pm = 1;
    } else {
      pm += 1;
    }
  }
  const preview = computeMonthRent((classes || []) as { starts_at: string }[], py, pm);

  return NextResponse.json({
    locked: lockedWithPayments,
    preview,
    rates: { weekday_cents: WEEKDAY_RATE_CENTS, weekend_cents: WEEKEND_RATE_CENTS },
  });
}
