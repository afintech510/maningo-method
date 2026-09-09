-- The admin members list computed each member's "Classes" count and "Last
-- class" date by fetching one row per confirmed past booking across ALL
-- students, then tallying in JS. PostgREST caps any query at 1000 rows, and
-- the fetch was ordered by class start descending — so once total past
-- confirmed bookings crossed 1000, only the 1000 most recent survived and the
-- rest were silently dropped.
--
-- Because that window slides forward as new classes are held, long-standing
-- members' totals *decreased* over time: their oldest bookings aged out of the
-- window. (Observed: a member with 25 confirmed past bookings displayed 21.)
-- last_attended_at was affected the same way, which in turn skewed the bulk
-- email "inactive since" filter.
--
-- This is the same defect 039_class_booking_counts.sql fixed for the class
-- manager; that fix only covered the class list route. Replace the row-fetch
-- with a grouped aggregate that returns one row per student, which can never
-- hit the row cap.
--
-- SECURITY DEFINER so the counts are accurate regardless of the caller's RLS
-- context; it exposes only per-student aggregates (no booking rows or PII
-- beyond the student id). Calling routes are still gated by
-- requireAuth('admin').

CREATE OR REPLACE FUNCTION public.student_attendance_stats()
RETURNS TABLE (
  student_id uuid,
  classes_attended bigint,
  last_attended_at timestamptz
) AS $$
  SELECT
    b.student_id,
    count(*),
    max(c.starts_at)
  FROM public.bookings b
  JOIN public.classes c ON c.id = b.class_id
  WHERE b.status = 'confirmed'
    AND c.starts_at < now()
  GROUP BY b.student_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

REVOKE ALL ON FUNCTION public.student_attendance_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_attendance_stats() TO authenticated, service_role;
