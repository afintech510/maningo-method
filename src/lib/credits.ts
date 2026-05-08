import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export type CreditSource =
  | 'admin_manual'
  | 'manual_payment'
  | 'stripe_purchase'
  | 'booking_create'
  | 'booking_cancel'
  | 'referral_reward'
  | 'gift_redeem';

export interface ApplyCreditDeltaInput {
  studentId: string;
  delta: number;
  reason: string;
  source: CreditSource;
  adminId?: string | null;
  relatedId?: string | null;
}

export class InsufficientCreditsError extends Error {
  constructor() {
    super('INSUFFICIENT_CREDITS');
    this.name = 'InsufficientCreditsError';
  }
}

// Atomic, audit-logged credit mutation. Wraps the apply_credit_delta RPC
// (migration 016) so a profile balance change and its audit row land in
// the same transaction. Use this everywhere — never UPDATE profiles.credits
// directly.
export async function applyCreditDelta(input: ApplyCreditDeltaInput): Promise<{ newBalance: number }> {
  const { studentId, delta, reason, source, adminId, relatedId } = input;
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error('delta must be a non-zero integer');
  }
  if (!reason || reason.length < 3) {
    throw new Error('reason is required (min 3 chars)');
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('apply_credit_delta', {
    p_student_id: studentId,
    p_delta: delta,
    p_reason: reason,
    p_source: source,
    p_admin_id: adminId ?? null,
    p_related_id: relatedId ?? null,
  });

  if (error) {
    if (error.message?.includes('INSUFFICIENT_CREDITS')) {
      throw new InsufficientCreditsError();
    }
    logger.error({ err: error, studentId, delta, source }, 'apply_credit_delta failed');
    throw new Error(error.message || 'apply_credit_delta failed');
  }

  return { newBalance: typeof data === 'number' ? data : Number(data) };
}
