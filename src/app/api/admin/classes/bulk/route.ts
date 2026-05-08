import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger, generateCorrelationId } from '@/lib/logger';
import { STUDIO_TIMEZONE } from '@/lib/timezone';
import { fromZonedTime } from 'date-fns-tz';
import { addDays, parseISO } from 'date-fns';

const bulkSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  duration_minutes: z.number().int().min(10).max(240),
  max_capacity: z.number().int().min(1).max(200),
  days_of_week: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  times_of_day: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1).max(20),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horizon_weeks: z.number().int().min(1).max(52),
});

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const result = bulkSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: result.error.issues[0]?.message ?? 'Invalid input' } },
        { status: 400 }
      );
    }
    const input = result.data;

    const supabase = createAdminClient();

    const startsOn = parseISO(input.starts_on);
    const endsOn = addDays(startsOn, input.horizon_weeks * 7 - 1);

    // Insert series row
    const { data: series, error: seriesErr } = await supabase
      .from('class_series')
      .insert({
        title: input.title,
        description: input.description ?? null,
        duration_minutes: input.duration_minutes,
        max_capacity: input.max_capacity,
        days_of_week: input.days_of_week,
        times_of_day: input.times_of_day,
        starts_on: input.starts_on,
        ends_on: endsOn.toISOString().slice(0, 10),
        created_by: auth.user.id,
      })
      .select('id')
      .single();
    if (seriesErr || !series) {
      log.error({ err: seriesErr }, 'Failed to create class_series');
      return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Could not create series.' } }, { status: 500 });
    }

    // Materialise individual class rows
    const rows: Array<{
      title: string;
      description: string | null;
      starts_at: string;
      duration_minutes: number;
      max_capacity: number;
      created_by: string;
      series_id: string;
      status: 'scheduled';
    }> = [];

    const totalDays = input.horizon_weeks * 7;
    for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
      const day = addDays(startsOn, dayOffset);
      const dow = day.getDay(); // 0=Sun..6=Sat
      if (!input.days_of_week.includes(dow)) continue;

      for (const t of input.times_of_day) {
        const [hh, mm] = t.split(':').map(Number);
        const yyyy = day.getFullYear();
        const month = String(day.getMonth() + 1).padStart(2, '0');
        const dd = String(day.getDate()).padStart(2, '0');
        const localIso = `${yyyy}-${month}-${dd}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
        const utcDate = fromZonedTime(localIso, STUDIO_TIMEZONE);
        rows.push({
          title: input.title,
          description: input.description ?? null,
          starts_at: utcDate.toISOString(),
          duration_minutes: input.duration_minutes,
          max_capacity: input.max_capacity,
          created_by: auth.user.id,
          series_id: series.id,
          status: 'scheduled',
        });
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ series_id: series.id, created: 0 });
    }

    const { error: insertErr } = await supabase.from('classes').insert(rows);
    if (insertErr) {
      log.error({ err: insertErr, count: rows.length }, 'Failed to insert classes');
      return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Could not create classes.' } }, { status: 500 });
    }

    log.info({ seriesId: series.id, created: rows.length }, 'Bulk classes created');
    return NextResponse.json({ series_id: series.id, created: rows.length });
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'POST /api/admin/classes/bulk failed');
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}
