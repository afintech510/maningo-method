-- Superadmin ⊇ admin everywhere, not just in app-side requireAuth().
-- The RLS-side is_admin() helper was hard-coded to role='admin', which
-- broke every admin read (bookings, profiles, etc.) for users whose
-- role is 'superadmin'. Fixed by widening the predicate.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
