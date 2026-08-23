import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, isAuthError } from '@/lib/auth';
import { logger, generateCorrelationId } from '@/lib/logger';
import { applyCreditDelta } from '@/lib/credits';
import { sendBookingCancellation, sendWaitlistPromoted, sendAdminBookingCancellation, sendAdminWaitlistPromotion } from '@/lib/resend';

const ADMIN_EMAIL = 'chelsea@maningomethod.com';
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

    // Verify ownership and load class info
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, student_id, class_id, status, payment_type, classes(starts_at)')
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

    // 12-hour cancellation cutoff — disabled per Chelsea's request (2026-07).
    // To re-enable, uncomment the block below.
    const classesField = (booking as { classes?: { starts_at?: string } | { starts_at?: string }[] }).classes;
    const classStart = Array.isArray(classesField) ? classesField[0]?.starts_at : classesField?.starts_at;
    // if (classStart) {
    //   const hoursUntilClass = (new Date(classStart).getTime() - Date.now()) / (1000 * 60 * 60);
    //   if (hoursUntilClass < 12) {
    //     return NextResponse.json(
    //       {
    //         error: {
    //           code: 'CANCELLATION_WINDOW_CLOSED',
    //           message:
    //             'Classes can only be cancelled up to 12 hours before start time. For emergencies, please contact Chelsea directly to refund your credit.',
    //         },
    //       },
    //       { status: 400 }
    //     );
    //   }
    // }

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

    // Refund 1 credit back to the student (atomic + audit). Member self-book
    // seats are 'drop_in' and always spent a credit; free classes book as
    // 'comp' and never did — so refund everything except comp (same intent as
    // shouldRefundOnCancel, which never refunds comp).
    const refundCredit = booking.payment_type !== 'comp';
    if (refundCredit) {
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
    } else {
      log.info({ bookingId: params.id }, 'Booking cancelled, no credit refund (comp/free)');
    }

    // Auto-promote the next waitlisted member (fire-and-forget)
    const classId = booking.class_id;
    if (classId) {
      void (async () => {
        try {
          const admin = createAdminClient();
          const { data: nextEntry } = await admin
            .from('waitlists')
            .select('id, student_id')
            .eq('class_id', classId)
            .eq('status', 'waiting')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (!nextEntry) return;

          // Free classes promote without any credit requirement or debit.
          const { data: promoteClass } = await admin
            .from('classes')
            .select('is_free')
            .eq('id', classId)
            .single();
          const classIsFree = !!promoteClass?.is_free;

          const { data: profile } = await admin
            .from('profiles')
            .select('credits, email, full_name')
            .eq('id', nextEntry.student_id)
            .single();

          if (!profile) {
            log.info({ waitlistId: nextEntry.id, studentId: nextEntry.student_id }, 'Auto-promote skipped: no profile');
            return;
          }
          if (!classIsFree && profile.credits < 1) {
            log.info({ waitlistId: nextEntry.id, studentId: nextEntry.student_id }, 'Auto-promote skipped: no credits');
            return;
          }

          const { data: newBooking, error: insertErr } = await admin
            .from('bookings')
            .insert({
              class_id: classId,
              student_id: nextEntry.student_id,
              status: 'confirmed',
              payment_type: classIsFree ? 'comp' : 'pack_credit',
            })
            .select('id')
            .single();

          if (insertErr || !newBooking) {
            log.error({ err: insertErr, studentId: nextEntry.student_id }, 'Auto-promote booking insert failed');
            return;
          }

          await admin
            .from('waitlists')
            .update({ status: 'promoted', promoted_at: new Date().toISOString() })
            .eq('id', nextEntry.id);

          if (!classIsFree) {
            try {
              await applyCreditDelta({
                studentId: nextEntry.student_id,
                delta: -1,
                reason: `Auto-promoted from waitlist → booking ${newBooking.id}`,
                source: 'booking_create',
                relatedId: newBooking.id,
              });
            } catch (creditErr) {
              await admin.from('bookings').delete().eq('id', newBooking.id);
              await admin
                .from('waitlists')
                .update({ status: 'waiting', promoted_at: null })
                .eq('id', nextEntry.id);
              log.error({ err: creditErr, studentId: nextEntry.student_id }, 'Auto-promote credit deduction failed; rolled back');
              return;
            }
          }

          log.info({ waitlistId: nextEntry.id, bookingId: newBooking.id, studentId: nextEntry.student_id }, 'Auto-promoted from waitlist');

          const { data: cls } = await admin
            .from('classes')
            .select('title, starts_at')
            .eq('id', classId)
            .single();
          if (cls) {
            await sendWaitlistPromoted(profile.email, {
              studentName: (profile.full_name || '').split(' ')[0] || 'there',
              classTitle: cls.title,
              classDate: formatStudioDate(cls.starts_at, 'EEEE, MMM d'),
              classTime: formatStudioTime(cls.starts_at),
            });
            await sendAdminWaitlistPromotion(ADMIN_EMAIL, {
              promotedMemberName: profile.full_name || 'Unknown member',
              promotedMemberEmail: profile.email,
              classTitle: cls.title,
              classDate: formatStudioDate(cls.starts_at, 'EEEE, MMM d'),
              classTime: formatStudioTime(cls.starts_at),
            });
          }
        } catch (err) {
          log.error({ err, classId }, 'Auto-promote from waitlist failed');
        }
      })();
    }

    // Fire-and-forget cancellation confirmation email
    void (async () => {
      try {
        const admin = createAdminClient();
        const { data: cls } = await admin
          .from('classes')
          .select('title, starts_at')
          .eq('id', classId || '')
          .single();
        const title = cls?.title || 'your class';
        const startsAt = cls?.starts_at || classStart;
        if (!startsAt) return;
        await sendBookingCancellation(auth.user.email, {
          studentName: (auth.user.full_name || '').split(' ')[0] || 'there',
          classTitle: title,
          classDate: formatStudioDate(startsAt, 'EEEE, MMM d'),
          classTime: formatStudioTime(startsAt),
        });
        await sendAdminBookingCancellation(ADMIN_EMAIL, {
          memberName: auth.user.full_name || 'Unknown member',
          memberEmail: auth.user.email,
          classTitle: title,
          classDate: formatStudioDate(startsAt, 'EEEE, MMM d'),
          classTime: formatStudioTime(startsAt),
        });
      } catch (err) {
        log.error({ err, bookingId: params.id }, 'Cancellation email failed');
      }
    })();

    return NextResponse.json({ booking: { id: params.id, status: 'cancelled' }, credit_refunded: refundCredit });
  } catch (err) {
    log.error({ err }, 'PATCH /api/bookings/[id] failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
