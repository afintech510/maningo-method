'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Inline reconcile actions for a pending pack-payment or gift row. Dispatches
 * to the existing PATCH endpoints (different shapes per kind):
 *   - pack → /api/admin/manual-payments/[id]  body: { action: 'mark_paid' | 'cancel' }
 *   - gift → /api/admin/gift-packs/[id]       body: { status: 'active' | 'cancelled' }
 */
export function ReconcileActions({ kind, id }: { kind: 'pack' | 'gift'; id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'confirm' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (
      kind === 'pack' &&
      !window.confirm('Mark this manual payment paid and apply credits?')
    )
      return;
    if (
      kind === 'gift' &&
      !window.confirm('Activate this gift code? Recipient (if email delivery) will be notified.')
    )
      return;

    setBusy('confirm');
    setError(null);
    const res = await fetch(
      kind === 'pack'
        ? `/api/admin/manual-payments/${id}`
        : `/api/admin/gift-packs/${id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kind === 'pack' ? { action: 'mark_paid' } : { status: 'active' }),
      }
    );
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error?.message || 'Could not update.');
      return;
    }
    router.refresh();
  }

  async function cancel() {
    if (!window.confirm(`Cancel this pending ${kind === 'pack' ? 'payment' : 'gift code'}?`)) return;
    setBusy('cancel');
    setError(null);
    const res = await fetch(
      kind === 'pack'
        ? `/api/admin/manual-payments/${id}`
        : `/api/admin/gift-packs/${id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kind === 'pack' ? { action: 'cancel' } : { status: 'cancelled' }),
      }
    );
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error?.message || 'Could not cancel.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={confirm}
        disabled={busy !== null}
        className="inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#c9a96e] text-white text-xs font-medium hover:bg-[#b8955d] disabled:opacity-50"
      >
        {busy === 'confirm' ? '…' : kind === 'pack' ? 'Mark paid' : 'Activate'}
      </button>
      <button
        type="button"
        onClick={cancel}
        disabled={busy !== null}
        className="text-[11px] text-[#6b6b6b] hover:text-[#1a1a1a] underline"
      >
        Cancel
      </button>
      {error && <p className="text-[10px] text-red-600 max-w-[180px] text-right">{error}</p>}
    </div>
  );
}
