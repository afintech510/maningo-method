import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { sendReviewRequest } from '@/lib/marketing/sendReviewRequest';

// Fires the review-request email 2-4 hours after a member's FIRST confirmed
// class ends. We don't have a real attendance ping, so "attended" is
// approximated as: status='confirmed' AND class ended at least 2 hours ago.
//
// Run hourly via VPS cron:
//   curl -fsS "https://www.maningomethod.com/api/cron/review-requests?key=$CRON_SECRET"
//
// Idempotent thanks to UNIQUE (member_id, email_type) on marketing_emails_sent.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  if (searchParams.get('key') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });
  }

  const supabase = createAdminClient();
  const now = Date.now();
  // 2h ago is the early end of the window; 24h ago is the late end so we
  // don't perpetually scan the entire backlog. A member outside this window
  // will silently never get the email — acceptable, this is a launch-day +
  // ongoing flow, not a backfill tool.
  const windowStart = new Date(now - 24 * 60 * 60_000).toISOString();
  const windowEnd = new Date(now - 2 * 60 * 60_000).toISOString();

  try {
    // Eligible bookings: confirmed, class ended within the window, and the
    // member has no prior marketing_emails_sent row of type review_request.
    const { data: rows, error } = await supabase
      .from('bookings')
      .select(`
        id,
        student_id,
        classes!inner(starts_at, duration_minutes, status)
      `)
      .eq('status', 'confirmed')
      .eq('classes.status', 'scheduled')
      .gte('classes.starts_at', new Date(now - 26 * 60 * 60_000).toISOString())
      .lte('classes.starts_at', windowEnd);

    if (error) {
      logger.error({ err: error }, 'review-requests query failed');
      return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }

    type Row = {
      id: string;
      student_id: string;
      classes: { starts_at: string; duration_minutes: number; status: string };
    };
    const candidates = (rows || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => r as Row)
      // Require the class to have actually ended.
      .filter((r) => {
        const ended = new Date(r.classes.starts_at).getTime() + r.classes.duration_minutes * 60_000;
        return ended <= new Date(windowEnd).getTime() && ended >= new Date(windowStart).getTime();
      });

    if (candidates.length === 0) {
      return NextResponse.json({ scanned: 0, sent: 0, skipped: 0 });
    }

    // Dedup against members who already received the email — single query
    // instead of N inserts that always fail unique.
    const memberIds = Array.from(new Set(candidates.map((r) => r.student_id)));
    const { data: alreadySent } = await supabase
      .from('marketing_emails_sent')
      .select('member_id')
      .eq('email_type', 'review_request')
      .in('member_id', memberIds);
    const alreadySentSet = new Set((alreadySent || []).map((r) => r.member_id));

    let sent = 0;
    let skipped = 0;
    const failures: Array<{ memberId: string; reason?: string }> = [];

    for (const memberId of memberIds) {
      if (alreadySentSet.has(memberId)) {
        skipped++;
        continue;
      }
      const result = await sendReviewRequest(memberId);
      if (result.sent) sent++;
      else if (result.skipped) skipped++;
      else failures.push({ memberId, reason: result.error });
      // Soft throttle for Resend free-tier 5 req/sec.
      await new Promise((r) => setTimeout(r, 250));
    }

    logger.info({ scanned: candidates.length, sent, skipped, failed: failures.length }, 'Review requests dispatched');
    return NextResponse.json({ scanned: candidates.length, sent, skipped, failed: failures.length });
  } catch (err) {
    logger.error({ err }, 'review-requests cron failed');
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}
