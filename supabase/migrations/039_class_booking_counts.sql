-- The admin class-list route counted "X/20 booked" by fetching one row per
-- active booking across ALL classes, then tallying in JS. PostgREST caps any
-- query at 1000 rows, so once total active bookings crossed 1000 the tally
-- silently dropped the overflow — undercounting the left-column count on the
-- class manager while the per-class roster panel (queried one class at a time)
-- stayed correct. Replace the row-fetch with a grouped COUNT that returns one
-- row per class, which can never hit the row cap.
--
-- SECURITY DEFINER so the count is accurate regardless of the caller's RLS
-- context; it exposes only aggregate counts (no booking or member PII). The
-- calling route is still gated by requireAuth('admin').

CREATE OR REPLACE FUNCTION public.class_booking_counts()
RETURNS TABLE (class_id uuid, booked_count bigint) AS $$
  SELECT class_id, count(*)
  FROM public.bookings
  WHERE status IN ('pending', 'confirmed')
  GROUP BY class_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

REVOKE ALL ON FUNCTION public.class_booking_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.class_booking_counts() TO authenticated, service_role;
