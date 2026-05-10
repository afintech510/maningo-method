-- Studio-wide knobs the manager can tune from /admin. Single-row table keyed
-- on a UUID stable across upserts (we always read/write id = the magic
-- "settings" row). Kept narrow on purpose; new flags get a column.

CREATE TABLE IF NOT EXISTS public.studio_settings (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  booking_horizon_days int NOT NULL DEFAULT 30 CHECK (booking_horizon_days BETWEEN 1 AND 365),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

-- Seed the singleton row if missing.
INSERT INTO public.studio_settings (id) VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.studio_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS studio_settings_read_all ON public.studio_settings;
CREATE POLICY studio_settings_read_all ON public.studio_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS studio_settings_admin_write ON public.studio_settings;
CREATE POLICY studio_settings_admin_write ON public.studio_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
