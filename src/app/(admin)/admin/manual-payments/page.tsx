'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';

type Status = 'pending' | 'paid' | 'cancelled' | 'active' | 'redeemed';

interface BaseRow {
  id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  amount_cents: number;
  payment_method: string;
  status: Status;
  created_at: string;
  completed_at: string | null;
  pack_type: string;
  credits: number;
}

interface PackRow extends BaseRow {
  kind: 'pack';
  provisional_credits_applied?: number;
}

interface GiftRow extends BaseRow {
  kind: 'gift';
  code: string;
  recipient_name: string | null;
  recipient_email: string | null;
  delivery_mode: 'email' | 'share';
}

type Row = PackRow | GiftRow;

const PACK_LABEL: Record<string, string> = {
  single: 'Drop-In',
  '5pack': '5-Pack',
  '10pack': '10-Pack',
  custom: 'Custom Gift',
};

const STATUS_VARIANT: Record<string, 'warning' | 'success' | 'neutral'> = {
  pending: 'warning',
  paid: 'success',
  active: 'success',
  redeemed: 'neutral',
  cancelled: 'neutral',
};

export default function AdminManualPaymentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/pending-payments');
    const data = await res.json();
    setRows(data.payments || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function actPack(id: string, action: 'mark_paid' | 'cancel') {
    if (action === 'cancel' && !confirm('Cancel this pending pack payment?')) return;
    if (
      action === 'mark_paid' &&
      !confirm('Confirm payment received and add credits to the student?')
    ) return;
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/manual-payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error?.message || 'Could not update.');
    }
    setBusyId(null);
    await load();
  }

  async function actGift(id: string, status: 'active' | 'cancelled') {
    if (status === 'cancelled' && !confirm('Cancel this pending gift code?')) return;
    if (
      status === 'active' &&
      !confirm('Activate this gift code? Recipient (if email delivery) will be notified.')
    ) return;
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/gift-packs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body?.error?.message || 'Could not update.');
    }
    setBusyId(null);
    await load();
  }

  if (loading) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Manual Payments</h1>
        <Skeleton variant="card" />
      </div>
    );
  }

  const pending = rows.filter((r) => r.status === 'pending');
  const history = rows.filter((r) => r.status !== 'pending');

  return (
    <div className="px-4 py-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Manual Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cash and Venmo for both class packs and gift cards. Pack buyers get 1 provisional
          credit at submission so they can attend a class while settling up; the remainder lands
          when you mark paid. Cancelling claws the provisional credit back if it&rsquo;s still
          on their balance. Gift codes stay inactive until you activate them here.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <EmptyState title="Nothing pending" />
        ) : (
          <div className="space-y-2">
            {pending.map((r) => (
              <Row
                key={`${r.kind}-${r.id}`}
                row={r}
                busy={busyId === r.id}
                onActPack={actPack}
                onActGift={actGift}
              />
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">History</h2>
          <div className="space-y-2">
            {history.map((r) => (
              <Row
                key={`${r.kind}-${r.id}`}
                row={r}
                busy={false}
                onActPack={actPack}
                onActGift={actGift}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({
  row,
  busy,
  onActPack,
  onActGift,
}: {
  row: Row;
  busy: boolean;
  onActPack: (id: string, action: 'mark_paid' | 'cancel') => void;
  onActGift: (id: string, status: 'active' | 'cancelled') => void;
}) {
  const amount = `$${(row.amount_cents / 100).toFixed(2)}`;
  const packLabel = PACK_LABEL[row.pack_type] || row.pack_type;
  const isPending = row.status === 'pending';

  return (
    <Card>
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
            <Badge variant={STATUS_VARIANT[row.status] || 'neutral'}>{row.status}</Badge>
            {row.kind === 'pack' && (
              <span className="text-[10px] uppercase tracking-wider text-[#c9a96e]">
                {row.payment_method}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground break-all">
            {row.buyer_email}
            {row.buyer_phone ? ` · ${row.buyer_phone}` : ''}
          </p>
          <p className="text-sm mt-1">
            <strong>{amount}</strong> &middot; {row.credits} credit
            {row.credits === 1 ? '' : 's'} ({packLabel})
          </p>
          {row.kind === 'pack' && row.provisional_credits_applied && row.provisional_credits_applied > 0 && (
            <p className="text-[11px] text-amber-700 mt-1">
              {row.provisional_credits_applied} provisional credit
              {row.provisional_credits_applied === 1 ? '' : 's'} already on their balance &middot;
              {row.status === 'pending' ? ` mark paid will add the remaining ${Math.max(0, row.credits - row.provisional_credits_applied)}` : ''}
            </p>
          )}
          {row.kind === 'gift' && (
            <p className="text-xs text-muted-foreground mt-1">
              Code <span className="font-mono">{row.code}</span>
              {row.delivery_mode === 'email' && row.recipient_email
                ? ` · email to ${row.recipient_name || ''} <${row.recipient_email}>`
                : ' · share-only'}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            Submitted {new Date(row.created_at).toLocaleString()}
            {row.completed_at && ` · Closed ${new Date(row.completed_at).toLocaleString()}`}
          </p>
        </div>

        {isPending && (
          <div className="flex flex-col gap-2 items-stretch">
            {row.kind === 'pack' ? (
              <>
                <Button size="sm" loading={busy} onClick={() => onActPack(row.id, 'mark_paid')}>
                  Mark paid
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onActPack(row.id, 'cancel')}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" loading={busy} onClick={() => onActGift(row.id, 'active')}>
                  Activate
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onActGift(row.id, 'cancelled')}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
