import { createElement } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResend, FROM_EMAIL, REPLY_TO } from '@/lib/resend';
import { ReviewRequestEmail } from '@/emails/ReviewRequestEmail';
import { logger } from '@/lib/logger';

// TODO drop the real Google Place ID in once the studio is verified.
// The placeholder lets the button render — Google handles the fallback
// gracefully when the placeId is invalid, but for best UX swap it ASAP.
const GOOGLE_PLACE_ID = process.env.GOOGLE_PLACE_ID || '';
const REVIEW_URL_BASE = GOOGLE_PLACE_ID
  ? `https://search.google.com/local/writereview?placeid=${GOOGLE_PLACE_ID}`
  : 'https://www.google.com/search?q=Maningo+Method+Speonk+NY+reviews';

const BOOKING_URL = 'https://www.maningomethod.com/schedule?utm_source=email&utm_medium=review_request&utm_campaign=post_class';
const REVIEW_URL = `${REVIEW_URL_BASE}${GOOGLE_PLACE_ID ? '&' : '&'}utm_source=email&utm_medium=review_request&utm_campaign=post_class`;

interface Result {
  sent: boolean;
  skipped?: 'already_sent' | 'no_email' | 'no_member';
  error?: string;
}

/**
 * Send a single review-request email to a member, gated by the
 * marketing_emails_sent UNIQUE (member_id, email_type) dedup. Returns the
 * outcome so the caller (typically a cron) can tally results.
 *
 * Insert into marketing_emails_sent FIRST so concurrent runs collide on the
 * unique constraint and only one proceeds.
 *
 * No discount code is minted today — discount-code infrastructure remains
 * available for future flows (the validate endpoint + checkout wiring are
 * intact), but this email is a plain ask.
 */
export async function sendReviewRequest(memberId: string): Promise<Result> {
  const supabase = createAdminClient();

  // 1. Claim the send by inserting the dedup row.
  const { error: dupErr } = await supabase
    .from('marketing_emails_sent')
    .insert({ member_id: memberId, email_type: 'review_request' });
  if (dupErr) {
    // Postgres unique_violation = 23505 → already sent; anything else is real failure.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = (dupErr as any).code;
    if (code === '23505') return { sent: false, skipped: 'already_sent' };
    return { sent: false, error: dupErr.message };
  }

  // 2. Fetch the member.
  const { data: member, error: memberErr } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', memberId)
    .single();
  if (memberErr || !member) {
    return { sent: false, skipped: 'no_member', error: memberErr?.message };
  }
  if (!member.email) {
    return { sent: false, skipped: 'no_email' };
  }
  const firstName = (member.full_name || '').split(' ')[0] || 'there';

  // 3. Send.
  try {
    const resend = getResend();
    await resend.emails.send({
      from: `Maningo Method <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
      to: member.email,
      subject: `Thank you for your first class, ${firstName} 🧘`,
      react: createElement(ReviewRequestEmail, {
        firstName,
        reviewUrl: REVIEW_URL,
        bookingUrl: BOOKING_URL,
      }),
    });
    return { sent: true };
  } catch (err) {
    logger.error({ err, memberId }, 'Review-request send failed');
    return { sent: false, error: (err as Error).message };
  }
}
