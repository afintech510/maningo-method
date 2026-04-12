-- Fix infinite recursion in profiles RLS policies
-- The admin policies query profiles from within profiles policies, causing a loop.
-- Solution: SECURITY DEFINER function bypasses RLS for the admin check.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop the recursive policies
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "bookings_select_admin" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_admin" ON public.bookings;
DROP POLICY IF EXISTS "subscriptions_select_admin" ON public.subscriptions;
DROP POLICY IF EXISTS "classes_insert_admin" ON public.classes;
DROP POLICY IF EXISTS "classes_update_admin" ON public.classes;
DROP POLICY IF EXISTS "classes_delete_admin" ON public.classes;

-- Recreate using is_admin() function
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "bookings_select_admin" ON public.bookings
  FOR SELECT USING (public.is_admin());

CREATE POLICY "bookings_update_admin" ON public.bookings
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "subscriptions_select_admin" ON public.subscriptions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "classes_insert_admin" ON public.classes
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "classes_update_admin" ON public.classes
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "classes_delete_admin" ON public.classes
  FOR DELETE USING (public.is_admin());
