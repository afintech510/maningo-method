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

  const auth = await requireAuth('superadmin');
  if (isAuthError(auth)) return auth;

  const supabase = createAdminClient();
  const { error } = await supabase.from('rent_payments').delete().eq('id', params.id);
  if (error) {
    log.error({ err: error, id: params.id }, 'Failed to delete rent payment');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not delete payment.' } },
      { status: 500 }
    );
  }
  return NextResponse.json({ deleted: true });
}
