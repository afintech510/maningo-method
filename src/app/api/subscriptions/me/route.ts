import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  const supabase = createClient();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('student_id', auth.user.id)
    .single();

  return NextResponse.json({
    subscription: sub ? { status: sub.status, current_period_end: sub.current_period_end } : null,
  });
}
