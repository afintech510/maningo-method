import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyCreditDelta } from '@/lib/credits';
import { logger, generateCorrelationId } from '@/lib/logger';
import { sendWaitlistPromoted } from '@/lib/resend';
import { formatStudioDate, formatStudioTime } from '@/lib/timezone';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  try {
    const supabase = createClient();

    const { data: result, error: rpcError } = await supabase.rpc('promote_from_waitlist', {
      p_waitlist_id: params.id,
    });

    if (rpcError) {
      const code = rpcError.message;
      const errorMap: Record<string, { status: number; message: string }> = {
        WAITLIST_NOT_FOUND: { status: 404, message: 'Waitlist entry not found.' },
        NOT_WAITING: { status: 409, message: 'This entry is no longer active.' },
        NO_CREDITS: { status: 402, message: "This member doesn't have enough credits to be promoted." },
        ALREADY_BOOKED: { status: 409, message: 'This member is already booked for this class.' },
        ADMIN_REQUIRED: { status: 403, message: 'Admin access required.' },
      };

      const mapped = errorMap[code];
      if (mapped) {
        return NextResponse.json(
          { error: { code, message: mapped.message } },
          { status: mapped.status }
        );
      }

      log.error({ err: rpcError }, 'promote_from_waitlist RPC failed');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
        { status: 500 }
      );
    }

    const { booking_id, student_id, class_id, booked_count, max_capacity } = result;

    // Deduct credit via the TS helper (keeps ledger consistent)
    try {
      await applyCreditDelta({
        studentId: student_id,
        delta: -1,
        reason: `Waitlist promotion → booking ${booking_id}`,
        source: 'booking_create',
        adminId: auth.user.id,
        relatedId: String(booking_id),
      });
    } catch (creditErr) {
      // Roll back: delete the booking and revert waitlist entry
      const adminClient = createAdminClient();
      await adminClient.from('bookings').delete().eq('id', booking_id);
      await adminClient
        .from('waitlists')
        .update({ status: 'waiting', promoted_at: null })
        .eq('id', params.id);

      log.error({ err: creditErr, studentId: student_id }, 'Credit deduction failed after promote; rolled back');
      return NextResponse.json(
        { error: { code: 'CREDIT_DEDUCTION_FAILED', message: 'Could not deduct credit; promotion reverted.' } },
        { status: 500 }
      );
    }

    log.info({ waitlistId: params.id, bookingId: booking_id, studentId: student_id }, 'Waitlist promotion completed');

    // Send promotion email (fire-and-forget)
    void (async () => {
      try {
        const adminClient = createAdminClient();
        const { data: profile } = await adminClient
          .from('profiles')
          .select('email, full_name')
          .eq('id', student_id)
          .single();
        const { data: cls } = await adminClient
          .from('classes')
          .select('title, starts_at')
          .eq('id', class_id)
          .single();
        if (!profile || !cls) return;

        await sendWaitlistPromoted(profile.email, {
          studentName: (profile.full_name || '').split(' ')[0] || 'there',
          classTitle: cls.title,
          classDate: formatStudioDate(cls.starts_at, 'EEEE, MMM d'),
          classTime: formatStudioTime(cls.starts_at),
        });
      } catch (err) {
        log.error({ err, bookingId: booking_id }, 'Waitlist promotion email failed');
      }
    })();

    return NextResponse.json({
      booking_id,
      student_id,
      booked_count,
      max_capacity,
    });
  } catch (err) {
    log.error({ err }, 'POST /api/admin/waitlist/[id]/promote failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
