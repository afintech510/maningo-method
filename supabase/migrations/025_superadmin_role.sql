-- Add 'superadmin' role for the studio's building owner (lessor) — gates
-- the Lock month / Mark paid actions on the Host Hampton rent ledger.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'admin', 'superadmin'));
