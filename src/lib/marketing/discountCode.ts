import type { SupabaseClient } from '@supabase/supabase-js';

export interface DiscountCodeRow {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_cents';
  discount_value: number;
  member_id: string | null;
  redeemed_at: string | null;
  expires_at: string;
  is_active: boolean;
}

export interface ValidationResult {
  valid: boolean;
  reason?: 'not_found' | 'wrong_account' | 'redeemed' | 'expired' | 'inactive';
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
    .select('id, code, discount_type, discount_value, member_id, redeemed_at, expires_at, is_active')
    .eq('code', trimmed)
    .maybeSingle();

  if (!data) {
    return { valid: false, reason: 'not_found', message: 'Code not found.' };
  }
  const row = data as DiscountCodeRow;

  if (row.member_id && row.member_id !== memberId) {
    return { valid: false, reason: 'wrong_account', message: "This code isn't valid for your account." };
  }
  if (row.redeemed_at) {
    return { valid: false, reason: 'redeemed', message: 'Code already used.' };
  }
  if (!row.is_active) {
    return { valid: false, reason: 'inactive', message: 'Code is no longer active.' };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { valid: false, reason: 'expired', message: 'Code expired.' };
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
