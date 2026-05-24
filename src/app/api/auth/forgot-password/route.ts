import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordReset } from '@/lib/password-reset';
import { logger, generateCorrelationId } from '@/lib/logger';

// Public endpoint backing /forgot-password. Routes through generateLink + Resend
// instead of supabase.auth.resetPasswordForEmail (which uses Supabase's
// rate-limited built-in SMTP). We always return ok: true so we don't reveal
// whether an email is on file (avoid account enumeration).
export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  let email = '';
  try {
    const body = await request.json();
    email = String(body?.email || '').trim();
  } catch {
    // bad JSON — fall through, validation below handles it
  }

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Enter a valid email address.' } },
      { status: 400 }
    );
  }

  const result = await sendPasswordReset(email);
  if (!result.sent && result.error) {
    log.error({ err: result.error, email }, 'Public forgot-password failed');
    // Still return ok to avoid account enumeration; the failure is captured
    // server-side for triage.
  } else if (result.skipped === 'no_account') {
    log.info({ email }, 'Forgot-password requested for unknown email — silent ok');
  } else if (result.sent) {
    log.info({ email }, 'Public password reset email sent');
  }

  return NextResponse.json({ ok: true });
}
