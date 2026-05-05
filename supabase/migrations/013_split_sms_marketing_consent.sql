-- Split SMS consent into transactional vs marketing for TCPA / A2P 10DLC compliance.
-- Transactional consent (sms_consent) = booking reminders, schedule changes, account alerts.
-- Marketing consent (sms_marketing_consent) = promotional offers, separate opt-in.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sms_marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_marketing_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS waiver_acknowledged boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.sms_consent IS 'Transactional SMS opt-in (booking reminders, schedule changes)';
COMMENT ON COLUMN public.profiles.sms_marketing_consent IS 'Promotional/marketing SMS opt-in (separate from transactional)';
