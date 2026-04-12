import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const supabase = createClient();

  const { data: students, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, created_at, subscriptions(status)')
    .eq('role', 'student')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }

  const result = (students || []).map((s) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subs = (s as any).subscriptions;
    const activeSub = Array.isArray(subs) ? subs.find((sub: { status: string }) => sub.status === 'active') : null;
    return {
      id: s.id,
      full_name: s.full_name,
      email: s.email,
      phone: s.phone,
      created_at: s.created_at,
      subscription_status: activeSub ? 'active' : subs?.[0]?.status || null,
    };
  });

  return NextResponse.json({ students: result });
}
