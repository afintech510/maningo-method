import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { sendClassReminderBatch } from '@/lib/resend';
import { googleCalendarUrl, icsUrl } from '@/lib/calendar';
import { formatStudioDate, formatStudioTime } from '@/lib/timezone';
import { getBaseUrl } from '@/lib/utils';

// Sends a 24h class reminder to every confirmed booker who hasn't been
// notified yet. Run this every 15-60 minutes via VPS cron:
//
//   curl -fsS "https://www.maningomethod.com/api/cron/class-reminders?key=$CRON_SECRET"
//
// The endpoint is idempotent: bookings.reminder_sent_at gates re-sends.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const key = searchParams.get('key');
  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();
    const now = new Date();
    // Window: classes starting between now+1h (so reminders also catch
    // same-day bookings within the day-of) and now+30h (covers full 24h ahead).
    const windowStart = new Date(now.getTime() + 60 * 60_000).toISOString();
    const windowEnd = new Date(now.getTime() + 30 * 60 * 60_000).toISOString();

    const { data: rows, error } = await supabase
      .from('bookings')
      .select(`
        id,
        student_id,
        classes!inner(id, title, starts_at, duration_minutes, status),
        profiles!bookings_student_id_fkey(email, full_name)
      `)
      .eq('status', 'confirmed')
      .is('reminder_sent_at', null)
      .gte('classes.starts_at', windowStart)
      .lte('classes.starts_at', windowEnd);

    if (error) {
      logger.error({ err: error }, 'class-reminders query failed');
      return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }

    type Row = {
      id: string;
      student_id: string;
      classes: { id: string; title: string; starts_at: string; duration_minutes: number; status: string };
      profiles: { email: string | null; full_name: string | null };
    };
    const candidates = (rows || []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => r.classes?.status === 'scheduled' && r.profiles?.email
    ) as unknown as Row[];

    if (candidates.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    const baseUrl = getBaseUrl();
    const recipients = candidates.map((r) => {
      const cls = r.classes;
      const startsAt = new Date(cls.starts_at);
      const hoursUntil = Math.round((startsAt.getTime() - now.getTime()) / (60 * 60_000));
      const calEvent = {
        id: r.id,
        title: `Maningo Method · ${cls.title}`,
        startsAt: cls.starts_at,
        durationMinutes: cls.duration_minutes,
      };
      return {
        email: r.profiles.email!,
        studentName: (r.profiles.full_name || '').split(' ')[0] || 'there',
        classTitle: cls.title,
        classDate: formatStudioDate(cls.starts_at, 'EEEE, MMM d'),
        classTime: formatStudioTime(cls.starts_at),
        hoursUntil,
        googleCalUrl: googleCalendarUrl(calEvent),
        icsUrl: `${baseUrl}${icsUrl(r.id)}`,
      };
    });

    await sendClassReminderBatch(recipients);

    // Mark each booking as reminded
    const ids = candidates.map((r) => r.id);
    if (ids.length > 0) {
      await supabase
        .from('bookings')
        .update({ reminder_sent_at: now.toISOString() })
        .in('id', ids);
    }

    logger.info({ sent: recipients.length }, 'Class reminders dispatched');
    return NextResponse.json({ sent: recipients.length });
  } catch (err) {
    logger.error({ err }, 'class-reminders cron failed');
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}
