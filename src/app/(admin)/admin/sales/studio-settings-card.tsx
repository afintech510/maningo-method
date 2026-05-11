'use client';

import { useEffect, useState } from 'react';

export function StudioSettingsCard() {
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.settings?.booking_horizon_days === 'number') {
          setDays(d.settings.booking_horizon_days);
        }
      })
      .finally(() => setLoading(false));
  }, []);

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
