'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Button } from '@/components/ui/Button';
import { formatCents } from '@/lib/pricing';

interface RentPayment {
  id: string;
  rent_month_id: string;
  amount_cents: number;
  paid_on: string;
  recorded_at: string;
  recorded_by: string | null;
  notes: string | null;
}

interface RentMonth {
  id: string;
  year: number;
  month: number;
  weekday_hours: number;
  weekend_hours: number;
  weekday_rate_cents: number;
  weekend_rate_cents: number;
  total_cents: number;
  locked_at: string;
  locked_by: string | null;
  notes: string | null;
  payments: RentPayment[];
  paid_cents: number;
  paid_in_full: boolean;
}

interface Preview {
  year: number;
  month: number;
  weekday_hours: number;
  weekend_hours: number;
  class_count: number;
  total_cents: number;
}

interface RentFeed {
  locked: RentMonth[];
  preview: Preview;
  rates: { weekday_cents: number; weekend_cents: number };
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function RentLedger({ isSuperadmin }: { isSuperadmin: boolean }) {
  const [feed, setFeed] = useState<RentFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<RentMonth | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/rent');
    if (!res.ok) {
      setError('Could not load rent ledger.');
      setLoading(false);
      return;
    }
    const data = await res.json();
    setFeed(data);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function handleLock() {
    if (!feed) return;
    const { year, month, total_cents } = feed.preview;
    if (
      !window.confirm(
        `Lock ${MONTH_NAMES[month]} ${year} at ${formatCents(total_cents)}? Cancellations after this won't refund.`,
      )
    )
      return;
    setBusy('lock');
    setError(null);
    const res = await fetch('/api/admin/rent/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month }),
    });
    setBusy(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b?.error?.message || 'Could not lock month.');
      return;
    }
    await load();
  }

  async function handleDeletePayment(paymentId: string) {
    if (!window.confirm('Remove this payment record?')) return;
    setBusy(paymentId);
    const res = await fetch(`/api/admin/rent/payments/${paymentId}`, { method: 'DELETE' });
    setBusy(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b?.error?.message || 'Could not delete payment.');
      return;
    }
    await load();
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Host Hampton rent</h1>
        <Skeleton variant="card" />
      </div>
    );
  }
  if (!feed) {
    return <div className="max-w-6xl mx-auto px-4 py-6">No data.</div>;
  }

  const previewLabel = `${MONTH_NAMES[feed.preview.month]} ${feed.preview.year}`;
  // 'Owed this month' surfaces the most recently locked OR the current preview total.
  const owedThisMonth = feed.locked[0]?.total_cents ?? feed.preview.total_cents;
  const hoursThisMonth =
    (feed.locked[0]?.weekday_hours ?? feed.preview.weekday_hours) +
    (feed.locked[0]?.weekend_hours ?? feed.preview.weekend_hours);
  const lifetimeRent = feed.locked.reduce((s, m) => s + m.total_cents, 0);
  const totalLockedClasses = feed.locked.reduce(
    (s, m) => s + m.weekday_hours + m.weekend_hours,
    0,
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">Studio</p>
        <h1 className="text-2xl sm:text-3xl font-bold">Host Hampton rent</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Each scheduled class is 1 studio hour.{' '}
          <strong className="text-foreground">Weekday {formatCents(feed.rates.weekday_cents)}/hr</strong>{' '}
          &middot;{' '}
          <strong className="text-foreground">Weekend {formatCents(feed.rates.weekend_cents)}/hr</strong>.
        </p>
      </div>

      {/* Lease terms */}
      <div className="rounded-2xl border border-[#e5e2dc] bg-[#faf9f6] p-4 mb-6 text-xs text-muted-foreground">
        <p className="font-semibold uppercase tracking-wider text-[10px] text-[#1a1a1a] mb-1.5">
          Lease terms
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>The next month&rsquo;s schedule locks on the 25th of the prior month.</li>
          <li>
            Cancelled classes are <strong>not refunded</strong> after lock-in. Rescheduling within
            the locked month is free.
          </li>
          <li>
            Classes added after lock-in roll into the <strong>next month&rsquo;s</strong> bill at
            the standard rate.
          </li>
          <li>Payment is due by the 5th of the month.</li>
        </ul>
      </div>

      {/* Stat grid */}
      <section className="mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Owed this month" value={formatCents(owedThisMonth)} accent />
          <Stat label="Hours this month" value={`${hoursThisMonth}h`} />
          <Stat label="Owed (all locked time)" value={formatCents(lifetimeRent)} />
          <Stat label="Total locked hours" value={String(totalLockedClasses)} />
        </div>
      </section>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Preview / Lock card */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6b6b6b] mb-3">
          Next month — live preview
        </h2>
        <Card className="border-[#c9a96e]/40 bg-[#c9a96e]/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#c9a96e] font-bold">
                Preview · {previewLabel}
              </p>
              <p className="font-semibold mt-1">{formatCents(feed.preview.total_cents)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {feed.preview.weekday_hours}h weekday &middot; {feed.preview.weekend_hours}h weekend
                &middot; {feed.preview.class_count} classes
              </p>
            </div>
            {isSuperadmin && (
              <Button onClick={handleLock} loading={busy === 'lock'}>
                Lock {MONTH_NAMES[feed.preview.month]}
              </Button>
            )}
          </div>
        </Card>
      </section>

      {/* Locked months */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6b6b6b] mb-3">
          Locked months
        </h2>
        {feed.locked.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">
              No locked months yet.{' '}
              {isSuperadmin
                ? 'Click the Lock button above to snapshot the next month.'
                : "Once Adam locks a month, it'll show up here."}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {feed.locked.map((m) => (
              <Card key={m.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">
                        {MONTH_NAMES[m.month]} {m.year}
                      </p>
                      {m.paid_in_full ? (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700">
                          Paid
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800">
                          Unpaid
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1">
                      <strong>{formatCents(m.total_cents)}</strong>
                      {m.paid_cents > 0 && m.paid_cents < m.total_cents && (
                        <span className="text-muted-foreground"> ({formatCents(m.paid_cents)} paid)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.weekday_hours}h weekday &middot; {m.weekend_hours}h weekend &middot; locked{' '}
                      {new Date(m.locked_at).toLocaleDateString()}
                    </p>
                    {m.payments.length > 0 && (
                      <ul className="mt-2 text-xs space-y-0.5">
                        {m.payments.map((p) => (
                          <li key={p.id} className="flex items-center gap-2">
                            <span className="text-emerald-700">
                              ✓ {formatCents(p.amount_cents)} on {p.paid_on}
                            </span>
                            {p.notes && (
                              <span className="text-muted-foreground">&mdash; {p.notes}</span>
                            )}
                            {isSuperadmin && (
                              <button
                                type="button"
                                onClick={() => handleDeletePayment(p.id)}
                                disabled={busy === p.id}
                                className="text-[10px] text-red-600 hover:underline disabled:opacity-50"
                              >
                                remove
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {isSuperadmin && !m.paid_in_full && (
                    <Button size="sm" variant="ghost" onClick={() => setPayTarget(m)}>
                      Mark paid
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {payTarget && (
        <MarkPaidModal
          month={payTarget}
          onClose={() => setPayTarget(null)}
          onSaved={async () => {
            setPayTarget(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent ? 'border-[#c9a96e]/40 bg-[#c9a96e]/5' : 'border-[#e5e2dc] bg-white'
      }`}
    >
      <p className="text-[11px] uppercase tracking-wider text-[#6b6b6b] mb-1">{label}</p>
      <p className="text-xl sm:text-2xl font-bold leading-none">{value}</p>
    </div>
  );
}

function MarkPaidModal({
  month,
  onClose,
  onSaved,
}: {
  month: RentMonth;
  onClose: () => void;
  onSaved: () => void;
}) {
  const outstanding = Math.max(0, (month.total_cents || 0) - (month.paid_cents || 0));
  const [amount, setAmount] = useState((outstanding / 100).toFixed(2));
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(amt) || amt < 0) {
      setError('Enter a valid amount.');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/admin/rent/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rent_month_id: month.id,
        amount_cents: amt,
        paid_on: paidOn,
        notes: notes.trim() || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b?.error?.message || 'Could not save.');
      return;
    }
    onSaved();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-[#e5e2dc] p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Record payment</p>
            <p className="font-semibold">
              {MONTH_NAMES[month.month]} {month.year} &middot; {formatCents(month.total_cents)} total
            </p>
            {month.paid_cents > 0 && (
              <p className="text-xs text-muted-foreground">
                Already paid: {formatCents(month.paid_cents)} &middot; outstanding: {formatCents(outstanding)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-w-[44px] min-h-[44px] text-2xl text-[#6b6b6b]"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">
              Amount ($)
            </span>
            <input
              type="number"
              step="0.01"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="mt-1 w-full h-11 rounded-lg border border-[#e5e2dc] bg-white px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">
              Paid on
            </span>
            <input
              type="date"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              required
              className="mt-1 w-full h-11 rounded-lg border border-[#e5e2dc] bg-white px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">
              Notes (optional)
            </span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder="e.g. Venmo from Chelsea"
              className="mt-1 w-full h-11 rounded-lg border border-[#e5e2dc] bg-white px-3 text-sm"
            />
          </label>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              Save payment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
