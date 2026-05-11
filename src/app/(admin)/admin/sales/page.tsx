import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/Card';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { formatCents } from '@/lib/pricing';
import { SendTestEmailsButton } from './send-test-emails-button';
import { StudioSettingsCard } from './studio-settings-card';
import { ReconcileActions } from './reconcile-actions';

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
    { data: recentGiftSales },
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
    supabase
      .from('gift_packs')
      .select(
        'id, pack_type, amount_cents, purchaser_name, purchaser_email, stripe_payment_intent_id, status, created_at, redeemed_at'
      )
      .in('status', ['active', 'redeemed'])
      .order('created_at', { ascending: false })
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
    method: 'card' | 'cash' | 'venmo' | 'zelle' | 'manual' | 'gift';
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
    ...((recentGiftSales || []).map((g) => ({
      id: g.id,
      name: g.purchaser_name || 'Guest',
      email: g.purchaser_email || '',
      // pack_type='custom' shows up as the dollar-balance label downstream
      pack_type: g.pack_type === 'custom' ? 'gift card' : `gift · ${g.pack_type}`,
      amount_cents: g.amount_cents || 0,
      method: 'gift' as const,
      when: g.created_at,
    }))),
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          <Stat label="Card revenue (all time)" value={formatCents(stripeAllTotal)} muted />
          <Stat label="Cash/Venmo (all time)" value={formatCents(manualAllTotal)} muted />
          <Stat label="Pending reconciliations" value={String(pending.length + giftsPending.length)} muted />
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

      {/* Reconcile — Manual Payments (packs + gifts in one list) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6b6b6b]">
            Reconcile &mdash; Manual Payments
          </h2>
          <Link href="/admin/manual-payments" className="text-xs text-[#c9a96e] hover:underline">
            See all &rarr;
          </Link>
        </div>

        {pending.length === 0 && giftsPending.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">
              No pending cash/Venmo payments — packs or gift codes. You&rsquo;re all caught up.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {[
              ...pending.map((p) => {
                const profile = (p as unknown as {
                  profiles?: { full_name: string; email: string; phone: string };
                }).profiles;
                return {
                  kind: 'pack' as const,
                  id: p.id,
                  buyer_name: profile?.full_name || 'Unknown',
                  buyer_email: profile?.email || '',
                  amount_cents: p.amount_cents,
                  credits: p.credits,
                  pack_type: p.pack_type,
                  payment_method: p.payment_method,
                  created_at: p.created_at,
                };
              }),
              ...giftsPending.map((g) => ({
                kind: 'gift' as const,
                id: g.id,
                buyer_name: g.purchaser_name || 'Guest',
                buyer_email: g.purchaser_email || '',
                amount_cents: g.amount_cents,
                credits: g.credits,
                pack_type: g.pack_type,
                code: g.code,
                recipient_name: g.recipient_name,
                recipient_email: g.recipient_email,
                delivery_mode: g.delivery_mode,
                created_at: g.created_at,
              })),
            ]
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )
              .slice(0, 8)
              .map((row) => (
                <Card key={`${row.kind}-${row.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${
                            row.kind === 'gift'
                              ? 'bg-[#c9a96e]/15 text-[#8c7647]'
                              : 'bg-[#2d2d2d]/10 text-[#2d2d2d]'
                          }`}
                        >
                          {row.kind === 'gift' ? 'Gift' : 'Pack'}
                        </span>
                        <p className="font-medium">{row.buyer_name}</p>
                        {row.kind === 'pack' && (
                          <span className="text-[10px] uppercase tracking-wider text-[#c9a96e]">
                            {row.payment_method}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground break-all">{row.buyer_email}</p>
                      <p className="text-sm mt-1">
                        <strong>{formatCents(row.amount_cents)}</strong> &middot; {row.credits}{' '}
                        credit{row.credits === 1 ? '' : 's'} ({row.pack_type})
                      </p>
                      {row.kind === 'gift' && (
                        <p className="text-xs text-[#6b6b6b] mt-1">
                          Code <span className="font-mono">{row.code}</span>
                          {row.delivery_mode === 'email' && row.recipient_email
                            ? ` · email ${row.recipient_name || ''} <${row.recipient_email}>`
                            : ' · share-only'}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        Submitted {new Date(row.created_at).toLocaleString()}
                      </p>
                    </div>
                    <ReconcileActions kind={row.kind} id={row.id} />
                  </div>
                </Card>
              ))}
            {pending.length + giftsPending.length > 8 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{pending.length + giftsPending.length - 8} more &mdash;{' '}
                <Link href="/admin/manual-payments" className="text-[#c9a96e] hover:underline">
                  see all
                </Link>
              </p>
            )}
          </div>
        )}
      </section>

      {/* Studio settings */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6b6b6b] mb-3">Studio Settings</h2>
        <StudioSettingsCard />
      </section>

      {/* Tools */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6b6b6b] mb-3">Tools</h2>
        <SendTestEmailsButton />
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
