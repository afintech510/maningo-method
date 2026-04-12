import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createClassSchema } from '@/validations/class';
import { logger, generateCorrelationId } from '@/lib/logger';

export async function GET() {
  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const supabase = createClient();
  const { data: classes, error } = await supabase
    .from('classes')
    .select('*')
    .order('starts_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }

  // Get booking counts
  const classIds = (classes || []).map((c) => c.id);
  let bookingCounts: Record<string, number> = {};

  if (classIds.length > 0) {
    const { data: counts } = await supabase
      .from('bookings')
      .select('class_id')
      .in('class_id', classIds)
      .in('status', ['pending', 'confirmed']);

    bookingCounts = (counts || []).reduce((acc, b) => {
      acc[b.class_id] = (acc[b.class_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  const result = (classes || []).map((c) => ({
    ...c,
    booked_count: bookingCounts[c.id] || 0,
  }));

  return NextResponse.json({ classes: result });
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const parsed = createClassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data: newClass, error } = await supabase
      .from('classes')
      .insert({
        ...parsed.data,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (error) {
      log.error({ err: error }, 'Failed to create class');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
        { status: 500 }
      );
    }

    log.info({ classId: newClass.id }, 'Class created');
    return NextResponse.json({ class: newClass }, { status: 201 });
  } catch (err) {
    log.error({ err }, 'POST /api/admin/classes failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
