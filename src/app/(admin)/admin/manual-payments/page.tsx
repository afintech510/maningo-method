'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';

interface Payment {
  id: string;
  student_id: string;
  pack_type: string;
  credits: number;
  amount_cents: number;
  payment_method: 'cash' | 'zelle' | 'venmo';
  status: 'pending' | 'paid' | 'cancelled';
  created_at: string;
  paid_at: string | null;
  profiles?: { full_name: string; email: string; phone: string };
}

const STATUS_VARIANT: Record<Payment['status'], 'warning' | 'success' | 'neutral'> = {
  pending: 'warning',
  paid: 'success',
  cancelled: 'neutral',
};

export default function AdminManualPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/manual-payments');
    const data = await res.json();
    setPayments(data.payments || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function act(id: string, action: 'mark_paid' | 'cancel') {
    if (action === 'cancel' && !confirm('Cancel this pending payment?')) return;
    if (action === 'mark_paid' && !confirm('Confirm payment received and add credits to student?')) return;
    setBusyId(id);
    await fetch(`/api/admin/manual-payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
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

  const pending = payments.filter((p) => p.status === 'pending');
  const others = payments.filter((p) => p.status !== 'pending');

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manual Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">Cash, Zelle, and Venmo. Credits apply only after you mark paid.</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <EmptyState title="Nothing pending" />
        ) : (
          <div className="space-y-2">
            {pending.map((p) => <PaymentRow key={p.id} p={p} busy={busyId === p.id} onAct={act} />)}
          </div>
        )}
      </section>

      {others.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">History</h2>
          <div className="space-y-2">
            {others.map((p) => <PaymentRow key={p.id} p={p} busy={false} onAct={act} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function PaymentRow({ p, busy, onAct }: { p: Payment; busy: boolean; onAct: (id: string, a: 'mark_paid' | 'cancel') => void }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium">{p.profiles?.full_name || 'Unknown'}</p>
            <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
            <span className="text-xs uppercase tracking-wider text-[#c9a96e]">{p.payment_method}</span>
          </div>
          <p className="text-sm text-muted-foreground">{p.profiles?.email} {p.profiles?.phone ? `· ${p.profiles.phone}` : ''}</p>
          <p className="text-sm mt-1">
            <strong>${(p.amount_cents / 100).toFixed(2)}</strong> for {p.credits} credit{p.credits === 1 ? '' : 's'} ({p.pack_type})
          </p>
          <p className="text-xs text-muted-foreground">
            Requested {new Date(p.created_at).toLocaleString()}
            {p.paid_at && ` · Paid ${new Date(p.paid_at).toLocaleString()}`}
          </p>
        </div>
        {p.status === 'pending' && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onAct(p.id, 'mark_paid')} loading={busy}>
              Mark Paid
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onAct(p.id, 'cancel')} loading={busy}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
