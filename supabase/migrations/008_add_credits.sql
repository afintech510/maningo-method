-- Migration 008: Class credits system (replacing subscriptions for booking)
-- Users purchase class packs, credits are stored on profiles

-- Add credits column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 0;

-- Track credit purchases
CREATE TABLE public.credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pack_type text NOT NULL, -- 'intro', 'single', '4pack', '8pack', '12pack', 'gift'
  credits_added integer NOT NULL,
  amount_paid_cents integer NOT NULL,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_purchases_student ON public.credit_purchases (student_id);

-- RLS
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_purchases_select_own" ON public.credit_purchases
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "credit_purchases_select_admin" ON public.credit_purchases
  FOR SELECT USING (public.is_admin());
