-- Allow gift purchases without an account.
-- purchaser_id becomes nullable; capture purchaser email + name in the row
-- so the post-purchase confirmation email and downstream reporting still work.

ALTER TABLE public.gift_packs
  ALTER COLUMN purchaser_id DROP NOT NULL;

ALTER TABLE public.gift_packs
  ADD COLUMN IF NOT EXISTS purchaser_email text,
  ADD COLUMN IF NOT EXISTS purchaser_name text;

-- Tighten the lifetime-spend view so guest gift rows (purchaser_id IS NULL)
-- don't get attributed to anyone.
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
  WHERE status IN ('active','redeemed') AND purchaser_id IS NOT NULL
  GROUP BY purchaser_id
) gp ON gp.student_id = p.id;
