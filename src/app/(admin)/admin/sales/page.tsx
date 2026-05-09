import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/Card';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { formatCents } from '@/lib/pricing';
import { ActivateGiftButton } from './activate-gift-button';

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
    { data: pendingGifts },
    { data: members },
    { data: bookingsMonth },
    { data: recentCustomers },
    { data: recentStripeSales },
    { data: recentManualSales },
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
    supabase
      .from('gift_packs')
      .select(
        'id, code, pack_type, credits, amount_cents, delivery_mode, recipient_name, recipient_email, purchaser_name, purchaser_email, created_at'
      )
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('created_at', monthStart),
    supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('credit_purchases')
      .select('id, student_id, pack_type, amount_paid_cents, created_at, profiles:student_id (full_name, email)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('manual_payments')
      .select('id, student_id, pack_type, amount_cents, payment_method, paid_at, profiles:student_id (full_name, email)')
      .eq('status', 'paid')
      .order('paid_at', { ascending: false })
      .limit(5),
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
  const giftsPending = pendingGifts || [];
  const newCustomers = recentCustomers || [];

  type SaleRow = {
    id: string;
    name: string;
    email: string;
    pack_type: string;
    amount_cents: number;
    method: 'card' | 'cash' | 'venmo' | 'zelle' | 'manual';
    when: string;
  };

  const recentSales: SaleRow[] = [
    ...((recentStripeSales || []).map((s) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile = (s as any).profiles;
      return {
        id: s.id,
        name: profile?.full_name || 'Unknown',
        email: profile?.email || '',
        pack_type: s.pack_type,
        amount_cents: s.amount_paid_cents || 0,
        method: 'card' as const,
        when: s.created_at,
      };
    })),
    ...((recentManualSales || []).map((s) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile = (s as any).profiles;
      return {
        id: s.id,
        name: profile?.full_name || 'Unknown',
        email: profile?.email || '',
        pack_type: s.pack_type,
        amount_cents: s.amount_cents || 0,
        method: (s.payment_method || 'manual') as SaleRow['method'],
        when: s.paid_at,
      };
    })),
  ]
    .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
    .slice(0, 5);

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          <Stat label="Card revenue (all time)" value={formatCents(stripeAllTotal)} muted />
          <Stat label="Cash/Venmo (all time)" value={formatCents(manualAllTotal)} muted />
          <Stat label="Pending manual payments" value={String(pending.length)} muted />
          <Stat label="Pending gift codes" value={String(giftsPending.length)} muted />
        </div>
      </section>

      {/* Recent customers + recent sales */}
      <section className="grid lg:grid-cols-2 gap-4 mb-8">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6b6b6b]">
              Recent New Customers
            </h2>
            <Link href="/admin/students" className="text-xs text-[#c9a96e] hover:underline">
              See all &rarr;
            </Link>
          </div>
          {newCustomers.length === 0 ? (
            <Card>
              <p className="text-sm text-muted-foreground">No customers yet.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {newCustomers.map((c) => (
                <Card key={c.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground break-all">{c.email}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6b6b6b] mb-3">
            Recent Sales
          </h2>
          {recentSales.length === 0 ? (
            <Card>
              <p className="text-sm text-muted-foreground">No completed sales yet.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentSales.map((s) => (
                <Card key={`${s.method}-${s.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{s.name}</p>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#c9a96e]/15 text-[#8c7647] font-semibold">
                          {s.method}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground break-all">{s.email}</p>
                      <p className="text-sm mt-1">
                        <strong>{formatCents(s.amount_cents)}</strong>{' '}
                        <span className="text-[#6b6b6b]">({s.pack_type})</span>
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(s.when).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
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

      {/* Reconcile — Pending Gifts */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6b6b6b]">
            Reconcile &mdash; Pending Gift Codes
          </h2>
        </div>

        {giftsPending.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">
              No pending gift codes. They appear here when someone buys a gift via Cash or Venmo.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {giftsPending.map((g) => (
              <Card key={g.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{g.purchaser_name || 'Unknown'}</p>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#c9a96e]/15 text-[#8c7647] font-semibold">
                        Pending
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground break-all">{g.purchaser_email}</p>
                    <p className="text-sm mt-1">
                      <strong>{formatCents(g.amount_cents)}</strong> &middot; {g.credits} credit
                      {g.credits === 1 ? '' : 's'} ({g.pack_type})
                    </p>
                    <p className="text-xs text-[#6b6b6b] mt-1">
                      Code <span className="font-mono">{g.code}</span>
                      {g.delivery_mode === 'email' && g.recipient_email
                        ? ` · email recipient ${g.recipient_name || ''} <${g.recipient_email}>`
                        : ' · share-only'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Created {new Date(g.created_at).toLocaleString()}
                    </p>
                  </div>
                  <ActivateGiftButton giftId={g.id} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Log Out */}
      <div className="mt-10 max-w-sm">
        <LogoutButton />
      </div>
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
