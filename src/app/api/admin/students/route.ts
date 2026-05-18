import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

interface SpendRow { id: string; total_cents: number | null }

export async function GET(request: NextRequest) {
  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const supabase = createAdminClient();

  // Typeahead mode: `?q=...&limit=20` returns a slim list for the admin
  // add-member search. Falls back to the full /admin/members payload when q is
  // absent so existing consumers don't break.
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  if (q) {
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 20, 1), 50);
    const pattern = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    const { data, error: searchErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, credits, waiver_signed_at')
      .eq('role', 'student')
      .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
      .order('full_name', { ascending: true })
      .limit(limit);
    if (searchErr) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
        { status: 500 }
      );
    }
    return NextResponse.json({ students: data || [] });
  }

  const { data: students, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, credits, created_at, waiver_signed_at')
    .eq('role', 'student')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }

  // Lifetime spend in one query via the view
  const { data: spends } = await supabase
    .from('student_lifetime_spend')
    .select('id, total_cents');

  const spendMap = new Map<string, number>();
  (spends as SpendRow[] | null)?.forEach((s) => spendMap.set(s.id, s.total_cents || 0));

  // Last attended class per student — pulls confirmed bookings whose class
  // start is in the past, then keeps the most recent per student.
  const nowIso = new Date().toISOString();
  const { data: attended } = await supabase
    .from('bookings')
    .select('student_id, classes!inner(starts_at)')
    .eq('status', 'confirmed')
    .lt('classes.starts_at', nowIso)
    .order('classes(starts_at)', { ascending: false });

  const lastAttendedMap = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (attended as any[] | null)?.forEach((r) => {
    const studentId = r.student_id as string | undefined;
    const startsAt = (r.classes?.starts_at as string | undefined) || undefined;
    if (!studentId || !startsAt) return;
    const prev = lastAttendedMap.get(studentId);
    if (!prev || startsAt > prev) lastAttendedMap.set(studentId, startsAt);
  });

  const result = (students || []).map((s) => ({
    ...s,
    lifetime_spend_cents: spendMap.get(s.id) || 0,
    last_attended_at: lastAttendedMap.get(s.id) || null,
  }));

  return NextResponse.json({ students: result });
}
