import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendClassAnnouncementBatch } from '@/lib/resend';
import { formatStudioDate, formatStudioTime } from '@/lib/timezone';
import { logger, generateCorrelationId } from '@/lib/logger';

const notifySchema = z.object({
  subject: z.string().min(1).max(140),
  message: z.string().min(1).max(4000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const parsed = notifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: classData } = await supabase
      .from('classes')
      .select('title, starts_at')
      .eq('id', params.id)
      .single();

    if (!classData) {
      return NextResponse.json(
        { error: { code: 'CLASS_NOT_FOUND', message: "This class couldn't be found." } },
        { status: 404 }
      );
    }

    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, profiles(full_name, email)')
      .eq('class_id', params.id)
      .in('status', ['pending', 'confirmed']);

    const recipients = (bookings || [])
      .map((b) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profile = (b as any).profiles;
        return {
          email: profile?.email || '',
          studentName: profile?.full_name || 'there',
          classTitle: classData.title,
          classDate: formatStudioDate(classData.starts_at),
          classTime: formatStudioTime(classData.starts_at),
        };
      })
      .filter((r) => r.email);

    if (recipients.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    await sendClassAnnouncementBatch(recipients, parsed.data.subject, parsed.data.message);

    log.info({ classId: params.id, count: recipients.length }, 'Class announcement sent');
    return NextResponse.json({ sent: recipients.length });
  } catch (err) {
    log.error({ err }, 'POST /api/admin/classes/[id]/notify failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
