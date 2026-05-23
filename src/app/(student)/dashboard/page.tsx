import { createAdminClient } from '@/lib/supabase/admin';
import { getAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UpcomingBookings } from '@/components/dashboard/UpcomingBookings';
import { ClassHistory } from '@/components/dashboard/ClassHistory';
import { BuyPacks } from '@/components/dashboard/BuyPacks';
import { GiftCardCard } from '@/components/dashboard/GiftCardCard';
import { ReferralCard } from '@/components/dashboard/ReferralCard';
import { HostHamptonPromo } from '@/components/dashboard/HostHamptonPromo';
import { WeeklySchedule } from '@/components/dashboard/WeeklySchedule';
import { ToastProvider } from '@/components/feedback/Toast';
import { Card } from '@/components/ui/Card';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { format } from 'date-fns';
import { formatStudioDate, formatStudioTime } from '@/lib/timezone';

export default async function DashboardPage() {
  const auth = await getAuth();
  if (!auth) redirect('/login');
  if (auth.user.role === 'admin' || auth.user.role === 'superadmin') redirect('/admin');

  const supabase = createAdminClient();

  // Fetch profile with credits, referral code, signup timestamp, and waiver status
  const { data: profile } = await supabase
    .from('profiles')
    .select('credits, gift_balance_cents, referral_code, created_at, waiver_signed_at')
    .eq('id', auth.user.id)
    .single();

  const credits = profile?.credits || 0;
  const giftBalanceCents = profile?.gift_balance_cents || 0;
  // Members can also book using their gift-card dollar balance ($25 = 1 credit).
  const hasBookingCurrency = credits > 0 || giftBalanceCents >= 2500;

  // Generate referral code if missing
  let referralCode = profile?.referral_code;
  if (!referralCode) {
    referralCode = auth.user.id.substring(0, 8).toUpperCase();
    await supabase
      .from('profiles')
      .update({ referral_code: referralCode })
      .eq('id', auth.user.id);
  }

  // Fetch all bookings
  const { data: bookingsData } = await supabase
    .from('bookings')
    .select(`
      id, class_id, status, payment_type, created_at,
      classes (title, starts_at, duration_minutes)
    `)
    .eq('student_id', auth.user.id)
    .order('created_at', { ascending: false });

  const now = new Date();
  const allBookings = (bookingsData || []).map((b) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cls = (b as any).classes;
    const endTime = cls ? new Date(new Date(cls.starts_at).getTime() + cls.duration_minutes * 60000) : now;
    return {
      id: b.id,
      class_id: b.class_id,
      class_title: cls?.title || '',
      class_starts_at: cls?.starts_at || '',
      class_duration_minutes: cls?.duration_minutes || 0,
      status: b.status,
      created_at: b.created_at,
      is_upcoming: b.status === 'confirmed' && endTime > now,
      is_past: endTime <= now && b.status === 'confirmed',
    };
  });

  const upcoming = allBookings
    .filter((b) => b.is_upcoming)
    .sort((a, b) => new Date(a.class_starts_at).getTime() - new Date(b.class_starts_at).getTime());
  const history = allBookings.filter((b) => b.is_past || b.status === 'cancelled');
  const totalAttended = allBookings.filter((b) => b.is_past).length;
  const memberSince = profile?.created_at ? format(new Date(profile.created_at), 'MMM yyyy') : null;
  const firstName = (auth.user.full_name || '').split(' ')[0] || 'there';

  // Fetch credit purchases
  const { data: purchases } = await supabase
    .from('credit_purchases')
    .select('*')
    .eq('student_id', auth.user.id)
    .order('created_at', { ascending: false });

  const nextClass = upcoming[0] || null;

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      {/* Hero card */}
      <section className="rounded-2xl bg-gradient-to-br from-[#c9a96e]/15 via-[#faf9f6] to-white border border-[#c9a96e]/30 p-5 sm:p-6 mb-4 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-[#c9a96e]/10 blur-2xl pointer-events-none" />
        <div className="relative">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">
            {memberSince ? `Member since ${memberSince}` : 'Welcome'}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-1 leading-tight">Hi, {firstName}!</h1>
          <p className="text-sm text-[#6b6b6b] break-all">{auth.user.email}</p>

          <div className="flex items-stretch gap-2 mt-4">
            <div className="flex-1 rounded-xl bg-white/70 backdrop-blur-sm border border-[#e5e2dc] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-[#6b6b6b] font-medium">Credits</p>
              <p className="text-xl sm:text-2xl font-bold leading-none mt-0.5">{credits}</p>
              {giftBalanceCents > 0 && (
                <p className="text-[10px] text-[#c9a96e] font-medium mt-0.5">
                  + ${(giftBalanceCents / 100).toFixed(2)} gift
                </p>
              )}
            </div>
            <div className="flex-1 rounded-xl bg-white/70 backdrop-blur-sm border border-[#e5e2dc] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-[#6b6b6b] font-medium">Attended</p>
              <p className="text-xl sm:text-2xl font-bold leading-none mt-0.5">{totalAttended}</p>
            </div>
            <div className="flex-1 rounded-xl bg-white/70 backdrop-blur-sm border border-[#e5e2dc] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-[#6b6b6b] font-medium">Booked</p>
              <p className="text-xl sm:text-2xl font-bold leading-none mt-0.5">{upcoming.length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Waiver banner — non-dismissable nudge for members who haven't signed yet */}
      {!profile?.waiver_signed_at && (
        <a
          href="/waiver/sign"
          className="block rounded-2xl border-2 border-[#c9a96e] bg-[#c9a96e]/10 hover:bg-[#c9a96e]/15 transition-colors p-4 sm:p-5 mb-4"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">
            Action needed
          </p>
          <p className="text-base sm:text-lg font-semibold text-[#2d2d2d]">
            Sign your liability waiver →
          </p>
          <p className="text-sm text-[#6b6b6b] mt-1">
            Quick, one-time, two-minute step. Required before your first class — Chelsea will
            ask at the door if it&rsquo;s still pending.
          </p>
        </a>
      )}

      {/* Next Class card */}
      <NextClassCard next={nextClass} />

      <ToastProvider>
        {/* My Booked Classes — full list including the one shown above */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">My Booked Classes</h2>
          <UpcomingBookings bookings={upcoming} />
        </div>

        {/* Add Credits */}
        <div className="mt-8">
          <BuyPacks />
        </div>

        {/* Gift a friend */}
        <div className="mt-6">
          <GiftCardCard />
        </div>

        {/* Referral */}
        <div className="mt-4">
          <ReferralCard referralCode={referralCode} />
        </div>

        {/* Host Hampton promo: party booking earns free classes */}
        <div className="mt-4">
          <HostHamptonPromo />
        </div>

        {/* Upcoming Classes (full schedule, future-only) */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Upcoming Classes</h2>
          <WeeklySchedule
            bookedClassIds={upcoming.map((b) => b.class_id)}
            hasCredits={hasBookingCurrency}
            credits={credits}
          />
        </div>

        {/* Class History */}
        {history.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Class History</h2>
            <ClassHistory bookings={history} />
          </div>
        )}

        {/* Purchase History */}
        {purchases && purchases.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Purchase History</h2>
            <div className="space-y-2">
              {purchases.map((p) => (
                <Card key={p.id}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium capitalize">{p.pack_type.replace('pack', '-Pack')}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm font-medium">+{p.credits_added} credits</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Log Out */}
        <div className="mt-8 pb-4">
          <LogoutButton />
        </div>
      </ToastProvider>
    </div>
  );
}

function NextClassCard({
  next,
}: {
  next:
    | {
        id: string;
        class_id: string;
        class_title: string;
        class_starts_at: string;
        class_duration_minutes: number;
      }
    | null;
}) {
  if (!next) {
    return (
      <section className="rounded-2xl border-2 border-dashed border-[#e5e2dc] bg-white p-5 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">My Next Class</p>
        <p className="font-semibold text-base mb-1">Nothing booked yet</p>
        <p className="text-sm text-muted-foreground mb-4">Pick a slot from the schedule and lock in your spot.</p>
        <a
          href="/schedule"
          className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-[#c9a96e] text-white text-sm font-medium hover:bg-[#b8955d] transition-colors"
        >
          View schedule &rarr;
        </a>
      </section>
    );
  }

  // Render every part of the date in studio time so users on other tz still see ET.
  const day = formatStudioDate(next.class_starts_at, 'EEE');
  const dayNum = formatStudioDate(next.class_starts_at, 'd');
  const month = formatStudioDate(next.class_starts_at, 'MMM');
  const time = formatStudioTime(next.class_starts_at);

  return (
    <section className="rounded-2xl bg-[#2d2d2d] text-white p-5 sm:p-6 relative overflow-hidden">
      <div className="absolute -bottom-8 -right-6 w-32 h-32 rounded-full bg-[#c9a96e]/20 blur-2xl pointer-events-none" />
      <div className="relative flex items-stretch gap-4">
        {/* Date stamp */}
        <div className="flex-shrink-0 w-16 sm:w-20 rounded-xl bg-[#c9a96e] text-[#1a1a1a] flex flex-col items-center justify-center text-center py-2">
          <p className="text-[10px] uppercase tracking-wider font-bold leading-none">{day}</p>
          <p className="text-2xl sm:text-3xl font-bold leading-none mt-1">{dayNum}</p>
          <p className="text-[10px] uppercase tracking-wider font-bold leading-none mt-0.5">{month}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">My Next Class</p>
          <p className="font-semibold text-lg sm:text-xl truncate">{next.class_title}</p>
          <p className="text-sm text-white/80 mt-0.5">
            {time} &middot; {next.class_duration_minutes} min
          </p>
          <p className="text-xs text-white/60 mt-1">295 Montauk Hwy, Speonk</p>
        </div>
      </div>
    </section>
  );
}
