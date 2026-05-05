import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { registerSchema } from '@/validations/auth';
import { logger, generateCorrelationId } from '@/lib/logger';

const SMS_CONSENT_TEXT =
  'I agree to receive class reminders, schedule changes, and (only if separately opted in for marketing) promotional text messages from Maningo Method. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help.';
const TOS_VERSION = '2026-05-05';

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.issues[0]?.message ?? 'Invalid input' } },
        { status: 400 }
      );
    }
    const { full_name, email, phone, password, sms_consent, email_marketing_consent } = result.data;

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;

    const admin = createAdminClient();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone },
    });

    if (createErr || !created?.user) {
      const msg = createErr?.message || 'Could not create account';
      const code = msg.toLowerCase().includes('already') ? 'EMAIL_TAKEN' : 'AUTH_ERROR';
      return NextResponse.json({ error: { code, message: msg } }, { status: 400 });
    }

    const userId = created.user.id;
    const now = new Date().toISOString();

    const { error: profileErr } = await admin
      .from('profiles')
      .update({
        full_name,
        phone,
        sms_consent,
        sms_consent_at: sms_consent ? now : null,
        sms_consent_ip: sms_consent ? ip : null,
        sms_consent_text: sms_consent ? SMS_CONSENT_TEXT : null,
        email_marketing_consent,
        email_marketing_consent_at: email_marketing_consent ? now : null,
        tos_accepted_at: now,
        tos_accepted_ip: ip,
        tos_version: TOS_VERSION,
      })
      .eq('id', userId);

    if (profileErr) {
      log.error({ err: profileErr, userId }, 'Failed to record consent on profile');
    }

    // Sign the user in so they have a session for any redirect (e.g. checkout)
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      log.error({ err: signInErr }, 'Auto sign-in after register failed');
    }

    log.info({ userId, sms_consent, email_marketing_consent }, 'New user registered with consent');
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error({ err }, 'POST /api/auth/register failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
