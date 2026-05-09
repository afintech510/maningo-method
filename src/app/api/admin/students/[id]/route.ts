import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger, generateCorrelationId } from '@/lib/logger';

const editSchema = z.object({
  full_name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const correlationId = generateCorrelationId();
  const log = logger.child({ correlationId });

  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const parsed = editSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' } },
        { status: 400 }
      );
    }
    const input = parsed.data;
    if (Object.keys(input).length === 0) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Nothing to update.' } }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Update profile row
    const profileUpdate: Record<string, unknown> = {};
    if (input.full_name !== undefined) profileUpdate.full_name = input.full_name;
    if (input.email !== undefined) profileUpdate.email = input.email;
    if (input.phone !== undefined) profileUpdate.phone = input.phone;

    const { data: updated, error: updErr } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', params.id)
      .select('id, full_name, email, phone')
      .single();

    if (updErr || !updated) {
      log.error({ err: updErr, studentId: params.id }, 'profile update failed');
      // Common case: email collision unique constraint
      const msg = updErr?.message || 'Could not update.';
      const isDup = /duplicate|unique/i.test(msg);
      return NextResponse.json(
        {
          error: {
            code: isDup ? 'EMAIL_TAKEN' : 'INTERNAL_ERROR',
            message: isDup ? 'That email is already used by another account.' : 'Could not update.',
          },
        },
        { status: isDup ? 409 : 500 }
      );
    }

    // Sync auth.users when email changes so login keeps working
    if (input.email !== undefined) {
      const { error: authErr } = await supabase.auth.admin.updateUserById(params.id, {
        email: input.email,
        email_confirm: true,
      });
      if (authErr) {
        // Roll back profile email so the two stores stay in sync
        log.error({ err: authErr, studentId: params.id }, 'auth.admin.updateUserById failed');
        return NextResponse.json(
          {
            error: {
              code: 'AUTH_UPDATE_FAILED',
              message: authErr.message?.toLowerCase().includes('exist')
                ? 'That email is already used by another account.'
                : 'Could not update auth email.',
            },
          },
          { status: 400 }
        );
      }
    }

    // Mirror name/phone into auth user_metadata too
    if (input.full_name !== undefined || input.phone !== undefined) {
      const metadataUpdate: Record<string, unknown> = {};
      if (input.full_name !== undefined) metadataUpdate.full_name = input.full_name;
      if (input.phone !== undefined) metadataUpdate.phone = input.phone;
      await supabase.auth.admin.updateUserById(params.id, { user_metadata: metadataUpdate });
    }

    log.info({ studentId: params.id, fields: Object.keys(input), adminId: auth.user.id }, 'Member edited');
    return NextResponse.json({ student: updated });
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err }, 'PATCH /api/admin/students/[id] failed');
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }, { status: 500 });
  }
}
