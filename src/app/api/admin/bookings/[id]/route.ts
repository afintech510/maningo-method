import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyCreditDelta } from '@/lib/credits';
import { shouldRefundOnCancel } from '@/lib/admin-bookings';
import { logger, generateCorrelationId } from '@/lib/logger';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const supabase = createAdminClient();

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, student_id, payment_type, status, added_by_admin')
    .eq('id', params.id)
    .single();
  if (!booking) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Booking not found.' } },
      { status: 404 }
    );
  }
  if (booking.status === 'cancelled') {
    return NextResponse.json(
      { error: { code: 'ALREADY_CANCELLED', message: 'Booking already cancelled.' } },
      { status: 409 }
    );
  }

  const { error: updateErr } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', params.id);
  if (updateErr) {
    log.error({ err: updateErr, bookingId: params.id }, 'Failed to cancel booking');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not cancel.' } },
      { status: 500 }
    );
  }

  let refunded = false;
  if (shouldRefundOnCancel(booking.payment_type, booking.added_by_admin)) {
    try {
      await applyCreditDelta({
        studentId: booking.student_id,
        delta: 1,
        reason: `Admin cancelled booking ${booking.id}`,
        source: 'booking_cancel',
        adminId: auth.user.id,
        relatedId: booking.id,
      });
      refunded = true;
    } catch (err) {
      log.error({ err, bookingId: params.id }, 'Refund failed after cancel');
    }
  }

  log.info(
    { bookingId: params.id, refunded, paymentType: booking.payment_type, addedByAdmin: booking.added_by_admin },
    'Admin removed booking',
  );
  return NextResponse.json({ cancelled: true, refunded });
}
