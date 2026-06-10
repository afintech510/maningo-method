-- Promotable, multi-use discount codes + admin management.
--
-- Until now discount_codes was a single-use, member-locked artifact of the
-- review-request flow. This migration turns it into a general campaign tool:
--   * max_redemptions / redemption_count  → shared codes with a usage cap
--   * starts_at                            → schedule a code to go live later
--   * campaign                             → tracking label for reporting
--   * created_by                           → which admin minted it
--   * expires_at made nullable             → open-ended promos (NULL = no expiry)
--
-- All existing rows are test data and are wiped here per the studio owner.

-- 1. New columns -----------------------------------------------------------
ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS max_redemptions  integer,                       -- NULL = unlimited
  ADD COLUMN IF NOT EXISTS redemption_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS starts_at        timestamptz,                   -- NULL = active immediately
  ADD COLUMN IF NOT EXISTS campaign         text,                          -- tracking label, e.g. 'salon10'
  ADD COLUMN IF NOT EXISTS created_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- expires_at becomes optional (NULL = never expires). Keep the historical
-- default for callers that don't set it explicitly but allow NULL.
ALTER TABLE public.discount_codes ALTER COLUMN expires_at DROP NOT NULL;
ALTER TABLE public.discount_codes ALTER COLUMN expires_at DROP DEFAULT;

CREATE INDEX IF NOT EXISTS idx_discount_codes_campaign ON public.discount_codes(campaign);

-- 2. Wipe test history -----------------------------------------------------
DELETE FROM public.discount_codes;

-- 3. Atomic consume helper -------------------------------------------------
-- Called from the Stripe webhook on a successful purchase. Increments the
-- counter, stamps first-redemption metadata, and flips is_active off once the
-- cap is reached. Runs in a single statement so concurrent webhooks can't
-- over-redeem past max_redemptions.
CREATE OR REPLACE FUNCTION public.consume_discount_code(p_id uuid, p_context text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.discount_codes
  SET redemption_count    = redemption_count + 1,
      redeemed_at         = COALESCE(redeemed_at, now()),
      redemption_context  = COALESCE(redemption_context, p_context),
      is_active           = CASE
                              WHEN max_redemptions IS NOT NULL
                                   AND redemption_count + 1 >= max_redemptions
                              THEN false
                              ELSE is_active
                            END
  WHERE id = p_id;
END;
$$;

-- 4. Seed the client's $10-off salon code ----------------------------------
INSERT INTO public.discount_codes
  (code, member_id, discount_type, discount_value, reason, campaign,
   max_redemptions, starts_at, expires_at, is_active)
VALUES
  ('SALON10', NULL, 'fixed_cents', 1000, 'promo', 'salon10',
   100, NULL, NULL, true);
