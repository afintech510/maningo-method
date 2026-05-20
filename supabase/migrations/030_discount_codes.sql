-- Single-use discount codes issued by automated flows (today: post-class
-- review-request emails). The code is meant for the member it was minted
-- against — redemption is gated on the member_id match at checkout.

CREATE TABLE IF NOT EXISTS public.discount_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,
  member_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  discount_type   text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed_cents')),
  discount_value  numeric NOT NULL DEFAULT 15,
  reason          text NOT NULL DEFAULT 'review_request',
  issued_at       timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  redeemed_at     timestamptz,
  redemption_context text,    -- 'credit_pack', 'drop_in', 'gift_card' — set when consumed
  is_active       boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_member ON public.discount_codes(member_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active_unused
  ON public.discount_codes(member_id, expires_at)
  WHERE redeemed_at IS NULL AND is_active = true;

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Members can see their own active codes (so the dashboard could surface them later).
CREATE POLICY "discount_codes_select_own" ON public.discount_codes
  FOR SELECT USING (auth.uid() = member_id);

-- Admins / superadmins see everything.
CREATE POLICY "discount_codes_select_admin" ON public.discount_codes
  FOR SELECT USING (public.is_admin());
CREATE POLICY "discount_codes_modify_admin" ON public.discount_codes
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
