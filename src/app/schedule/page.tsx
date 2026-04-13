import { ClassSchedule } from '@/components/schedule/ClassSchedule';
import { ToastProvider } from '@/components/feedback/Toast';
import { getAuth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';

export default async function SchedulePage() {
  const auth = await getAuth();

  let hasCredits = false;
  let bookedClassIds: string[] = [];

  if (auth) {
    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', auth.user.id)
      .single();

    hasCredits = (profile?.credits || 0) > 0;

    const { data: bookings } = await supabase
      .from('bookings')
      .select('class_id')
      .eq('student_id', auth.user.id)
      .eq('status', 'confirmed');

    bookedClassIds = (bookings || []).map((b) => b.class_id);
  }

  return (
    <>
      <Header />
      <div className="px-4 py-6 pb-20 lg:pb-6">
        <h1 className="text-2xl font-bold mb-4">Class Schedule</h1>
        <ToastProvider>
          <ClassSchedule
            isAuthenticated={!!auth}
            hasCredits={hasCredits}
            bookedClassIds={bookedClassIds}
          />
        </ToastProvider>
      </div>
      <MobileNav />
    </>
  );
}
