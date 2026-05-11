import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, isAuthError } from '@/lib/auth';
import { logger, generateCorrelationId } from '@/lib/logger';
import { applyCreditDelta } from '@/lib/credits';
import { sendBookingConfirmation } from '@/lib/resend';
import { googleCalendarUrl, icsUrl } from '@/lib/calendar';
import { formatStudioDate, formatStudioTime } from '@/lib/timezone';
import { getBaseUrl } from '@/lib/utils';
import { getStudioSettings } from '@/lib/studio-settings';

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

    // Check credits + waiver
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('credits, gift_balance_cents, waiver_signed_at')
      .eq('id', auth.user.id)
      .single();

    if (!profile?.waiver_signed_at) {
      return NextResponse.json(
        {
          error: {
            code: 'WAIVER_REQUIRED',
            message: 'Please sign the liability waiver before booking your first class.',
          },
        },
        { status: 412 }
      );
    }

    // If they don't have a regular credit but have at least $25 of gift
    // balance, silently convert $25 of balance → 1 credit so the booking can
    // proceed. Anything less than $25 stays parked on their account until
    // they top up.
    const GIFT_BALANCE_PER_CREDIT_CENTS = 2500;
    if (
      profile &&
      profile.credits < 1 &&
      (profile.gift_balance_cents || 0) >= GIFT_BALANCE_PER_CREDIT_CENTS
    ) {
      // Decrement balance with a conditional WHERE so concurrent bookings
      // can't both spend the same $25.
      const newBalanceCents =
        (profile.gift_balance_cents || 0) - GIFT_BALANCE_PER_CREDIT_CENTS;
      const { data: updatedRow, error: balanceErr } = await adminClient
        .from('profiles')
        .update({ gift_balance_cents: newBalanceCents })
        .eq('id', auth.user.id)
        .gte('gift_balance_cents', GIFT_BALANCE_PER_CREDIT_CENTS)
        .select('id')
        .maybeSingle();
      if (balanceErr || !updatedRow) {
        log.error({ err: balanceErr }, 'Gift balance debit failed; falling through to NO_CREDITS');
      } else {
        try {
          await applyCreditDelta({
            studentId: auth.user.id,
            delta: 1,
            reason: 'Converted $25 of gift balance to 1 credit at booking time',
            source: 'gift_redeem',
            relatedId: null,
          });
          profile.credits = (profile.credits || 0) + 1;
        } catch (creditErr) {
          // Refund the balance — we couldn't grant the credit.
          await adminClient
            .from('profiles')
            .update({ gift_balance_cents: profile.gift_balance_cents })
            .eq('id', auth.user.id);
          log.error({ err: creditErr }, 'Credit grant failed after balance debit; refunded');
        }
      }
    }

    if (!profile || profile.credits < 1) {
      return NextResponse.json(
        { error: { code: 'NO_CREDITS', message: 'You need class credits to book. Purchase a class pack first.' } },
        { status: 402 }
      );
    }

    // Booking horizon — reject bookings on classes too far out, mirroring the
    // client-side lock so a crafted request can't slip through.
    const { data: cls } = await adminClient
      .from('classes')
      .select('starts_at')
      .eq('id', class_id)
      .single();
    if (cls?.starts_at) {
      const { booking_horizon_days } = await getStudioSettings();
      const bookableFromMs = new Date(cls.starts_at).getTime() - booking_horizon_days * 86400000;
      if (Date.now() < bookableFromMs) {
        return NextResponse.json(
          {
            error: {
              code: 'BOOKING_LOCKED',
              message: `Bookings for this class open ${booking_horizon_days} days ahead. Try again closer to the date.`,
            },
          },
          { status: 409 }
        );
      }
    }

    // Create booking via RPC
    const supabase = createClient();
    const { data: bookingId, error: rpcError } = await supabase.rpc('create_booking', {
      p_class_id: class_id,
      p_payment_type: 'drop_in',
      p_status: 'confirmed',
    });

    if (rpcError) {
      const code = rpcError.message;
      const errorMap: Record<string, { status: number; message: string }> = {
        CLASS_FULL: { status: 400, message: 'Sorry, this class is full!' },
        ALREADY_BOOKED: { status: 400, message: "You're already booked for this class." },
        CLASS_CANCELLED: { status: 400, message: 'This class has been cancelled.' },
        CLASS_NOT_FOUND: { status: 404, message: "This class couldn't be found." },
        MAX_BOOKINGS_REACHED: { status: 400, message: "You've reached the max of 5 upcoming bookings." },
      };

      const mapped = errorMap[code];
      if (mapped) {
        return NextResponse.json(
          { error: { code, message: mapped.message } },
          { status: mapped.status }
        );
      }

      log.error({ err: rpcError }, 'create_booking RPC failed');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
        { status: 500 }
      );
    }

    // Deduct 1 credit (atomic + audit logged)
    const { newBalance } = await applyCreditDelta({
      studentId: auth.user.id,
      delta: -1,
      reason: `Booking ${bookingId}`,
      source: 'booking_create',
      relatedId: String(bookingId),
    });

    log.info({ bookingId, credits_remaining: newBalance }, 'Booking created, credit deducted');

    // Send booking confirmation email (don't block the response on this)
    void (async () => {
      try {
        const { data: cls } = await adminClient
          .from('classes')
          .select('title, starts_at, duration_minutes')
          .eq('id', class_id)
          .single();
        if (!cls) return;
        const baseUrl = getBaseUrl();
        const calEvent = {
          id: String(bookingId),
          title: `Maningo Method · ${cls.title}`,
          startsAt: cls.starts_at,
          durationMinutes: cls.duration_minutes,
        };
        await sendBookingConfirmation(auth.user.email, {
          studentName: (auth.user.full_name || '').split(' ')[0] || 'there',
          classTitle: cls.title,
          classDate: formatStudioDate(cls.starts_at, 'EEEE, MMM d'),
          classTime: formatStudioTime(cls.starts_at),
          duration: cls.duration_minutes,
          creditsRemaining: newBalance,
          googleCalUrl: googleCalendarUrl(calEvent),
          icsUrl: `${baseUrl}${icsUrl(String(bookingId))}`,
        });
      } catch (err) {
        log.error({ err, bookingId }, 'Booking confirmation email failed');
      }
    })();

    return NextResponse.json({
      booking: { id: bookingId, class_id, status: 'confirmed', payment_type: 'drop_in' },
      credits_remaining: newBalance,
    });
  } catch (err) {
    log.error({ err }, 'POST /api/bookings failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const supabase = createClient();

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id, class_id, status, payment_type, created_at,
        classes (title, starts_at, duration_minutes)
      `)
      .eq('student_id', auth.user.id)
      .in('status', ['confirmed', 'cancelled'])
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
        { status: 500 }
      );
    }

    const now = new Date();
    const result = (bookings || []).map((b) => {
      const cls = b.classes as unknown as { title: string; starts_at: string; duration_minutes: number };
      const endTime = cls ? new Date(new Date(cls.starts_at).getTime() + cls.duration_minutes * 60000) : now;
      return {
        id: b.id,
        class_id: b.class_id,
        class_title: cls?.title || '',
        class_starts_at: cls?.starts_at || '',
        class_duration_minutes: cls?.duration_minutes || 0,
        status: b.status,
        payment_type: b.payment_type,
        created_at: b.created_at,
        is_upcoming: b.status === 'confirmed' && endTime > now,
        is_past: endTime <= now,
      };
    });

    return NextResponse.json({ bookings: result });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
