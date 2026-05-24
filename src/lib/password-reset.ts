import { createElement } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResend, FROM_EMAIL, REPLY_TO } from '@/lib/resend';
import { PasswordReset } from '@/emails/PasswordReset';
import { logger } from '@/lib/logger';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.maningomethod.com';

interface Result {
  sent: boolean;
  skipped?: 'no_account';
  error?: string;
}

/**
 * Mint a Supabase recovery link via the admin API (which does NOT send an
 * email itself) and deliver it through Resend. The previous implementation
 * called supabase.auth.resetPasswordForEmail, which routes through Supabase's
 * built-in SMTP — that gets rate-limited / dropped silently. Resend is the
 * studio's verified sender for every other transactional email, so this gives
 * password resets the same deliverability as booking confirmations.
 *
 * Returns silently-ok when the email isn't on file (caller decides whether to
 * leak that to the user; admin path can; public forgot-password page should
 * report success either way so we don't enumerate accounts).
 */
export async function sendPasswordReset(email: string): Promise<Result> {
  const supabase = createAdminClient();

  // Look up the auth user — generateLink expects an email that already exists.
  // Querying profiles is enough; if profile is missing we still try the link
  // call in case the auth user exists but the profile row was somehow purged.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .ilike('email', email)
    .maybeSingle();

  if (!profile) {
    // Caller may choose to silently no-op (public flow) or surface this
    // (admin flow can distinguish).
    return { sent: false, skipped: 'no_account' };
  }

  const firstName = (profile.full_name || '').split(' ')[0] || 'there';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: linkData, error: linkErr } = await (supabase.auth.admin as any).generateLink({
    type: 'recovery',
    email: profile.email,
    options: { redirectTo: `${SITE_URL}/reset-password` },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    logger.error({ err: linkErr, email }, 'generateLink for password reset failed');
    return { sent: false, error: linkErr?.message || 'Could not mint reset link.' };
  }

  const resetUrl: string = linkData.properties.action_link;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
      to: profile.email,
      subject: 'Reset your Maningo Method password',
      react: createElement(PasswordReset, { firstName, resetUrl }),
    });
    return { sent: true };
  } catch (err) {
    logger.error({ err, email }, 'Password reset Resend send failed');
    return { sent: false, error: (err as Error).message };
  }
}
