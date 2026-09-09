import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

interface SpendRow { id: string; total_cents: number | null }

interface AttendanceStatsRow {
  student_id: string;
  classes_attended: number | string;
  last_attended_at: string | null;
}

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

  // Classes attended + last attended class per student. Uses a grouped
  // aggregate via RPC (one row per student) rather than fetching every
  // confirmed past booking and tallying in JS — the latter silently
  // undercounts once total past bookings exceed PostgREST's 1000-row cap, and
  // because that capped window slides forward over time, established members'
  // counts drift *downward*. See 042_student_attendance_stats.sql.
  const { data: attended } = await supabase.rpc('student_attendance_stats');

  const lastAttendedMap = new Map<string, string>();
  const attendedCountMap = new Map<string, number>();
  (attended as AttendanceStatsRow[] | null)?.forEach((r) => {
    if (!r.student_id) return;
    attendedCountMap.set(r.student_id, Number(r.classes_attended) || 0);
    if (r.last_attended_at) lastAttendedMap.set(r.student_id, r.last_attended_at);
  });

  const result = (students || []).map((s) => ({
    ...s,
    lifetime_spend_cents: spendMap.get(s.id) || 0,
    last_attended_at: lastAttendedMap.get(s.id) || null,
    classes_attended: attendedCountMap.get(s.id) || 0,
  }));

  return NextResponse.json({ students: result });
}
