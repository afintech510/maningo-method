import { createAdminClient } from '@/lib/supabase/admin';
import { getAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UpcomingBookings } from '@/components/dashboard/UpcomingBookings';
import { ClassHistory } from '@/components/dashboard/ClassHistory';
import { CreditBalance } from '@/components/dashboard/CreditBalance';
import { BuyPacks } from '@/components/dashboard/BuyPacks';
import { ReferralCard } from '@/components/dashboard/ReferralCard';
import { HostHamptonPromo } from '@/components/dashboard/HostHamptonPromo';
import { WeeklySchedule } from '@/components/dashboard/WeeklySchedule';
import { ToastProvider } from '@/components/feedback/Toast';
import { Card } from '@/components/ui/Card';

export default async function DashboardPage() {
  const auth = await getAuth();
  if (!auth) redirect('/login');
  if (auth.user.role === 'admin') redirect('/admin');

  const supabase = createAdminClient();

  // Fetch profile with credits and referral code
  const { data: profile } = await supabase
    .from('profiles')
    .select('credits, referral_code')
    .eq('id', auth.user.id)
    .single();

  const credits = profile?.credits || 0;

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

  const upcoming = allBookings.filter((b) => b.is_upcoming);
  const history = allBookings.filter((b) => b.is_past || b.status === 'cancelled');

  // Fetch credit purchases
  const { data: purchases } = await supabase
    .from('credit_purchases')
    .select('*')
    .eq('student_id', auth.user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-2">Hi, {(auth.user.full_name || '').split(' ')[0] || 'there'}!</h1>
      <p className="text-muted-foreground text-sm mb-6">{auth.user.email}</p>

      <ToastProvider>
        {/* Credits Balance */}
        <CreditBalance credits={credits} />

        {/* Upcoming Classes — first so user sees their bookings immediately */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">My Upcoming Classes</h2>
          <UpcomingBookings bookings={upcoming} />
        </div>

        {/* Add Credits */}
        <div className="mt-8">
          <BuyPacks />
        </div>

        {/* Referral */}
        <div className="mt-6">
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
            hasCredits={credits > 0}
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
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full h-11 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Log Out
            </button>
          </form>
        </div>
      </ToastProvider>
    </div>
  );
}
