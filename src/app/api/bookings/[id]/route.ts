import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, isAuthError } from '@/lib/auth';
import { logger, generateCorrelationId } from '@/lib/logger';

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

    // Refund 1 credit back to the student
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('credits')
      .eq('id', auth.user.id)
      .single();

    if (profile) {
      await adminClient
        .from('profiles')
        .update({ credits: profile.credits + 1 })
        .eq('id', auth.user.id);
      log.info({ bookingId: params.id, credits_refunded: 1, new_balance: profile.credits + 1 }, 'Booking cancelled, credit refunded');
    } else {
      log.info({ bookingId: params.id }, 'Booking cancelled');
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
