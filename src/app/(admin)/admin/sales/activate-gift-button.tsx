'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ActivateGiftButton({ giftId }: { giftId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activate() {
    if (!confirm('Mark this gift as paid and activate the code? Recipient (if email-delivery) will be notified.')) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/gift-packs/${giftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error?.message || 'Could not activate.');
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={activate}
        disabled={busy}
        className="inline-flex items-center justify-center h-9 px-4 rounded-full bg-[#c9a96e] text-white text-xs font-medium hover:bg-[#b8955d] disabled:opacity-50"
      >
        {busy ? 'Activating…' : 'Mark paid · Activate'}
      </button>
      {error && <p className="text-[10px] text-red-600 max-w-[200px] text-right">{error}</p>}
    </div>
  );
}
