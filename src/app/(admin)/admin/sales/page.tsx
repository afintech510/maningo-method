import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/Card';
import { formatCents } from '@/lib/pricing';

export default async function AdminSalesPage() {
  const supabase = createAdminClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { data: stripeAll },
    { data: stripeMonth },
    { data: manualAll },
    { data: manualMonth },
    { data: pendingMP },
    { data: members },
    { data: bookingsMonth },
  ] = await Promise.all([
    supabase.from('credit_purchases').select('amount_paid_cents'),
    supabase.from('credit_purchases').select('amount_paid_cents').gte('created_at', monthStart),
    supabase.from('manual_payments').select('amount_cents').eq('status', 'paid'),
    supabase
      .from('manual_payments')
      .select('amount_cents')
      .eq('status', 'paid')
      .gte('paid_at', monthStart),
    supabase
      .from('manual_payments')
      .select(
        'id, student_id, pack_type, credits, amount_cents, payment_method, status, created_at, profiles:student_id (full_name, email, phone)'
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('created_at', monthStart),
  ]);

  const stripeAllTotal = (stripeAll || []).reduce((s, r) => s + (r.amount_paid_cents || 0), 0);
  const stripeMonthTotal = (stripeMonth || []).reduce((s, r) => s + (r.amount_paid_cents || 0), 0);
  const manualAllTotal = (manualAll || []).reduce((s, r) => s + (r.amount_cents || 0), 0);
  const manualMonthTotal = (manualMonth || []).reduce((s, r) => s + (r.amount_cents || 0), 0);

  const revenueAll = stripeAllTotal + manualAllTotal;
  const revenueMonth = stripeMonthTotal + manualMonthTotal;

  const memberCount = (members as { count?: number } | null)?.count ?? 0;
  const bookingsThisMonth = (bookingsMonth as { count?: number } | null)?.count ?? 0;
  const pending = pendingMP || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">Sales</p>
        <h1 className="text-2xl sm:text-3xl font-bold">Manager Dashboard</h1>
      </div>

      {/* Stats grid */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6b6b6b] mb-3">Stats</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Revenue (this month)" value={formatCents(revenueMonth)} accent />
          <Stat label="Revenue (all time)" value={formatCents(revenueAll)} />
          <Stat label="Bookings (this month)" value={String(bookingsThisMonth)} />
          <Stat label="Active members" value={String(memberCount)} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          <Stat label="Card revenue (all time)" value={formatCents(stripeAllTotal)} muted />
          <Stat label="Cash/Zelle/Venmo (all time)" value={formatCents(manualAllTotal)} muted />
          <Stat label="Pending manual payments" value={String(pending.length)} muted />
        </div>
      </section>

      {/* Reconcile */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6b6b6b]">
            Reconcile &mdash; Manual Payments
          </h2>
          <Link href="/admin/manual-payments" className="text-xs text-[#c9a96e] hover:underline">
            See all &rarr;
          </Link>
        </div>

        {pending.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">No pending manual payments. You&rsquo;re all caught up.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {pending.slice(0, 6).map((p) => {
              const profile = (p as unknown as { profiles?: { full_name: string; email: string; phone: string } }).profiles;
              return (
                <Card key={p.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{profile?.full_name || 'Unknown'}</p>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#c9a96e]/15 text-[#8c7647] font-semibold">
                          {p.payment_method}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground break-all">{profile?.email}</p>
                      <p className="text-sm mt-1">
                        <strong>{formatCents(p.amount_cents)}</strong> for {p.credits}{' '}
                        credit{p.credits === 1 ? '' : 's'} ({p.pack_type})
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Submitted {new Date(p.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Link
                      href="/admin/manual-payments"
                      className="inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#c9a96e] text-white text-xs font-medium hover:bg-[#b8955d]"
                    >
                      Review
                    </Link>
                  </div>
                </Card>
              );
            })}
            {pending.length > 6 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{pending.length - 6} more &mdash;{' '}
                <Link href="/admin/manual-payments" className="text-[#c9a96e] hover:underline">
                  see all
                </Link>
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, accent, muted }: { label: string; value: string; accent?: boolean; muted?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent
          ? 'border-[#c9a96e]/40 bg-[#c9a96e]/5'
          : muted
            ? 'border-[#e5e2dc] bg-[#faf9f6]'
            : 'border-[#e5e2dc] bg-white'
      }`}
    >
      <p className="text-[11px] uppercase tracking-wider text-[#6b6b6b] mb-1">{label}</p>
      <p className="text-xl sm:text-2xl font-bold leading-none">{value}</p>
    </div>
  );
}
