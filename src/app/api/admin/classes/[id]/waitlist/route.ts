import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger, generateCorrelationId } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  try {
    const classId = params.id;
    const supabase = createAdminClient();

    const { data: entries, error } = await supabase
      .from('waitlists')
      .select('id, student_id, status, created_at, promoted_at')
      .eq('class_id', classId)
      .eq('status', 'waiting')
      .order('created_at', { ascending: true });

    if (error) {
      log.error({ err: error }, 'Failed to fetch waitlist');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
        { status: 500 }
      );
    }

    const studentIds = (entries || []).map((e) => e.student_id);
    let profiles: Record<string, { full_name: string; email: string; credits: number }> = {};

    if (studentIds.length > 0) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, full_name, email, credits')
        .in('id', studentIds);

      profiles = Object.fromEntries(
        (profileRows || []).map((p) => [p.id, { full_name: p.full_name, email: p.email, credits: p.credits }])
      );
    }

    const queue = (entries || []).map((e, i) => ({
      id: e.id,
      position: i + 1,
      student_id: e.student_id,
      student_name: profiles[e.student_id]?.full_name || '',
      student_email: profiles[e.student_id]?.email || '',
      credits: profiles[e.student_id]?.credits ?? 0,
      created_at: e.created_at,
    }));

    return NextResponse.json({ waitlist: queue });
  } catch (err) {
    log.error({ err }, 'GET /api/admin/classes/[id]/waitlist failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
