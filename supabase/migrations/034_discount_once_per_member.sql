-- Once-per-member discount enforcement.
--
-- max_redemptions caps TOTAL redemptions, but a single member could still use
-- a shared code on multiple purchases. This adds per-member tracking so a code
-- flagged once_per_member can be redeemed at most once by each member (still
-- bounded overall by max_redemptions).

-- 1. Per-code flag. Default true: promo codes are once-per-member unless an
--    admin opts out (e.g. a reusable QA code).
ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS once_per_member boolean NOT NULL DEFAULT true;

-- 2. Redemption ledger — one row per (code, member). The unique constraint is
--    the hard guarantee behind once-per-member.
CREATE TABLE IF NOT EXISTS public.discount_code_redemptions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  member_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  redeemed_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (discount_code_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_discount_redemptions_member
  ON public.discount_code_redemptions(member_id);

ALTER TABLE public.discount_code_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "discount_redemptions_admin" ON public.discount_code_redemptions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Consume helper now also records the per-member redemption. p_member_id is
--    optional/defaulted so any older caller keeps working, but both call sites
--    (Stripe webhook + manual cash/Venmo) pass it.
CREATE OR REPLACE FUNCTION public.consume_discount_code(
  p_id uuid,
  p_context text,
  p_member_id uuid DEFAULT NULL
)
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

  IF p_member_id IS NOT NULL THEN
    INSERT INTO public.discount_code_redemptions (discount_code_id, member_id)
    VALUES (p_id, p_member_id)
    ON CONFLICT (discount_code_id, member_id) DO NOTHING;
  END IF;
END;
$$;

-- SALON10 already exists; the new column defaults it to once_per_member = true.
