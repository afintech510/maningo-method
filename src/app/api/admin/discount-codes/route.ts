import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{1,31}$/;

function bad(message: string) {
  return NextResponse.json({ error: { code: 'INVALID_INPUT', message } }, { status: 400 });
}

// List every discount code with its usage, newest first.
export async function GET() {
  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('discount_codes')
    .select(
      'id, code, discount_type, discount_value, member_id, campaign, max_redemptions, redemption_count, starts_at, expires_at, redeemed_at, is_active, issued_at, profiles!discount_codes_member_id_fkey(full_name, email)',
    )
    .order('issued_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not load codes.' } },
      { status: 500 },
    );
  }
  return NextResponse.json({ codes: data || [] });
}

// Create a new discount code.
export async function POST(request: NextRequest) {
  const auth = await requireAuth('admin');
  if (isAuthError(auth)) return auth;

  const body = await request.json().catch(() => null);
  if (!body) return bad('Malformed request.');

  const code = String(body.code || '').trim().toUpperCase();
  if (!CODE_RE.test(code)) {
    return bad('Code must be 2–32 chars: letters, numbers, dashes or underscores.');
  }

  const discountType = body.discount_type === 'fixed_cents' ? 'fixed_cents' : 'percentage';

  // For percentage codes `amount` is a percent (1–100); for fixed codes it's
  // dollars off, stored as cents.
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return bad('Enter a discount amount.');
  let discountValue: number;
  if (discountType === 'percentage') {
    if (amount > 100) return bad('Percentage cannot exceed 100.');
    discountValue = Math.round(amount);
  } else {
    discountValue = Math.round(amount * 100); // dollars → cents
  }

  // Usage cap: blank / 0 / null → unlimited.
  let maxRedemptions: number | null = null;
  if (body.max_redemptions !== '' && body.max_redemptions != null) {
    const cap = Number(body.max_redemptions);
    if (!Number.isInteger(cap) || cap < 1) return bad('Usage limit must be a whole number ≥ 1.');
    maxRedemptions = cap;
  }

  const startsAt = body.starts_at ? new Date(body.starts_at) : null;
  const expiresAt = body.expires_at ? new Date(body.expires_at) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) return bad('Invalid start date.');
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return bad('Invalid expiry date.');
  if (startsAt && expiresAt && startsAt >= expiresAt) {
    return bad('Start date must be before the expiry date.');
  }

  const campaign = body.campaign ? String(body.campaign).trim().slice(0, 64) || null : null;

  const supabase = createAdminClient();

  // Friendly duplicate check before relying on the unique constraint.
  const { data: existing } = await supabase
    .from('discount_codes')
    .select('id')
    .eq('code', code)
    .maybeSingle();
  if (existing) return bad(`Code "${code}" already exists.`);

  const { data, error } = await supabase
    .from('discount_codes')
    .insert({
      code,
      discount_type: discountType,
      discount_value: discountValue,
      reason: 'promo',
      campaign,
      max_redemptions: maxRedemptions,
      starts_at: startsAt ? startsAt.toISOString() : null,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      is_active: true,
      created_by: auth.user.id,
    })
    .select(
      'id, code, discount_type, discount_value, member_id, campaign, max_redemptions, redemption_count, starts_at, expires_at, redeemed_at, is_active, issued_at',
    )
    .single();

  if (error) {
    // 23505 = unique_violation (race against the pre-check above).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any).code === '23505') return bad(`Code "${code}" already exists.`);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not create code.' } },
      { status: 500 },
    );
  }

  return NextResponse.json({ code: data }, { status: 201 });
}
