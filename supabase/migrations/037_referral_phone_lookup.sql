-- Lookup a profile by phone number, ignoring formatting differences.
-- Strips both the stored phone and the input to digits-only before comparing.
CREATE OR REPLACE FUNCTION public.lookup_profile_by_phone_digits(p_digits text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.profiles
  WHERE regexp_replace(phone, '[^0-9]', '', 'g') = p_digits
  LIMIT 1;
$$;
