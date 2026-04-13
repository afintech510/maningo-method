-- Migration 009: Referral system
-- Each user gets a unique referral code. When a referred friend buys an intro class, referrer gets 1 free credit.
-- Intro class limited to 1 per user.

-- Add referral code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_used_intro boolean NOT NULL DEFAULT false;

-- Generate referral codes for existing users
UPDATE public.profiles
SET referral_code = UPPER(SUBSTRING(md5(random()::text || id::text) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Track referral rewards
CREATE TABLE public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id),
  referred_id uuid NOT NULL REFERENCES public.profiles(id),
  credits_rewarded integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_rewards_referrer ON public.referral_rewards (referrer_id);
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_rewards_select_own" ON public.referral_rewards
  FOR SELECT USING (auth.uid() = referrer_id);
