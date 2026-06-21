import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger, generateCorrelationId } from '@/lib/logger';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  try {
    const supabase = createAdminClient();

    const { data: entry, error: fetchErr } = await supabase
      .from('waitlists')
      .select('id, status')
      .eq('id', params.id)
      .single();

    if (fetchErr || !entry) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Waitlist entry not found.' } },
        { status: 404 }
      );
    }

    if (entry.status !== 'waiting') {
      return NextResponse.json(
        { error: { code: 'NOT_WAITING', message: 'This entry is no longer active.' } },
        { status: 409 }
      );
    }

    const { error: updateErr } = await supabase
      .from('waitlists')
      .update({ status: 'cancelled' })
      .eq('id', params.id);

    if (updateErr) {
      log.error({ err: updateErr }, 'Failed to admin-remove waitlist entry');
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
        { status: 500 }
      );
    }

    log.info({ waitlistId: params.id, removedBy: auth.user.id }, 'Admin removed member from waitlist');
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error({ err }, 'DELETE /api/admin/waitlist/[id] failed');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } },
      { status: 500 }
    );
  }
}
