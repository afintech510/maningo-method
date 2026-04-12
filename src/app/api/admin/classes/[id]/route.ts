import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { sendClassCancellationBatch, sendRefundReport } from '@/lib/resend';
import { formatStudioDate, formatStudioTime } from '@/lib/timezone';
import { logger, generateCorrelationId } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const supabase = createClient();

    // Special case: cancelling a class
    if (body.status === 'cancelled') {
      // 1. Update class status
      const { error: classError } = await supabase
        .from('classes')
        .update({ status: 'cancelled' })
        .eq('id', params.id);

      if (classError) {
        log.error({ err: classError }, 'Failed to cancel class');
        return NextResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
          { status: 500 }
        );
      }

      // 2. Get class details for emails
      const { data: classData } = await supabase
        .from('classes')
        .select('title, starts_at')
        .eq('id', params.id)
        .single();

      // 3. Get all bookings for this class
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, student_id, payment_type, stripe_payment_intent_id, amount_paid_cents, profiles(full_name, email)')
        .eq('class_id', params.id)
        .in('status', ['pending', 'confirmed']);

      // 4. Cancel all bookings
      const { error: cancelError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('class_id', params.id)
        .in('status', ['pending', 'confirmed']);

      if (cancelError) {
        log.error({ err: cancelError }, 'Failed to cancel bookings');
      }

      // 5. Send batch cancellation emails (REV-021)
      if (classData && bookings && bookings.length > 0) {
        const recipients = bookings.map((b) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const profile = (b as any).profiles;
          return {
            email: profile?.email || '',
            studentName: profile?.full_name || '',
            classTitle: classData.title,
            classDate: formatStudioDate(classData.starts_at),
            classTime: formatStudioTime(classData.starts_at),
          };
        }).filter((r) => r.email);

        sendClassCancellationBatch(recipients);

        // 6. Generate refund report for drop-ins (REV-022)
        const dropInRefunds = bookings
          .filter((b) => b.payment_type === 'drop_in' && b.stripe_payment_intent_id)
          .map((b) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const profile = (b as any).profiles;
            return {
              studentName: profile?.full_name || '',
              studentEmail: profile?.email || '',
              paymentIntentId: b.stripe_payment_intent_id || '',
              amountCents: b.amount_paid_cents || 0,
            };
          });

        if (dropInRefunds.length > 0) {
          sendRefundReport(auth.user.email, {
            classTitle: classData.title,
            refunds: dropInRefunds,
          });
        }
      }

      log.info({ classId: params.id, cancelledBookings: bookings?.length || 0 }, 'Class cancelled');
      return NextResponse.json({
        class: { id: params.id, status: 'cancelled' },
        cancelled_bookings: bookings?.length || 0,
      });
    }

    // Regular update
    const { data: updated, error } = await supabase
      .from('classes')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      log.error({ err: error }, 'Failed to update class');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ class: updated });
  } catch (err) {
    log.error({ err }, 'PATCH /api/admin/classes/[id] failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const supabase = createClient();

  // Check for active bookings
  const { count } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', params.id)
    .in('status', ['pending', 'confirmed']);

  if (count && count > 0) {
    return NextResponse.json(
      { error: { code: 'HAS_ACTIVE_BOOKINGS', message: 'This class has bookings. Cancel it instead.' } },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true });
}
