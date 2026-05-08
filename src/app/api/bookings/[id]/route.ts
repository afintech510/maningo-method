import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, isAuthError } from '@/lib/auth';
import { logger, generateCorrelationId } from '@/lib/logger';
import { applyCreditDelta } from '@/lib/credits';
import { sendBookingCancellation } from '@/lib/resend';
import { formatStudioDate, formatStudioTime } from '@/lib/timezone';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();

    if (body.status !== 'cancelled') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Only cancellation is supported.' } },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Verify ownership and load class start time
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, student_id, status, classes(starts_at)')
      .eq('id', params.id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: { code: 'BOOKING_NOT_FOUND', message: "This booking couldn't be found." } },
        { status: 404 }
      );
    }

    if (booking.student_id !== auth.user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: "You don't have access to this." } },
        { status: 403 }
      );
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: { code: 'ALREADY_CANCELLED', message: 'This booking is already cancelled.' } },
        { status: 409 }
      );
    }

    // Enforce 12-hour cancellation cutoff
    const classesField = (booking as { classes?: { starts_at?: string } | { starts_at?: string }[] }).classes;
    const classStart = Array.isArray(classesField) ? classesField[0]?.starts_at : classesField?.starts_at;
    if (classStart) {
      const hoursUntilClass = (new Date(classStart).getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilClass < 12) {
        return NextResponse.json(
          {
            error: {
              code: 'CANCELLATION_WINDOW_CLOSED',
              message:
                'Classes can only be cancelled up to 12 hours before start time. For emergencies, please contact Chelsea directly to refund your credit.',
            },
          },
          { status: 400 }
        );
      }
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', params.id);

    if (updateError) {
      log.error({ err: updateError }, 'Failed to cancel booking');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
        { status: 500 }
      );
    }

    // Refund 1 credit back to the student (atomic + audit)
    try {
      const { newBalance } = await applyCreditDelta({
        studentId: auth.user.id,
        delta: 1,
        reason: `Cancellation refund for booking ${params.id}`,
        source: 'booking_cancel',
        relatedId: params.id,
      });
      log.info({ bookingId: params.id, new_balance: newBalance }, 'Booking cancelled, credit refunded');
    } catch (err) {
      log.error({ err, bookingId: params.id }, 'Credit refund failed; cancellation persists');
    }

    // Fire-and-forget cancellation confirmation email
    void (async () => {
      try {
        const admin = createAdminClient();
        const { data: cls } = await admin
          .from('classes')
          .select('title, starts_at')
          .eq('id', (booking as { class_id?: string }).class_id || '')
          .single();
        // booking from the SELECT above doesn't include class_id by default; load via bookings table
        let title = '';
        let startsAt = classStart;
        if (!cls) {
          const { data: b2 } = await admin
            .from('bookings')
            .select('classes(title, starts_at)')
            .eq('id', params.id)
            .single();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const c = (b2 as any)?.classes;
          title = c?.title || 'your class';
          startsAt = c?.starts_at || startsAt;
        } else {
          title = cls.title;
          startsAt = cls.starts_at;
        }
        if (!startsAt) return;
        await sendBookingCancellation(auth.user.email, {
          studentName: (auth.user.full_name || '').split(' ')[0] || 'there',
          classTitle: title,
          classDate: formatStudioDate(startsAt, 'EEEE, MMM d'),
          classTime: formatStudioTime(startsAt),
        });
      } catch (err) {
        log.error({ err, bookingId: params.id }, 'Cancellation email failed');
      }
    })();

    return NextResponse.json({ booking: { id: params.id, status: 'cancelled' }, credit_refunded: true });
  } catch (err) {
    log.error({ err }, 'PATCH /api/bookings/[id] failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
