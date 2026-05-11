-- Provisional credits on cash/venmo pack purchases. When a member submits a
-- manual payment, we grant +1 credit immediately so they can book and attend
-- one class while settling up. The remainder is granted on mark_paid; the
-- provisional credit is clawed back (if balance allows) on cancel.

ALTER TABLE public.manual_payments
  ADD COLUMN IF NOT EXISTS provisional_credits_applied int NOT NULL DEFAULT 0
  CHECK (provisional_credits_applied >= 0);
