-- Liability waiver tracking on profiles
-- Enforced as a precondition for first booking

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS waiver_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS waiver_signwell_doc_id text,
  ADD COLUMN IF NOT EXISTS waiver_pdf_url text,
  ADD COLUMN IF NOT EXISTS waiver_signed_ip inet,
  ADD COLUMN IF NOT EXISTS waiver_signer_kind text CHECK (waiver_signer_kind IN ('adult','parent_guardian')),
  ADD COLUMN IF NOT EXISTS waiver_minor_name text,
  ADD COLUMN IF NOT EXISTS waiver_minor_dob date;
