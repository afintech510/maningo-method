import type { SupabaseClient } from '@supabase/supabase-js';

export interface DiscountCodeRow {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_cents';
  discount_value: number;
  member_id: string | null;
  redeemed_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  max_redemptions: number | null;
  redemption_count: number;
  starts_at: string | null;
  once_per_member: boolean;
}

export interface ValidationResult {
  valid: boolean;
  reason?: 'not_found' | 'wrong_account' | 'redeemed' | 'expired' | 'inactive' | 'not_started';
  message?: string;
  discount?: DiscountCodeRow;
}

export async function validateDiscountCode(
  supabase: SupabaseClient,
  code: string,
  memberId: string,
): Promise<ValidationResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    return { valid: false, reason: 'not_found', message: 'Enter a discount code.' };
  }

  const { data } = await supabase
    .from('discount_codes')
    .select(
      'id, code, discount_type, discount_value, member_id, redeemed_at, expires_at, is_active, max_redemptions, redemption_count, starts_at, once_per_member',
    )
    .eq('code', trimmed)
    .maybeSingle();

  if (!data) {
    return { valid: false, reason: 'not_found', message: 'Code not found.' };
  }
  const row = data as DiscountCodeRow;

  if (row.member_id && row.member_id !== memberId) {
    return { valid: false, reason: 'wrong_account', message: "This code isn't valid for your account." };
  }
  if (!row.is_active) {
    return { valid: false, reason: 'inactive', message: 'Code is no longer active.' };
  }
  if (row.starts_at && new Date(row.starts_at).getTime() > Date.now()) {
    return { valid: false, reason: 'not_started', message: 'This code is not active yet.' };
  }
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { valid: false, reason: 'expired', message: 'Code expired.' };
  }
  // Usage cap. max_redemptions = NULL means unlimited; a capped code is spent
  // once redemption_count reaches the cap. A single-use code (e.g. a member
  // review reward) is simply max_redemptions = 1. redeemed_at is now only a
  // first-use timestamp for reporting and no longer gates redemption.
  if (row.max_redemptions !== null && row.redemption_count >= row.max_redemptions) {
    return { valid: false, reason: 'redeemed', message: 'Code already used.' };
  }

  // Once-per-member: reject if this member already has a redemption on record
  // for this code. The unique constraint on discount_code_redemptions is the
  // hard backstop; this is the friendly pre-check at apply time.
  if (row.once_per_member) {
    const { data: prior } = await supabase
      .from('discount_code_redemptions')
      .select('id')
      .eq('discount_code_id', row.id)
      .eq('member_id', memberId)
      .maybeSingle();
    if (prior) {
      return { valid: false, reason: 'redeemed', message: "You've already used this code." };
    }
  }

  return { valid: true, discount: row };
}

export function applyDiscount(amountCents: number, row: DiscountCodeRow): number {
  if (row.discount_type === 'percentage') {
    return Math.max(0, Math.round(amountCents * (1 - row.discount_value / 100)));
  }
  if (row.discount_type === 'fixed_cents') {
    return Math.max(0, amountCents - row.discount_value);
  }
  return amountCents;
}
