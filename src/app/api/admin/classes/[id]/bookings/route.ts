import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyCreditDelta, InsufficientCreditsError } from '@/lib/credits';
import { logger, generateCorrelationId } from '@/lib/logger';

const schema = z.object({
  student_id: z.string().uuid(),
  payment_type: z.enum(['pack_credit', 'comp']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } },
      { status: 400 }
    );
  }

  const classId = params.id;
  const { student_id, payment_type } = parsed.data;
  const supabase = createAdminClient();

  // Load the class and refuse early if it can't take a new booking.
  const { data: cls } = await supabase
    .from('classes')
    .select('id, status, max_capacity, title, starts_at')
    .eq('id', classId)
    .single();
  if (!cls) {
    return NextResponse.json(
      { error: { code: 'CLASS_NOT_FOUND', message: 'Class not found.' } },
      { status: 404 }
    );
  }
  if (cls.status !== 'scheduled') {
    return NextResponse.json(
      { error: { code: 'CLASS_NOT_SCHEDULED', message: `Class is ${cls.status}.` } },
      { status: 409 }
    );
  }

  const { count: bookedCount } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', classId)
    .in('status', ['pending', 'confirmed']);
  if ((bookedCount ?? 0) >= (cls.max_capacity ?? 0)) {
    return NextResponse.json(
      { error: { code: 'CLASS_FULL', message: 'Class is full.' } },
      { status: 409 }
    );
  }

  // Refuse duplicates.
  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .eq('class_id', classId)
    .eq('student_id', student_id)
    .in('status', ['pending', 'confirmed'])
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: { code: 'ALREADY_BOOKED', message: 'Member is already booked for this class.' } },
      { status: 409 }
    );
  }

  const { data: booking, error: insertErr } = await supabase
    .from('bookings')
    .insert({
      class_id: classId,
      student_id,
      status: 'confirmed',
      payment_type,
      added_by_admin: auth.user.id,
    })
    .select('id')
    .single();
  if (insertErr || !booking) {
    log.error({ err: insertErr, classId, studentId: student_id }, 'Admin add-member insert failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not add member.' } },
      { status: 500 }
    );
  }

  if (payment_type === 'pack_credit') {
    try {
      await applyCreditDelta({
        studentId: student_id,
        delta: -1,
        reason: `Admin added to class ${classId}`,
        source: 'booking_create',
        adminId: auth.user.id,
        relatedId: booking.id,
      });
    } catch (err) {
      // Roll back the booking so we don't leave a confirmed seat without a paid credit.
      await supabase.from('bookings').delete().eq('id', booking.id);
      if (err instanceof InsufficientCreditsError) {
        return NextResponse.json(
          {
            error: {
              code: 'INSUFFICIENT_CREDITS',
              message: "This member doesn't have enough credits. Pick Comp seat instead.",
            },
          },
          { status: 402 }
        );
      }
      log.error({ err, studentId: student_id }, 'Credit debit failed after admin add; rolled back');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Could not deduct credit; booking reverted.' } },
        { status: 500 }
      );
    }
  }

  log.info(
    { classId, studentId: student_id, paymentType: payment_type, addedBy: auth.user.id, bookingId: booking.id },
    'Admin added member to class',
  );
  return NextResponse.json({ booking_id: booking.id });
}
