import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { registerSchema } from '@/validations/auth';
import { logger, generateCorrelationId } from '@/lib/logger';
import { sendAdminNewMember } from '@/lib/resend';

const ADMIN_EMAIL = 'chelsea@maningomethod.com';

const SMS_TRANSACTIONAL_CONSENT_TEXT =
  'I provide my prior express written consent to receive recurring transactional text messages (class reminders, schedule changes, account alerts) from Maningo Method, including by means of automated technology, at the mobile number I provided. Consent is not a condition of purchase. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help. Maningo Method does not share, sell, or transfer phone numbers or SMS opt-in data with third parties for marketing.';
const SMS_MARKETING_CONSENT_TEXT =
  'I provide my prior express written consent to receive recurring promotional text messages (offers, new classes, studio news) from Maningo Method, including by means of automated technology, at the mobile number I provided. Consent is not a condition of purchase. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help.';
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
    const { full_name, email, phone, date_of_birth, password, sms_consent, sms_marketing_consent, email_marketing_consent } = result.data;
    const referralCode: string | undefined = typeof body.referral_code === 'string' ? body.referral_code.trim() : undefined;
    const referrerEmail: string | undefined = typeof body.referrer_email === 'string' ? body.referrer_email.trim() : undefined;

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

    // Resolve referrer → profile id. Try the code first (canonical, share-link
    // path), then fall back to email lookup so members who only know their
    // friend's email don't need to chase down a code. Typos / unknown values
    // silently leave referred_by = null — we don't want to block signup.
    let referredBy: string | null = null;
    if (referralCode) {
      const { data: referrer } = await admin
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode.toUpperCase())
        .maybeSingle();
      if (referrer && referrer.id !== userId) {
        referredBy = referrer.id;
      }
    }
    if (!referredBy && referrerEmail) {
      const { data: referrer } = await admin
        .from('profiles')
        .select('id')
        .ilike('email', referrerEmail)
        .maybeSingle();
      if (referrer && referrer.id !== userId) {
        referredBy = referrer.id;
      } else {
        log.info({ referrerEmail }, 'Signup referrer_email did not resolve to an existing member');
      }
    }

    const consentText = [
      sms_consent ? SMS_TRANSACTIONAL_CONSENT_TEXT : null,
      sms_marketing_consent ? SMS_MARKETING_CONSENT_TEXT : null,
    ]
      .filter(Boolean)
      .join('\n\n') || null;

    // Upsert so we don't rely on the auth.users → profiles trigger having fired.
    // Earlier signups got an auth row but no profile row, leaving them stranded.
    const referralCodeForUser = userId.replace(/-/g, '').slice(0, 8).toUpperCase();
    const { error: profileErr } = await admin
      .from('profiles')
      .upsert(
        {
          id: userId,
          full_name,
          email,
          phone,
          date_of_birth: date_of_birth || null,
          role: 'student',
          referral_code: referralCodeForUser,
          sms_consent,
          sms_consent_at: sms_consent ? now : null,
          sms_consent_ip: sms_consent ? ip : null,
          sms_consent_text: consentText,
          sms_marketing_consent,
          sms_marketing_consent_at: sms_marketing_consent ? now : null,
          email_marketing_consent,
          email_marketing_consent_at: email_marketing_consent ? now : null,
          tos_accepted_at: now,
          tos_accepted_ip: ip,
          tos_version: TOS_VERSION,
          waiver_acknowledged: true,
          referred_by: referredBy,
        },
        { onConflict: 'id', ignoreDuplicates: false }
      );

    if (profileErr) {
      log.error({ err: profileErr, userId }, 'Failed to upsert profile after registration');
      return NextResponse.json(
        { error: { code: 'PROFILE_ERROR', message: profileErr.message || 'Could not finalize account.' } },
        { status: 500 }
      );
    }

    // Sign the user in so they have a session for any redirect (e.g. checkout)
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      log.error({ err: signInErr }, 'Auto sign-in after register failed');
    }

    // Notify Chelsea — fire-and-forget so a Resend hiccup never blocks signup
    void (async () => {
      let referredByName: string | null = null;
      if (referredBy) {
        const { data: ref } = await admin
          .from('profiles')
          .select('full_name')
          .eq('id', referredBy)
          .maybeSingle();
        referredByName = ref?.full_name || null;
      }
      await sendAdminNewMember(ADMIN_EMAIL, {
        memberName: full_name,
        memberEmail: email,
        memberPhone: phone || null,
        smsMarketingConsent: sms_marketing_consent,
        emailMarketingConsent: email_marketing_consent,
        referredByName,
        createdAt: new Date(now).toLocaleString('en-US', { timeZone: 'America/New_York' }),
      });
    })();

    log.info(
      { userId, sms_consent, sms_marketing_consent, email_marketing_consent },
      'New user registered with consent'
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error({ err }, 'POST /api/auth/register failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
