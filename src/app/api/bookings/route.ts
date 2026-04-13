import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, isAuthError } from '@/lib/auth';
import { logger, generateCorrelationId } from '@/lib/logger';

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

    // Check credits
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('credits')
      .eq('id', auth.user.id)
      .single();

    if (!profile || profile.credits < 1) {
      return NextResponse.json(
        { error: { code: 'NO_CREDITS', message: 'You need class credits to book. Purchase a class pack first.' } },
        { status: 402 }
      );
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

    // Deduct 1 credit
    await adminClient
      .from('profiles')
      .update({ credits: profile.credits - 1 })
      .eq('id', auth.user.id);

    log.info({ bookingId, credits_remaining: profile.credits - 1 }, 'Booking created, credit deducted');
    return NextResponse.json({
      booking: { id: bookingId, class_id, status: 'confirmed', payment_type: 'drop_in' },
      credits_remaining: profile.credits - 1,
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
