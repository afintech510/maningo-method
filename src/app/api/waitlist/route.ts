import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, isAuthError } from '@/lib/auth';
import { logger, generateCorrelationId } from '@/lib/logger';
import { sendWaitlistJoined } from '@/lib/resend';
import { formatStudioDate, formatStudioTime } from '@/lib/timezone';

export async function POST(request: Request) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const { class_id } = await request.json();

    if (!class_id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'class_id is required.' } },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data: waitlistId, error: rpcError } = await supabase.rpc('join_waitlist', {
      p_class_id: class_id,
    });

    if (rpcError) {
      const code = rpcError.message;
      const errorMap: Record<string, { status: number; message: string }> = {
        NOT_FULL: { status: 400, message: 'This class still has spots available — book directly instead.' },
        ALREADY_BOOKED: { status: 400, message: "You're already booked for this class." },
        ALREADY_WAITING: { status: 400, message: "You're already on the waitlist for this class." },
        NO_CREDITS: { status: 402, message: 'You need a class credit to join the waitlist — grab a pack first.' },
        CLASS_NOT_FOUND: { status: 404, message: "This class couldn't be found." },
        CLASS_CANCELLED: { status: 400, message: 'This class has been cancelled.' },
      };

      const mapped = errorMap[code];
      if (mapped) {
        return NextResponse.json(
          { error: { code, message: mapped.message } },
          { status: mapped.status }
        );
      }

      log.error({ err: rpcError }, 'join_waitlist RPC failed');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
        { status: 500 }
      );
    }

    // Compute FIFO position
    const adminClient = createAdminClient();
    const { data: queueRows } = await adminClient
      .from('waitlists')
      .select('id')
      .eq('class_id', class_id)
      .eq('status', 'waiting')
      .order('created_at', { ascending: true });

    const position = (queueRows || []).findIndex((r) => r.id === waitlistId) + 1;

    log.info({ waitlistId, classId: class_id, position }, 'Member joined waitlist');

    // Send confirmation email (fire-and-forget)
    void (async () => {
      try {
        const { data: cls } = await adminClient
          .from('classes')
          .select('title, starts_at')
          .eq('id', class_id)
          .single();
        if (!cls) return;
        await sendWaitlistJoined(auth.user.email, {
          studentName: (auth.user.full_name || '').split(' ')[0] || 'there',
          classTitle: cls.title,
          classDate: formatStudioDate(cls.starts_at, 'EEEE, MMM d'),
          classTime: formatStudioTime(cls.starts_at),
          position,
        });
      } catch (err) {
        log.error({ err, waitlistId }, 'Waitlist joined email failed');
      }
    })();

    return NextResponse.json({ waitlist: { id: waitlistId, class_id, position } });
  } catch (err) {
    log.error({ err }, 'POST /api/waitlist failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
