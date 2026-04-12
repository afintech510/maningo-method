import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    // Verify ownership
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, student_id, status')
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

    // Email trigger will be added in Phase 3
    log.info({ bookingId: params.id }, 'Booking cancelled');
    return NextResponse.json({ booking: { id: params.id, status: 'cancelled' } });
  } catch (err) {
    log.error({ err }, 'PATCH /api/bookings/[id] failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
