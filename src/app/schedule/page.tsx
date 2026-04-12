import { ClassSchedule } from '@/components/schedule/ClassSchedule';
import { ToastProvider } from '@/components/feedback/Toast';
import { getAuth } from '@/lib/auth';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';

export default async function SchedulePage() {
  const auth = await getAuth();

  // If authenticated, check subscription and bookings
  const hasSubscription = false;
  const bookedClassIds: string[] = [];
  const pendingClassIds: string[] = [];

  if (auth) {
    // These will be fetched client-side via the ClassSchedule component
    // For now, pass empty arrays — the BookingButton handles its own state
  }

  return (
    <>
      <Header />
      <div className="px-4 py-6 pb-20 lg:pb-6">
        <h1 className="text-2xl font-bold mb-4">Class Schedule</h1>
        <ToastProvider>
          <ClassSchedule
            isAuthenticated={!!auth}
            hasSubscription={hasSubscription}
            bookedClassIds={bookedClassIds}
            pendingClassIds={pendingClassIds}
          />
        </ToastProvider>
      </div>
      <MobileNav />
    </>
  );
}
