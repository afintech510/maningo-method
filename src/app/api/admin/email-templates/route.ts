import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger, generateCorrelationId } from '@/lib/logger';

const createSchema = z.object({
  name: z.string().min(1).max(120),
  subject: z.string().max(200).default(''),
  body: z.string().max(20000).default(''),
});

export async function GET() {
  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('member_email_templates')
    .select('id, slug, name, subject, body, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not load templates.' } },
      { status: 500 }
    );
  }
  return NextResponse.json({ templates: data || [] });
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('member_email_templates')
    .insert({
      slug: null,
      name: parsed.data.name,
      subject: parsed.data.subject,
      body: parsed.data.body,
      created_by: auth.user.id,
    })
    .select('id, slug, name, subject, body, created_at, updated_at')
    .single();

  if (error) {
    log.error({ err: error }, 'Failed to create email template');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not create template.' } },
      { status: 500 }
    );
  }
  return NextResponse.json({ template: data });
}
