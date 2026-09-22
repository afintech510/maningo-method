'use client';

import { useEffect, useState } from 'react';

export function StudioSettingsCard() {
  const [days, setDays] = useState<number>(30);
  const [purchasesEnabled, setPurchasesEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingPurchases, setTogglingPurchases] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.settings?.booking_horizon_days === 'number') {
          setDays(d.settings.booking_horizon_days);
        }
        if (typeof d?.settings?.purchases_enabled === 'boolean') {
          setPurchasesEnabled(d.settings.purchases_enabled);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function togglePurchases() {
    setError(null);
    setStatus(null);
    const next = !purchasesEnabled;
    setTogglingPurchases(true);
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchases_enabled: next }),
    });
    setTogglingPurchases(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error?.message || 'Could not save.');
      return;
    }
    // Trust the server's echoed value rather than the optimistic one.
    const body = await res.json().catch(() => ({}));
    const saved = body?.settings?.purchases_enabled;
    setPurchasesEnabled(typeof saved === 'boolean' ? saved : next);
    setStatus(next ? 'Purchasing is back on.' : 'Purchasing is off.');
  }

  async function save() {
    setError(null);
    setStatus(null);
    if (!Number.isFinite(days) || days < 1 || days > 365) {
      setError('Booking horizon must be between 1 and 365 days.');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_horizon_days: days }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error?.message || 'Could not save.');
      return;
    }
    setStatus('Saved.');
  }

  return (
    <div className="rounded-2xl border border-[#e5e2dc] bg-white p-4">
      {/* Purchasing kill switch */}
      <div
        className={`rounded-xl border p-3 mb-4 ${
          purchasesEnabled ? 'border-[#e5e2dc] bg-[#faf9f6]' : 'border-red-300 bg-red-50'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold mb-1">
              Selling credits &amp; packs
              <span
                className={`ml-2 align-middle text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  purchasesEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-red-600 text-white'
                }`}
              >
                {purchasesEnabled ? 'On' : 'Off'}
              </span>
            </p>
            <p className="text-xs text-[#6b6b6b]">
              When off, members can&rsquo;t buy class packs, gift cards, promos, or submit cash
              payments &mdash; by card or by cash, on the site or from an old link. Credits members
              already hold still book classes, gift codes already bought still redeem, waitlists
              still work, and you can still grant credits by hand from the admin area.
            </p>
          </div>
          <button
            type="button"
            onClick={togglePurchases}
            disabled={loading || togglingPurchases}
            className={`inline-flex items-center justify-center h-10 px-5 rounded-full text-sm font-medium text-white disabled:opacity-60 ${
              purchasesEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {togglingPurchases
              ? 'Saving…'
              : purchasesEnabled
                ? 'Turn selling off'
                : 'Turn selling back on'}
          </button>
        </div>
      </div>

      <p className="text-sm font-semibold mb-1">Booking lock window</p>
      <p className="text-xs text-[#6b6b6b] mb-3">
        How far ahead members can book a class. Classes beyond this window still appear on the
        schedule but are locked &mdash; the &ldquo;Book&rdquo; button shows the date bookings open.
        Lower it (e.g. 14) to push bookings closer to class day; raise it (e.g. 60, 90) for longer
        lead time.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value, 10) || 0)}
          disabled={loading || saving}
          className="h-10 w-24 rounded-lg border border-[#e5e2dc] bg-white px-3 text-sm"
        />
        <span className="text-sm text-[#6b6b6b]">days out</span>
        <button
          type="button"
          onClick={save}
          disabled={loading || saving}
          className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-[#c9a96e] text-white text-sm font-medium hover:bg-[#b8955d] disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {status && <p className="text-xs text-emerald-700 mt-2">{status}</p>}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
