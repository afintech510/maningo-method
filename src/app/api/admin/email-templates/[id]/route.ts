import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger, generateCorrelationId } from '@/lib/logger';

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  subject: z.string().max(200).optional(),
  body: z.string().max(20000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'No fields to update.' } },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('member_email_templates')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('id, slug, name, subject, body, created_at, updated_at')
    .single();

  if (error) {
    log.error({ err: error, templateId: params.id }, 'Failed to update template');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not save changes.' } },
      { status: 500 }
    );
  }
  return NextResponse.json({ template: data });
}
