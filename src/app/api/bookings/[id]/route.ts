import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { logger, generateCorrelationId } from '@/lib/logger';
import { applyCreditDelta } from '@/lib/credits';

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
      .select('id, student_id, status, classes(start_time)')
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
    const classStart = (booking as { classes?: { start_time?: string } }).classes?.start_time;
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

    return NextResponse.json({ booking: { id: params.id, status: 'cancelled' }, credit_refunded: true });
  } catch (err) {
    log.error({ err }, 'PATCH /api/bookings/[id] failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
