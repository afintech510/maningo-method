'use client';

import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/feedback/Skeleton';
import { cn } from '@/lib/utils';
import { formatCents } from '@/lib/pricing';
import { formatStudioDateTime, formatStudioDate } from '@/lib/timezone';

interface ClassInfo {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  status: string;
}

interface Booking {
  id: string;
  status: string;
  payment_type: string;
  amount_paid_cents: number | null;
  created_at: string;
  cancelled_at: string | null;
  classes: ClassInfo | null;
}

interface CreditPurchase {
  id: string;
  pack_type: string;
  credits_added: number;
  amount_paid_cents: number;
  created_at: string;
}

interface ManualPayment {
  id: string;
  pack_type: string;
  credits: number;
  amount_cents: number;
  payment_method: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  notes: string | null;
}

interface CreditAdjustment {
  id: string;
  delta: number;
  balance_after: number;
  reason: string;
  source: string;
  related_id: string | null;
  created_at: string;
}

interface GiftPurchased {
  id: string;
  code: string;
  recipient_name: string | null;
  recipient_email: string | null;
  pack_type: string;
  credits: number;
  amount_cents: number;
  status: string;
  redeemed_at: string | null;
  created_at: string;
}

interface GiftRedeemed {
  id: string;
  code: string;
  pack_type: string;
  credits: number;
  amount_cents: number;
  redeemed_at: string | null;
}

interface ReferralMade {
  profile: { id: string; full_name: string | null; email: string | null; created_at: string };
  reward: { id: string; credits_rewarded: number; created_at: string } | null;
}

interface HistoryPayload {
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    created_at: string;
    credits: number;
    gift_balance_cents: number;
    waiver_signed_at: string | null;
    referral_code: string | null;
    referred_by: string | null;
  };
  referrer: { id: string; full_name: string | null; email: string | null } | null;
  stats: {
    attended: number;
    upcoming: number;
    cancelled_bookings: number;
    stripe_spend_cents: number;
    manual_spend_cents: number;
    gift_spend_cents: number;
    total_spend_cents: number;
  };
  bookings: Booking[];
  credit_purchases: CreditPurchase[];
  manual_payments: ManualPayment[];
  credit_adjustments: CreditAdjustment[];
  gifts_purchased: GiftPurchased[];
  gifts_redeemed: GiftRedeemed[];
  referrals_made: ReferralMade[];
}

type Tab = 'overview' | 'bookings' | 'purchases' | 'credits' | 'referrals';

interface Props {
  memberId: string;
  onClose: () => void;
}

const SOURCE_LABEL: Record<string, string> = {
  admin_manual: 'Admin adjustment',
  manual_payment: 'Manual payment',
  stripe_purchase: 'Stripe purchase',
  booking_create: 'Booked class',
  booking_cancel: 'Cancelled booking',
  referral_reward: 'Referral reward',
  gift_redeem: 'Gift redemption',
};

export function MemberHistoryModal({ memberId, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<HistoryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/students/${memberId}/history`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || 'Could not load history.');
        setData(json);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [memberId]);

  const profile = data?.profile;
  const firstName = (profile?.full_name || '').split(' ')[0] || 'this member';

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        'fixed inset-0 z-50 m-0 p-0 bg-transparent',
        'backdrop:bg-black/50',
        'w-full max-w-full rounded-t-2xl',
        'bottom-0 top-auto',
        'lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2',
        'lg:max-w-4xl lg:w-full lg:rounded-xl lg:bottom-auto',
      )}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="bg-white rounded-t-2xl lg:rounded-xl safe-bottom flex flex-col max-h-[90vh]">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2 mb-1 lg:hidden" />
        <header className="px-5 py-4 border-b border-[#e5e2dc] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#c9a96e] font-medium">Member history</p>
            <h2 className="text-xl font-bold truncate">
              {loading ? 'Loading…' : profile?.full_name || '(no name)'}
            </h2>
            {profile && (
              <p className="text-xs text-muted-foreground truncate">
                {profile.email}
                {profile.phone ? ` · ${profile.phone}` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-2xl text-[#6b6b6b] hover:text-[#2d2d2d] min-w-[44px] min-h-[44px] -m-2"
          >
            ×
          </button>
        </header>

        {!loading && data && (
          <nav className="px-5 border-b border-[#e5e2dc] overflow-x-auto">
            <div className="flex gap-1">
              <TabButton current={tab} value="overview" onClick={setTab}>
                Overview
              </TabButton>
              <TabButton current={tab} value="bookings" onClick={setTab}>
                Bookings ({data.bookings.length})
              </TabButton>
              <TabButton current={tab} value="purchases" onClick={setTab}>
                Purchases ({data.credit_purchases.length + data.manual_payments.length + data.gifts_purchased.length})
              </TabButton>
              <TabButton current={tab} value="credits" onClick={setTab}>
                Credit ledger ({data.credit_adjustments.length})
              </TabButton>
              <TabButton current={tab} value="referrals" onClick={setTab}>
                Referrals ({data.referrals_made.length})
              </TabButton>
            </div>
          </nav>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && <Skeleton variant="card" />}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
          {!loading && !error && data && (
            <>
              {tab === 'overview' && <Overview data={data} firstName={firstName} />}
              {tab === 'bookings' && <BookingsList bookings={data.bookings} />}
              {tab === 'purchases' && <PurchasesList data={data} />}
              {tab === 'credits' && <CreditLedger items={data.credit_adjustments} />}
              {tab === 'referrals' && <ReferralsList data={data} />}
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

function TabButton({
  current,
  value,
  onClick,
  children,
}: {
  current: Tab;
  value: Tab;
  onClick: (t: Tab) => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`whitespace-nowrap text-sm font-medium px-3 py-3 border-b-2 -mb-px transition-colors ${
        active ? 'border-[#c9a96e] text-[#1a1a1a]' : 'border-transparent text-[#6b6b6b] hover:text-[#1a1a1a]'
      }`}
    >
      {children}
    </button>
  );
}

function Overview({ data, firstName }: { data: HistoryPayload; firstName: string }) {
  const p = data.profile;
  const s = data.stats;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Credits" value={p.credits} />
        <Tile label="Classes attended" value={s.attended} />
        <Tile label="Upcoming" value={s.upcoming} />
        <Tile label="Lifetime spend" value={formatCents(s.total_spend_cents)} />
      </div>

      <Card title="Account">
        <Row label="Joined" value={formatStudioDate(p.created_at, 'MMM d, yyyy')} />
        <Row
          label="Waiver"
          value={
            p.waiver_signed_at
              ? `Signed ${formatStudioDate(p.waiver_signed_at, 'MMM d, yyyy')}`
              : 'Not signed'
          }
        />
        <Row
          label="Gift balance"
          value={p.gift_balance_cents > 0 ? formatCents(p.gift_balance_cents) : '—'}
        />
        <Row label="Referral code" value={p.referral_code || '—'} />
        <Row
          label="Referred by"
          value={data.referrer ? data.referrer.full_name || data.referrer.email || '—' : '—'}
        />
        <Row
          label="Referrals made"
          value={
            data.referrals_made.length === 0
              ? '0'
              : `${data.referrals_made.length} (${data.referrals_made.filter((r) => r.reward).length} earned credit)`
          }
        />
        <Row label="Cancelled bookings" value={String(s.cancelled_bookings)} />
      </Card>

      <Card title="Spend breakdown">
        <Row label="Stripe purchases" value={formatCents(s.stripe_spend_cents)} />
        <Row label="Manual (cash / Venmo / Zelle)" value={formatCents(s.manual_spend_cents)} />
        <Row label="Gifts they bought" value={formatCents(s.gift_spend_cents)} />
        <Row label="Total" value={formatCents(s.total_spend_cents)} bold />
      </Card>

      {data.bookings.length === 0 && data.credit_purchases.length === 0 && data.manual_payments.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No activity for {firstName} yet.
        </p>
      )}
    </div>
  );
}

function BookingsList({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground">No bookings yet.</p>;
  }
  const now = Date.now();
  return (
    <div className="space-y-2">
      {bookings.map((b) => {
        const startTs = b.classes ? new Date(b.classes.starts_at).getTime() : null;
        const tense =
          b.status === 'cancelled'
            ? 'Cancelled'
            : startTs !== null && startTs < now
              ? 'Attended'
              : 'Upcoming';
        const tone =
          tense === 'Attended'
            ? 'bg-emerald-50 text-emerald-700'
            : tense === 'Cancelled'
              ? 'bg-slate-100 text-slate-600'
              : 'bg-amber-50 text-amber-800';
        return (
          <div key={b.id} className="rounded-xl border border-[#e5e2dc] bg-white p-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium truncate">{b.classes?.title || '(class missing)'}</p>
              <p className="text-xs text-muted-foreground">
                {b.classes ? formatStudioDateTime(b.classes.starts_at) : ''} · paid via {b.payment_type}
              </p>
              {b.cancelled_at && (
                <p className="text-xs text-muted-foreground">
                  Cancelled {formatStudioDate(b.cancelled_at, 'MMM d, yyyy')}
                </p>
              )}
            </div>
            <span className={`shrink-0 text-[11px] font-medium px-2 py-1 rounded-full ${tone}`}>
              {tense}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PurchasesList({ data }: { data: HistoryPayload }) {
  const empty =
    data.credit_purchases.length === 0 &&
    data.manual_payments.length === 0 &&
    data.gifts_purchased.length === 0 &&
    data.gifts_redeemed.length === 0;
  if (empty) return <p className="text-sm text-muted-foreground">No purchases yet.</p>;

  return (
    <div className="space-y-5">
      {data.credit_purchases.length > 0 && (
        <Card title="Stripe purchases">
          {data.credit_purchases.map((p) => (
            <Row
              key={p.id}
              label={`${formatStudioDate(p.created_at, 'MMM d, yyyy')} · ${p.pack_type}`}
              value={`+${p.credits_added} credits · ${formatCents(p.amount_paid_cents)}`}
            />
          ))}
        </Card>
      )}
      {data.manual_payments.length > 0 && (
        <Card title="Manual payments (cash / Venmo / Zelle)">
          {data.manual_payments.map((p) => (
            <Row
              key={p.id}
              label={`${formatStudioDate(p.created_at, 'MMM d, yyyy')} · ${p.pack_type} · ${p.payment_method}`}
              value={`${p.status === 'paid' ? 'Paid' : p.status === 'cancelled' ? 'Cancelled' : 'Pending'} · ${formatCents(p.amount_cents)} · +${p.credits} credits`}
            />
          ))}
        </Card>
      )}
      {data.gifts_purchased.length > 0 && (
        <Card title="Gifts they bought">
          {data.gifts_purchased.map((g) => (
            <Row
              key={g.id}
              label={`${formatStudioDate(g.created_at, 'MMM d, yyyy')} · ${g.recipient_name || g.recipient_email || 'unspecified'} · ${g.pack_type}`}
              value={`${g.status} · ${formatCents(g.amount_cents)} · code ${g.code}`}
            />
          ))}
        </Card>
      )}
      {data.gifts_redeemed.length > 0 && (
        <Card title="Gifts they redeemed">
          {data.gifts_redeemed.map((g) => (
            <Row
              key={g.id}
              label={`${g.redeemed_at ? formatStudioDate(g.redeemed_at, 'MMM d, yyyy') : '—'} · ${g.pack_type}`}
              value={`${formatCents(g.amount_cents)} · +${g.credits} credits · ${g.code}`}
            />
          ))}
        </Card>
      )}
    </div>
  );
}

function CreditLedger({ items }: { items: CreditAdjustment[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No credit movements yet.</p>;
  }
  return (
    <div className="rounded-xl border border-[#e5e2dc] bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-[#faf9f6] text-[11px] uppercase tracking-wider text-[#6b6b6b]">
          <tr>
            <th className="px-3 py-2 text-left font-medium">When</th>
            <th className="px-3 py-2 text-left font-medium">Source</th>
            <th className="px-3 py-2 text-left font-medium">Reason</th>
            <th className="px-3 py-2 text-right font-medium">Δ</th>
            <th className="px-3 py-2 text-right font-medium">Balance</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id} className="border-t border-[#f3f1ed]">
              <td className="px-3 py-2 text-xs text-[#6b6b6b] whitespace-nowrap">
                {formatStudioDate(a.created_at, 'MMM d')} {formatStudioDate(a.created_at, 'h:mma').toLowerCase()}
              </td>
              <td className="px-3 py-2 text-xs">{SOURCE_LABEL[a.source] || a.source}</td>
              <td className="px-3 py-2 text-xs">{a.reason}</td>
              <td className={`px-3 py-2 text-right tabular-nums font-medium ${a.delta > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {a.delta > 0 ? `+${a.delta}` : a.delta}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{a.balance_after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReferralsList({ data }: { data: HistoryPayload }) {
  const { referrals_made, referrer } = data;
  return (
    <div className="space-y-5">
      <Card title="Who referred this member">
        {referrer ? (
          <Row label={referrer.full_name || referrer.email || '(no name)'} value={referrer.email || ''} />
        ) : (
          <p className="text-sm text-muted-foreground">Joined without a referral code.</p>
        )}
      </Card>

      <Card title={`Referrals made (${referrals_made.length})`}>
        {referrals_made.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            None yet. Share their referral code:{' '}
            {data.profile.referral_code ? <code className="font-mono">{data.profile.referral_code}</code> : '—'}
          </p>
        ) : (
          referrals_made.map((r) => (
            <div key={r.profile.id} className="flex items-start justify-between gap-3 py-2 border-b border-[#f3f1ed] last:border-b-0">
              <div className="min-w-0">
                <p className="font-medium truncate">{r.profile.full_name || '(no name)'}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {r.profile.email} · joined {formatStudioDate(r.profile.created_at, 'MMM d, yyyy')}
                </p>
              </div>
              {r.reward ? (
                <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 whitespace-nowrap">
                  +{r.reward.credits_rewarded} credit · {formatStudioDate(r.reward.created_at, 'MMM d')}
                </span>
              ) : (
                <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-800 whitespace-nowrap">
                  Pending first pack
                </span>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e5e2dc] bg-white p-4">
      <p className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium mb-2">{title}</p>
      <div>{children}</div>
    </div>
  );
}

function Row({ label, value, bold = false }: { label: string; value: string | number; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-1 border-b border-[#f3f1ed] last:border-b-0">
      <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">{label}</span>
      <span className={`text-sm text-right ${bold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#e5e2dc] bg-white p-3">
      <p className="text-[10px] uppercase tracking-wider text-[#6b6b6b] font-medium">{label}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
    </div>
  );
}
