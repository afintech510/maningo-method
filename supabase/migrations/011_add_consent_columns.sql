-- Marketing consent + ToS acceptance tracking on profiles
-- Required for SMS A2P 10DLC compliance and ESIGN-style record retention

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sms_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sms_consent_ip inet,
  ADD COLUMN IF NOT EXISTS sms_consent_text text,
  ADD COLUMN IF NOT EXISTS email_marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_marketing_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS tos_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS tos_accepted_ip inet,
  ADD COLUMN IF NOT EXISTS tos_version text;
