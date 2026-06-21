import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { logger, generateCorrelationId } from '@/lib/logger';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const supabase = createClient();

    const { data: entry, error: fetchErr } = await supabase
      .from('waitlists')
      .select('id, student_id, status')
      .eq('id', params.id)
      .single();

    if (fetchErr || !entry) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Waitlist entry not found.' } },
        { status: 404 }
      );
    }

    if (entry.student_id !== auth.user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: "You don't have access to this." } },
        { status: 403 }
      );
    }

    if (entry.status !== 'waiting') {
      return NextResponse.json(
        { error: { code: 'NOT_WAITING', message: 'This waitlist entry is no longer active.' } },
        { status: 409 }
      );
    }

    const { error: updateErr } = await supabase
      .from('waitlists')
      .update({ status: 'cancelled' })
      .eq('id', params.id);

    if (updateErr) {
      log.error({ err: updateErr }, 'Failed to cancel waitlist entry');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
        { status: 500 }
      );
    }

    log.info({ waitlistId: params.id }, 'Member left waitlist');
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error({ err }, 'DELETE /api/waitlist/[id] failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
