-- The admin sales dashboard computed all-time and month-to-date revenue by
-- fetching one row per purchase (credit_purchases + paid manual_payments) and
-- summing the amounts in JS. PostgREST caps any query at 1000 rows, so once
-- either table crosses 1000 rows the sum silently drops the overflow and
-- revenue under-reports with no error.
--
-- Both tables are still under the cap today, so the displayed totals are
-- currently correct — this is pre-emptive. It is the same defect that hit the
-- class manager (039_class_booking_counts.sql) and the members list
-- (042_student_attendance_stats.sql), where the tables had already crossed it.
--
-- Push the four sums into Postgres so they can never hit the row cap. Scope is
-- deliberately unchanged from the JS version: Stripe credit purchases plus
-- paid manual payments. Gift pack sales are still excluded from these headline
-- totals, as before.
--
-- Month boundary is passed in rather than derived here, so the figure stays
-- anchored to the studio's local month as computed by the app (now(), inside
-- this function, would use the database's timezone instead).
--
-- SECURITY DEFINER so the totals are accurate regardless of the caller's RLS
-- context; it exposes only four aggregate numbers (no rows, no PII). The
-- calling page is inside the admin-gated layout and uses the service-role
-- client.

CREATE OR REPLACE FUNCTION public.revenue_totals(p_month_start timestamptz)
RETURNS TABLE (
  stripe_all_cents bigint,
  stripe_month_cents bigint,
  manual_all_cents bigint,
  manual_month_cents bigint
) AS $$
  SELECT
    COALESCE((
      SELECT SUM(amount_paid_cents) FROM public.credit_purchases
    ), 0),
    COALESCE((
      SELECT SUM(amount_paid_cents) FROM public.credit_purchases
      WHERE created_at >= p_month_start
    ), 0),
    COALESCE((
      SELECT SUM(amount_cents) FROM public.manual_payments
      WHERE status = 'paid'
    ), 0),
    COALESCE((
      SELECT SUM(amount_cents) FROM public.manual_payments
      WHERE status = 'paid' AND paid_at >= p_month_start
    ), 0);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

REVOKE ALL ON FUNCTION public.revenue_totals(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revenue_totals(timestamptz) TO authenticated, service_role;
