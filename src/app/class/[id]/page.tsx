import Link from 'next/link';
import { Suspense } from 'react';
import { ClassCard } from '@/components/schedule/ClassCard';
import { ToastProvider } from '@/components/feedback/Toast';
import { getAuth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStudioSettings } from '@/lib/studio-settings';
import { formatStudioDate, formatStudioTime } from '@/lib/timezone';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';

interface Props {
  params: { id: string };
}

// A focused, shareable landing for a single class — the target for QR codes /
// direct links. Reuses the same ClassCard (and its full book/waitlist/free
// flow) as the schedule, so behaviour stays identical everywhere.
export default async function ClassPage({ params }: Props) {
  const supabase = createAdminClient();

  const { data: cls } = await supabase
    .from('classes')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!cls || cls.status !== 'scheduled') {
    return (
      <>
        <Header />
        <div className="px-4 py-16 max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold mb-2">Class not available</h1>
          <p className="text-muted-foreground mb-6">
            This class may have been cancelled or is no longer on the schedule.
          </p>
          <Link
            href="/schedule"
            className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-[#2d2d2d] text-white text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
          >
            See the full schedule
          </Link>
        </div>
        <MobileNav />
      </>
    );
  }

  // Booking count → spots remaining (pending + confirmed hold a seat).
  const { count } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', params.id)
    .in('status', ['pending', 'confirmed']);

  const { booking_horizon_days } = await getStudioSettings();
  const startsAtMs = new Date(cls.starts_at).getTime();
  const bookableFromMs = startsAtMs - booking_horizon_days * 86400000;

  const classData = {
    id: cls.id,
    title: cls.title,
    description: cls.description,
    starts_at: cls.starts_at,
    duration_minutes: cls.duration_minutes,
    max_capacity: cls.max_capacity,
    is_free: cls.is_free,
    spots_remaining: cls.max_capacity - (count || 0),
    bookable: Date.now() >= bookableFromMs,
    bookable_from: new Date(bookableFromMs).toISOString(),
  };

  // Viewer state — mirrors schedule/page.tsx but scoped to this one class.
  const auth = await getAuth();
  let credits = 0;
  let hasCredits = false;
  let bookingId: string | undefined;
  let waitlistEntry: { id: string; position: number } | undefined;

  if (auth) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits, gift_balance_cents')
      .eq('id', auth.user.id)
      .single();
    credits = profile?.credits || 0;
    hasCredits = credits > 0 || (profile?.gift_balance_cents || 0) >= 2500;

    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('student_id', auth.user.id)
      .eq('class_id', params.id)
      .eq('status', 'confirmed')
      .maybeSingle();
    bookingId = booking?.id;

    const { data: myWaiting } = await supabase
      .from('waitlists')
      .select('id')
      .eq('student_id', auth.user.id)
      .eq('class_id', params.id)
      .eq('status', 'waiting')
      .maybeSingle();
    if (myWaiting) {
      const { data: queue } = await supabase
        .from('waitlists')
        .select('id')
        .eq('class_id', params.id)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true });
      const pos = (queue || []).findIndex((w) => w.id === myWaiting.id) + 1;
      waitlistEntry = { id: myWaiting.id, position: pos || 1 };
    }
  }

  return (
    <>
      <Header />
      <div className="px-4 py-6 pb-20 lg:pb-6 max-w-md mx-auto">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#c9a96e] font-medium mb-1">
          {formatStudioDate(cls.starts_at, 'EEEE, MMMM d')} · {formatStudioTime(cls.starts_at)}
        </p>
        <h1 className="text-2xl font-bold mb-4">{cls.title}</h1>
        <ToastProvider>
          <Suspense fallback={null}>
            <ClassCard
              classData={classData}
              isAuthenticated={!!auth}
              hasCredits={hasCredits}
              credits={credits}
              bookingId={bookingId}
              waitlistEntry={waitlistEntry}
              returnTo={`/class/${params.id}`}
            />
          </Suspense>
        </ToastProvider>
        <p className="text-center mt-4">
          <Link href="/schedule" className="text-sm text-[#c9a96e] hover:underline">
            View the full schedule
          </Link>
        </p>
      </div>
      <MobileNav />
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const supabase = createAdminClient();
  const { data: cls } = await supabase
    .from('classes')
    .select('title, starts_at')
    .eq('id', params.id)
    .maybeSingle();
  if (!cls) return { title: 'Class | Maningo Method' };
  const when = `${formatStudioDate(cls.starts_at, 'EEE, MMM d')} · ${formatStudioTime(cls.starts_at)}`;
  return {
    title: `${cls.title} — ${when} | Maningo Method`,
    description: `Book ${cls.title} at Maningo Method (${when}).`,
    robots: { index: false },
  };
}
