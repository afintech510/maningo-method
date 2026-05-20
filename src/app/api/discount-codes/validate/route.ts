import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateDiscountCode } from '@/lib/marketing/discountCode';

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  const { code } = await request.json().catch(() => ({ code: '' }));
  const supabase = createAdminClient();
  const result = await validateDiscountCode(supabase, code || '', auth.user.id);

  if (!result.valid) {
    return NextResponse.json({ valid: false, error: result.message || 'Invalid code.' });
  }
  return NextResponse.json({
    valid: true,
    discount_type: result.discount!.discount_type,
    discount_value: result.discount!.discount_value,
    code: result.discount!.code,
  });
}
