import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger, generateCorrelationId } from '@/lib/logger';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.maningomethod.com';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const supabase = createAdminClient();

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('id', params.id)
    .single();

  if (profileErr || !profile?.email) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Member or email not found.' } },
      { status: 404 }
    );
  }

  // Triggers the same Supabase recovery flow the user-facing /forgot-password
  // page uses. The recipient lands on /reset-password after clicking the link.
  const { error: resetErr } = await supabase.auth.resetPasswordForEmail(profile.email, {
    redirectTo: `${SITE_URL}/reset-password`,
  });

  if (resetErr) {
    log.error({ err: resetErr, adminId: auth.user.id, targetId: params.id }, 'Admin reset-password failed');
    return NextResponse.json(
      { error: { code: 'RESET_FAILED', message: resetErr.message || 'Could not send reset email.' } },
      { status: 500 }
    );
  }

  log.info(
    { adminId: auth.user.id, targetStudentId: params.id, email: profile.email },
    'Admin triggered password reset email',
  );

  return NextResponse.json({ sent: true });
}
