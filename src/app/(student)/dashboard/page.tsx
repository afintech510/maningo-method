import { createClient } from '@/lib/supabase/server';
import { getAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UpcomingBookings } from '@/components/dashboard/UpcomingBookings';
import { ToastProvider } from '@/components/feedback/Toast';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

export default async function DashboardPage() {
  const auth = await getAuth();
  if (!auth) redirect('/login');

  const supabase = createClient();

  // Fetch upcoming bookings
  const { data: bookingsData } = await supabase
    .from('bookings')
    .select(`
      id,
      class_id,
      status,
      payment_type,
      created_at,
      classes (
        title,
        starts_at,
        duration_minutes
      )
    `)
    .eq('student_id', auth.user.id)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false });

  const now = new Date();
  const bookings = (bookingsData || [])
    .filter((b) => {
      const cls = b.classes as unknown as { starts_at: string; duration_minutes: number };
      if (!cls) return false;
      const endTime = new Date(new Date(cls.starts_at).getTime() + cls.duration_minutes * 60000);
      return endTime > now;
    })
    .map((b) => {
      const cls = b.classes as unknown as { title: string; starts_at: string; duration_minutes: number };
      return {
        id: b.id,
        class_id: b.class_id,
        class_title: cls?.title || '',
        class_starts_at: cls?.starts_at || '',
        class_duration_minutes: cls?.duration_minutes || 0,
        status: b.status,
        payment_type: b.payment_type,
      };
    });

  // Fetch subscription status
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('student_id', auth.user.id)
    .single();

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">My Classes</h1>

      <ToastProvider>
        <UpcomingBookings bookings={bookings} />
      </ToastProvider>

      {/* Subscription Status */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Subscription</h2>
        <Card>
          {sub?.status === 'active' ? (
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="success">Active</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  Renews {new Date(sub.current_period_end).toLocaleDateString()}
                </p>
              </div>
              <Link
                href="/subscription"
                className="text-sm font-medium text-primary hover:underline"
              >
                Manage
              </Link>
            </div>
          ) : sub?.status === 'past_due' ? (
            <div>
              <Badge variant="warning">Payment Failed</Badge>
              <p className="text-sm text-muted-foreground mt-1">
                Update your payment method to keep booking.
              </p>
              <Link
                href="/subscription"
                className="inline-block mt-2 text-sm font-medium text-primary hover:underline"
              >
                Update Payment
              </Link>
            </div>
          ) : (
            <div>
              <p className="font-medium">Unlimited classes for $95/month</p>
              <p className="text-sm text-muted-foreground mt-1">
                Book as many classes as you want with a monthly subscription.
              </p>
              <Link
                href="/subscription"
                className="inline-flex items-center justify-center h-10 px-6 mt-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                Subscribe Now
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
