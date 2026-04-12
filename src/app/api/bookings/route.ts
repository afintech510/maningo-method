import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createBookingSchema } from '@/validations/booking';
import { getStripe, getOrCreateStripeCustomer } from '@/lib/stripe';
import { getBaseUrl } from '@/lib/utils';
import { logger, generateCorrelationId } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { class_id, payment_type } = parsed.data;
    const supabase = createClient();

    if (payment_type === 'subscription') {
      // Verify active subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('student_id', auth.user.id)
        .eq('status', 'active')
        .single();

      if (!sub) {
        return NextResponse.json(
          { error: { code: 'NO_ACTIVE_SUBSCRIPTION', message: 'Subscribe to book with your membership.' } },
          { status: 402 }
        );
      }

      // Call create_booking RPC
      const { data: bookingId, error: rpcError } = await supabase.rpc('create_booking', {
        p_class_id: class_id,
        p_payment_type: 'subscription',
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

      log.info({ bookingId, type: 'subscription' }, 'Booking created');
      return NextResponse.json({
        booking: { id: bookingId, class_id, status: 'confirmed', payment_type: 'subscription' },
      });
    }

    // Drop-in: create pending booking
    const { data: bookingId, error: rpcError } = await supabase.rpc('create_booking', {
      p_class_id: class_id,
      p_payment_type: 'drop_in',
      p_status: 'pending',
    });

    if (rpcError) {
      const code = rpcError.message;
      const errorMap: Record<string, { status: number; message: string }> = {
        CLASS_FULL: { status: 400, message: 'Sorry, this class is full!' },
        ALREADY_BOOKED: { status: 400, message: "You're already booked for this class." },
        CLASS_CANCELLED: { status: 400, message: 'This class has been cancelled.' },
        CLASS_NOT_FOUND: { status: 404, message: "This class couldn't be found." },
      };

      const mapped = errorMap[code];
      if (mapped) {
        return NextResponse.json(
          { error: { code, message: mapped.message } },
          { status: mapped.status }
        );
      }

      log.error({ err: rpcError }, 'create_booking RPC failed (drop-in)');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
        { status: 500 }
      );
    }

    // Create Stripe Checkout Session for drop-in
    try {
      const customerId = await getOrCreateStripeCustomer(auth.user.id, auth.user.email);
      const stripe = getStripe();
      const baseUrl = getBaseUrl();

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        line_items: [{ price: process.env.STRIPE_DROPIN_PRICE_ID!, quantity: 1 }],
        success_url: `${baseUrl}/booking-success?type=drop_in&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/schedule?payment_cancelled=true`,
        metadata: {
          student_id: auth.user.id,
          class_id,
          booking_id: bookingId,
        },
      });

      // Store checkout session ID on booking
      await supabase
        .from('bookings')
        .update({ stripe_checkout_session_id: session.id })
        .eq('id', bookingId);

      log.info({ bookingId, type: 'drop_in', sessionId: session.id }, 'Drop-in checkout created');
      return NextResponse.json({
        booking_id: bookingId,
        checkout_url: session.url,
      });
    } catch (stripeErr) {
      // Stripe failed — delete the pending booking
      await supabase.from('bookings').delete().eq('id', bookingId);
      log.error({ err: stripeErr }, 'Stripe checkout creation failed, pending booking deleted');
      return NextResponse.json(
        { error: { code: 'STRIPE_ERROR', message: 'Payment system is temporarily unavailable.' } },
        { status: 502 }
      );
    }
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

    // Upcoming bookings: class visible until it ENDS (REV-018)
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        class_id,
        status,
        payment_type,
        created_at,
        classes (
          title,
          starts_at,
          duration_minutes
        )
      `)
      .eq('student_id', auth.user.id)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
        { status: 500 }
      );
    }

    // Filter: class visible until it ends
    const now = new Date();
    const upcoming = (bookings || []).filter((b) => {
      const cls = b.classes as unknown as { starts_at: string; duration_minutes: number };
      if (!cls) return false;
      const endTime = new Date(new Date(cls.starts_at).getTime() + cls.duration_minutes * 60000);
      return endTime > now;
    }).map((b) => {
      const cls = b.classes as unknown as { title: string; starts_at: string; duration_minutes: number };
      return {
        id: b.id,
        class_id: b.class_id,
        class_title: cls?.title,
        class_starts_at: cls?.starts_at,
        class_duration_minutes: cls?.duration_minutes,
        status: b.status,
        payment_type: b.payment_type,
        created_at: b.created_at,
      };
    });

    return NextResponse.json({ bookings: upcoming });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
