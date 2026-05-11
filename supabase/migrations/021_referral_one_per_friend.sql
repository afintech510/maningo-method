-- Policy change: referrer earns at most ONE credit per friend referred,
-- triggered on the friend's first paid pack purchase. We enforce this at the
-- DB layer with a unique constraint so concurrent webhook firings can't
-- double-issue.

-- Defensive cleanup: drop any prior duplicate reward rows, keeping the
-- earliest one per (referrer, referred) pair.
DELETE FROM public.referral_rewards a
USING public.referral_rewards b
WHERE a.referrer_id = b.referrer_id
  AND a.referred_id = b.referred_id
  AND a.created_at > b.created_at;

ALTER TABLE public.referral_rewards
  ADD CONSTRAINT referral_rewards_referrer_referred_unique
  UNIQUE (referrer_id, referred_id);
