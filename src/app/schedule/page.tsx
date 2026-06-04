import { Suspense } from 'react';
import { ClassSchedule } from '@/components/schedule/ClassSchedule';
import { ToastProvider } from '@/components/feedback/Toast';
import { getAuth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';

export const metadata = {
  title: 'Class Schedule | Mat & Sculpt Pilates in Speonk, NY',
  description:
    'See upcoming Mat & Sculpt Pilates classes at Maningo Method in Speonk, NY and book your spot online. Small all-levels group classes, max 20 students.',
  alternates: { canonical: '/schedule' },
};

export default async function SchedulePage() {
  const auth = await getAuth();

  let credits = 0;
  let hasCredits = false;
  let bookingsByClassId: Record<string, string> = {};

  if (auth) {
    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('credits, gift_balance_cents')
      .eq('id', auth.user.id)
      .single();

    credits = profile?.credits || 0;
    const giftBalanceCents = profile?.gift_balance_cents || 0;
    // Either a regular credit or enough gift balance to auto-convert one.
    hasCredits = credits > 0 || giftBalanceCents >= 2500;

    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, class_id')
      .eq('student_id', auth.user.id)
      .eq('status', 'confirmed');

    bookingsByClassId = (bookings || []).reduce<Record<string, string>>((acc, b) => {
      acc[b.class_id] = b.id;
      return acc;
    }, {});
  }

  return (
    <>
      <Header />
      <div className="px-4 py-6 pb-20 lg:pb-6">
        <h1 className="text-2xl font-bold mb-4">Class Schedule</h1>
        <ToastProvider>
          <Suspense fallback={null}>
            <ClassSchedule
              isAuthenticated={!!auth}
              hasCredits={hasCredits}
              credits={credits}
              bookingsByClassId={bookingsByClassId}
            />
          </Suspense>
        </ToastProvider>
      </div>
      <MobileNav />
    </>
  );
}
