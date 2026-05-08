-- Credit adjustments audit table + race-free RPC + lifetime-spend view.
-- Every change to profiles.credits flows through apply_credit_delta() so
-- we have a complete audit trail and atomic balance updates.

CREATE TABLE IF NOT EXISTS public.credit_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delta int NOT NULL CHECK (delta <> 0),
  balance_after int NOT NULL CHECK (balance_after >= 0),
  reason text NOT NULL CHECK (length(reason) BETWEEN 3 AND 280),
  source text NOT NULL CHECK (source IN (
    'admin_manual','manual_payment','stripe_purchase',
    'booking_create','booking_cancel','referral_reward','gift_redeem'
  )),
  admin_id uuid REFERENCES public.profiles(id),
  related_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_adjustments_student ON public.credit_adjustments(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_adjustments_source ON public.credit_adjustments(source);

ALTER TABLE public.credit_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_adjustments_owner_read ON public.credit_adjustments;
CREATE POLICY credit_adjustments_owner_read ON public.credit_adjustments
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS credit_adjustments_admin_all ON public.credit_adjustments;
CREATE POLICY credit_adjustments_admin_all ON public.credit_adjustments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Atomic credit mutation: locks profile row, applies delta, writes audit row.
-- Returns new balance. Raises 'INSUFFICIENT_CREDITS' if balance would go negative.
CREATE OR REPLACE FUNCTION public.apply_credit_delta(
  p_student_id uuid,
  p_delta int,
  p_reason text,
  p_source text,
  p_admin_id uuid DEFAULT NULL,
  p_related_id text DEFAULT NULL
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current int;
  v_new int;
BEGIN
  IF p_delta = 0 THEN
    RAISE EXCEPTION 'ZERO_DELTA';
  END IF;

  SELECT credits INTO v_current
  FROM public.profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND';
  END IF;

  v_new := v_current + p_delta;
  IF v_new < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  UPDATE public.profiles SET credits = v_new, updated_at = now() WHERE id = p_student_id;

  INSERT INTO public.credit_adjustments(student_id, delta, balance_after, reason, source, admin_id, related_id)
  VALUES (p_student_id, p_delta, v_new, p_reason, p_source, p_admin_id, p_related_id);

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_credit_delta TO authenticated, service_role;

-- Lifetime spend view: sum of card purchases (with fee) + paid manual payments + gift purchases by this user
CREATE OR REPLACE VIEW public.student_lifetime_spend AS
SELECT
  p.id,
  COALESCE(cp.total, 0) + COALESCE(mp.total, 0) + COALESCE(gp.total, 0) AS total_cents
FROM public.profiles p
LEFT JOIN (
  SELECT student_id, SUM(amount_paid_cents)::int AS total
  FROM public.credit_purchases
  GROUP BY student_id
) cp ON cp.student_id = p.id
LEFT JOIN (
  SELECT student_id, SUM(amount_cents)::int AS total
  FROM public.manual_payments
  WHERE status = 'paid'
  GROUP BY student_id
) mp ON mp.student_id = p.id
LEFT JOIN (
  SELECT purchaser_id AS student_id, SUM(amount_cents)::int AS total
  FROM public.gift_packs
  WHERE status IN ('active','redeemed')
  GROUP BY purchaser_id
) gp ON gp.student_id = p.id;
