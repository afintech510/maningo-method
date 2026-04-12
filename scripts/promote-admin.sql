-- Run once via Supabase SQL editor or CLI. NOT a migration file.
-- Replace 'instructor@example.com' with the actual instructor email.
-- The instructor must have registered first via the signup flow.

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'instructor@example.com';
