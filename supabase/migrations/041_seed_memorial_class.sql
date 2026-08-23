-- Migration 041: seed the free 9/11 memorial class.
--
-- One-off data seed (same pattern as 038_seed_detour10.sql). Idempotent —
-- re-running is a no-op because of the NOT EXISTS guard. Applied MANUALLY
-- via the Supabase SQL editor (there is no automated migration runner).
--
-- Details:
--   Sept 11, 2026 · 7:30 AM studio-local (EDT/UTC-4 → 11:30 UTC)
--   Free (is_free = true) · capacity 30 · on the gazebo lawn in Westhampton
--   Suggested $20 cash donation on-site, 100% to Tunnel to Towers.

INSERT INTO public.classes
  (title, description, starts_at, duration_minutes, max_capacity, is_free, status, created_by)
SELECT
  '9/11 Memorial — Pilates on the Lawn',
  'On the gazebo lawn in Westhampton. A free community class honoring the memory of September 11th — all levels welcome, bring a mat. Suggested $20 cash donation on-site, 100% to the Tunnel to Towers Foundation (t2t.org).',
  '2026-09-11T11:30:00+00:00'::timestamptz,
  50,
  30,
  true,
  'scheduled',
  (SELECT id FROM public.profiles
     WHERE email = 'chelsea@maningomethod.com'
     LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM public.classes
  WHERE title = '9/11 Memorial — Pilates on the Lawn'
    AND starts_at = '2026-09-11T11:30:00+00:00'::timestamptz
);
