-- Migration 006: All RLS policies
-- Review fixes: REV-004 (WITH CHECK prevents role escalation)

-- ═══ PROFILES ═══

-- Students read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Admin reads all profiles
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Students update their own profile — CANNOT change role (REV-004)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (role = 'student');

-- Admin can update any profile
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ═══ CLASSES ═══

-- Anyone can read classes (public schedule)
CREATE POLICY "classes_select_public" ON public.classes
  FOR SELECT USING (true);

-- Admin can insert classes
CREATE POLICY "classes_insert_admin" ON public.classes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can update classes
CREATE POLICY "classes_update_admin" ON public.classes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can delete classes
CREATE POLICY "classes_delete_admin" ON public.classes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ═══ BOOKINGS ═══

-- Students can read their own bookings
CREATE POLICY "bookings_select_own" ON public.bookings
  FOR SELECT USING (auth.uid() = student_id);

-- Admin can read all bookings
CREATE POLICY "bookings_select_admin" ON public.bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Students can update their own bookings (cancel)
CREATE POLICY "bookings_update_own" ON public.bookings
  FOR UPDATE USING (auth.uid() = student_id);

-- Admin can update all bookings
CREATE POLICY "bookings_update_admin" ON public.bookings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ═══ SUBSCRIPTIONS ═══

-- Students can read their own subscription
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
  FOR SELECT USING (auth.uid() = student_id);

-- Admin can read all subscriptions
CREATE POLICY "subscriptions_select_admin" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
