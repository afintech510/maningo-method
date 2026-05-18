-- Admin-editable email templates for the bulk-email feature on /admin/members.
-- Seeded with a handful of starter templates (waiver reminder, credits nudge,
-- we-miss-you, blank, generic announcement). Admin can edit any of them
-- in-place via PATCH and create new ones via POST.

CREATE TABLE IF NOT EXISTS public.member_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE,                       -- stable key for seeded templates; NULL for admin-created
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_email_templates_slug
  ON public.member_email_templates(slug) WHERE slug IS NOT NULL;

ALTER TABLE public.member_email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_email_templates_admin_all ON public.member_email_templates;
CREATE POLICY member_email_templates_admin_all ON public.member_email_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin'))
  );

-- Seed five starter templates. ON CONFLICT keeps prior edits intact if the
-- migration is rerun on a database where Chelsea has already tweaked the copy.
INSERT INTO public.member_email_templates (slug, name, subject, body) VALUES
  (
    'waiver_reminder',
    'Waiver reminder',
    'Quick step before your first class',
    E'Hi {{first_name}},\n\nWe noticed you haven''t signed the liability waiver yet — it''s a one-time, two-minute thing and unlocks booking. Sign it here:\n\n{{waiver_url}}\n\nSee you on the mat!\n\n— Chelsea'
  ),
  (
    'credits_nudge',
    'Use your credits',
    'You''ve got class credits waiting',
    E'Hi {{first_name}},\n\nYou have {{credits}} class credit(s) on your account. Pick a class that fits your week:\n\n{{schedule_url}}\n\nCredits never expire — but the mat misses you.\n\n— Chelsea'
  ),
  (
    'we_miss_you',
    'We miss you',
    'Haven''t seen you in a minute',
    E'Hi {{first_name}},\n\nIt''s been {{weeks_since_last_attended}} weeks since your last class. Whenever you''re ready, the schedule''s here:\n\n{{schedule_url}}\n\nAlways happy to chat if anything''s in the way.\n\n— Chelsea'
  ),
  (
    'announcement',
    'Studio announcement',
    '[Subject — edit me]',
    E'Hi {{first_name}},\n\n[Write your update here. Use {{first_name}}, {{credits}}, {{schedule_url}}, {{waiver_url}}, {{packs_url}}, {{weeks_since_last_attended}} as inline placeholders.]\n\n— Chelsea'
  ),
  (
    'blank',
    'Blank',
    '',
    ''
  )
ON CONFLICT (slug) DO NOTHING;
