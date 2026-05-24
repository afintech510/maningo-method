import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPasswordReset } from '@/lib/password-reset';
import { logger, generateCorrelationId } from '@/lib/logger';

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

  const result = await sendPasswordReset(profile.email);
  if (!result.sent) {
    log.error({ targetId: params.id, email: profile.email, ...result }, 'Admin password reset failed');
    return NextResponse.json(
      { error: { code: 'RESET_FAILED', message: result.error || 'Could not send reset email.' } },
      { status: 500 }
    );
  }

  log.info(
    { adminId: auth.user.id, targetStudentId: params.id, email: profile.email },
    'Admin triggered password reset email',
  );

  return NextResponse.json({ sent: true });
}
