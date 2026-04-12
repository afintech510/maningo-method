import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const key = searchParams.get('key');

  if (key !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Invalid cron secret.' } },
      { status: 403 }
    );
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('cleanup_pending_bookings');

    if (error) {
      logger.error({ err: error }, 'Cleanup pending bookings failed');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Cleanup failed.' } },
        { status: 500 }
      );
    }

    logger.info({ expired_count: data }, 'Pending bookings cleanup');
    return NextResponse.json({ expired_count: data });
  } catch (err) {
    logger.error({ err }, 'Cron cleanup failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
