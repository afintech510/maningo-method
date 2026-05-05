import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('manual_payments')
    .select('id, student_id, pack_type, credits, amount_cents, payment_method, status, created_at, paid_at, profiles:student_id (full_name, email, phone)')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
  return NextResponse.json({ payments: data || [] });
}
