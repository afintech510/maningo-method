-- Recurring class scheduling: tag generated classes with a series_id so a
-- weekly recurrence can be bulk-cancelled or extended later.

CREATE TABLE IF NOT EXISTS public.class_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  duration_minutes int NOT NULL CHECK (duration_minutes > 0),
  max_capacity int NOT NULL CHECK (max_capacity > 0),
  days_of_week int[] NOT NULL,           -- 0=Sun ... 6=Sat
  times_of_day text[] NOT NULL,          -- 'HH:MM' 24h, studio-local
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS series_id uuid REFERENCES public.class_series(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_classes_series_id ON public.classes(series_id);

ALTER TABLE public.class_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS class_series_admin_all ON public.class_series;
CREATE POLICY class_series_admin_all ON public.class_series
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
