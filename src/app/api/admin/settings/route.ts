import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStudioSettings, invalidateStudioSettingsCache, STUDIO_SETTINGS_ID } from '@/lib/studio-settings';
import { logger, generateCorrelationId } from '@/lib/logger';

const patchSchema = z.object({
  booking_horizon_days: z.number().int().min(1).max(365).optional(),
});

export async function GET() {
  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;
  const settings = await getStudioSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } },
      { status: 400 }
    );
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'No fields to update.' } },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('studio_settings')
    .update({ ...parsed.data, updated_by: auth.user.id, updated_at: new Date().toISOString() })
    .eq('id', STUDIO_SETTINGS_ID);

  if (error) {
    log.error({ err: error }, 'Failed to update studio settings');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not save settings.' } },
      { status: 500 }
    );
  }

  invalidateStudioSettingsCache();
  const settings = await getStudioSettings();
  return NextResponse.json({ settings });
}
