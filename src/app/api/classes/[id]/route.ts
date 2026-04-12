import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger, generateCorrelationId } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  try {
    const supabase = createClient();

    const { data: classData, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !classData) {
      return NextResponse.json(
        { error: { code: 'CLASS_NOT_FOUND', message: "This class couldn't be found." } },
        { status: 404 }
      );
    }

    // Get booking count
    const { count } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', params.id)
      .in('status', ['pending', 'confirmed']);

    const result = {
      ...classData,
      spots_remaining: classData.max_capacity - (count || 0),
    };

    log.info({ classId: params.id }, 'GET /api/classes/[id]');
    return NextResponse.json({ class: result });
  } catch (err) {
    log.error({ err }, 'GET /api/classes/[id] failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
