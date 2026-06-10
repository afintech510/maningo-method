import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

// Toggle a code active/inactive (pause or resume a promo).
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  if (typeof body.is_active !== 'boolean') {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'is_active must be a boolean.' } },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('discount_codes')
    .update({ is_active: body.is_active })
    .eq('id', params.id)
    .select('id, is_active')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Code not found.' } },
      { status: 404 },
    );
  }
  return NextResponse.json({ code: data });
}

// Permanently delete a code.
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const supabase = createAdminClient();
  const { error } = await supabase.from('discount_codes').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not delete code.' } },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
