import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger, generateCorrelationId } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });
  const start = Date.now();

  try {
    const { searchParams } = request.nextUrl;
    const from = searchParams.get('from') || new Date().toISOString();
    const to = searchParams.get('to') || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    // Use admin client to bypass RLS for public schedule
    const supabase = createAdminClient();

    const { data: classes, error } = await supabase
      .from('classes')
      .select('*')
      .eq('status', 'scheduled')
      .gte('starts_at', from)
      .lte('starts_at', to)
      .order('starts_at', { ascending: true });

    if (error) {
      log.error({ err: error }, 'Failed to fetch classes');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
        { status: 500 }
      );
    }

    // Get booking counts separately
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
      id: c.id,
      title: c.title,
      description: c.description,
      starts_at: c.starts_at,
      duration_minutes: c.duration_minutes,
      max_capacity: c.max_capacity,
      spots_remaining: c.max_capacity - (bookingCounts[c.id] || 0),
      status: c.status,
    }));

    log.info({ duration_ms: Date.now() - start, count: result.length }, 'GET /api/classes');
    return NextResponse.json({ classes: result });
  } catch (err) {
    log.error({ err }, 'GET /api/classes failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
