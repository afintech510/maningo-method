import { createAdminClient } from '@/lib/supabase/admin';
import { applyCreditDelta } from '@/lib/credits';
import { sendReferralRewardEarned } from '@/lib/resend';

type Logger = { info: (...a: unknown[]) => void; error: (...a: unknown[]) => void };

interface RewardResult {
  rewarded: boolean;
  reason?: 'no_referrer' | 'already_rewarded' | 'reward_failed';
  referrerId?: string;
}

/**
 * Issue at most ONE credit to the referrer when their referred friend completes
 * a paid pack purchase. Subsequent purchases by the same friend do NOT issue
 * additional rewards (policy: one credit per person referred).
 *
 * Safe to call from any post-payment path (Stripe webhook, manual mark-paid).
 * The DB-level unique constraint on (referrer_id, referred_id) provides a hard
 * stop even under concurrent firings.
 */
export async function rewardReferrerOnce(
  buyerId: string,
  triggerId: string,
  log: Logger
): Promise<RewardResult> {
  const supabase = createAdminClient();
  const { data: buyer } = await supabase
    .from('profiles')
    .select('referred_by, full_name')
    .eq('id', buyerId)
    .single();

  if (!buyer?.referred_by) return { rewarded: false, reason: 'no_referrer' };
  const referrerId: string = buyer.referred_by;

  // Fast-path dedupe — check before mutating credits / sending email.
  const { data: existing } = await supabase
    .from('referral_rewards')
    .select('id')
    .eq('referrer_id', referrerId)
    .eq('referred_id', buyerId)
    .maybeSingle();
  if (existing) {
    log.info({ referrerId, buyerId }, 'Referral already rewarded — skipping');
    return { rewarded: false, reason: 'already_rewarded', referrerId };
  }

  try {
    // Insert the audit row FIRST so the unique index protects us from races;
    // on conflict the insert fails and we bail before granting the credit.
    const { error: insertErr } = await supabase.from('referral_rewards').insert({
      referrer_id: referrerId,
      referred_id: buyerId,
      credits_rewarded: 1,
    });
    if (insertErr) {
      // 23505 = unique violation = another concurrent call beat us to it.
      if (
        insertErr.code === '23505' ||
        /duplicate key|unique/i.test(insertErr.message)
      ) {
        log.info({ referrerId, buyerId }, 'Referral reward race — already inserted');
        return { rewarded: false, reason: 'already_rewarded', referrerId };
      }
      throw insertErr;
    }

    const { newBalance } = await applyCreditDelta({
      studentId: referrerId,
      delta: 1,
      reason: 'Referral reward — friend completed first paid pack',
      source: 'referral_reward',
      relatedId: triggerId,
    });

    const { data: referrer } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', referrerId)
      .single();
    if (referrer?.email) {
      await sendReferralRewardEarned(referrer.email, {
        referrerName: referrer.full_name || 'there',
        friendName: buyer.full_name,
        newBalance,
      });
    }

    log.info({ referrerId, buyerId, triggerId }, 'Referral reward issued (one-per-friend)');
    return { rewarded: true, referrerId };
  } catch (err) {
    log.error({ err, referrerId, buyerId }, 'Referral reward failed');
    return { rewarded: false, reason: 'reward_failed', referrerId };
  }
}
