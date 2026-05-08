import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildIcs } from '@/lib/calendar';

// Public ICS download for a confirmed booking. The booking id is unguessable
// (uuid), so we don't auth-gate this route — the same way Apple/Outlook
// .ics email attachments are accessible by URL once issued.
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const rawId = params.id.replace(/\.ics$/i, '');
  const supabase = createAdminClient();

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id, status, classes(title, starts_at, duration_minutes)')
    .eq('id', rawId)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cls = (booking as any).classes;
  if (!cls) {
    return NextResponse.json({ error: 'Class data missing' }, { status: 404 });
  }

  const ics = buildIcs({
    id: booking.id,
    title: `Maningo Method · ${cls.title}`,
    startsAt: cls.starts_at,
    durationMinutes: cls.duration_minutes,
  });

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="maningo-${rawId}.ics"`,
      'Cache-Control': 'private, max-age=600',
    },
  });
}
