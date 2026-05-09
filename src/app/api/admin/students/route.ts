import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

interface SpendRow { id: string; total_cents: number | null }

export async function GET() {
  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const supabase = createAdminClient();

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

  const result = (students || []).map((s) => ({
    ...s,
    lifetime_spend_cents: spendMap.get(s.id) || 0,
  }));

  return NextResponse.json({ students: result });
}
