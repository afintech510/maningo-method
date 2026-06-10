'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatStudioDate } from '@/lib/timezone';

interface CodeRow {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_cents';
  discount_value: number;
  member_id: string | null;
  campaign: string | null;
  max_redemptions: number | null;
  redemption_count: number;
  starts_at: string | null;
  expires_at: string | null;
  redeemed_at: string | null;
  is_active: boolean;
  issued_at: string;
  once_per_member: boolean;
}

const inputCls =
  'w-full h-11 px-3 rounded-lg border border-[#e5e2dc] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a96e]';
const labelCls = 'block text-xs uppercase tracking-wider text-[#6b6b6b] font-medium mb-1.5';

function discountDisplay(c: CodeRow): string {
  return c.discount_type === 'fixed_cents'
    ? `$${(c.discount_value / 100).toFixed(2)} off`
    : `${c.discount_value}% off`;
}

export function DiscountCodeManager() {
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_cents'>('fixed_cents');
  const [amount, setAmount] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [campaign, setCampaign] = useState('');
  const [oncePerMember, setOncePerMember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/discount-codes');
      const data = await res.json();
      setCodes(data.codes || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createCode(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/discount-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          discount_type: discountType,
          amount,
          max_redemptions: maxRedemptions,
          starts_at: startsAt || null,
          expires_at: expiresAt || null,
          campaign: campaign || null,
          once_per_member: oncePerMember,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data?.error?.message || 'Could not create code.');
        return;
      }
      // Reset & refresh
      setCode('');
      setAmount('');
      setMaxRedemptions('');
      setStartsAt('');
      setExpiresAt('');
      setCampaign('');
      setOncePerMember(true);
      await load();
    } catch {
      setFormError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(c: CodeRow) {
    await fetch(`/api/admin/discount-codes/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !c.is_active }),
    });
    await load();
  }

  async function deleteCode(c: CodeRow) {
    if (!confirm(`Delete code ${c.code}? This cannot be undone.`)) return;
    await fetch(`/api/admin/discount-codes/${c.id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">
          Discount codes
        </p>
        <h2 className="text-xl font-bold">Create &amp; manage codes</h2>
        <p className="text-sm text-muted-foreground">
          Promo codes apply at checkout before the 3% service fee. Leave the usage limit blank for
          unlimited, and dates blank for &ldquo;active now, never expires.&rdquo;
        </p>
      </div>

      {/* Create form */}
      <form
        onSubmit={createCode}
        className="rounded-2xl border border-[#e5e2dc] bg-white p-4 sm:p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div>
          <label className={labelCls}>Code</label>
          <input
            className={`${inputCls} font-mono uppercase`}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SALON10"
            required
          />
        </div>

        <div>
          <label className={labelCls}>Discount type</label>
          <select
            className={inputCls}
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed_cents')}
          >
            <option value="fixed_cents">Fixed amount ($)</option>
            <option value="percentage">Percentage (%)</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>
            {discountType === 'fixed_cents' ? 'Dollars off' : 'Percent off'}
          </label>
          <input
            className={inputCls}
            type="number"
            min="1"
            step={discountType === 'fixed_cents' ? '0.01' : '1'}
            max={discountType === 'percentage' ? '100' : undefined}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={discountType === 'fixed_cents' ? '10' : '15'}
            required
          />
        </div>

        <div>
          <label className={labelCls}>Usage limit</label>
          <input
            className={inputCls}
            type="number"
            min="1"
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
            placeholder="Unlimited"
          />
        </div>

        <div>
          <label className={labelCls}>Starts (optional)</label>
          <input
            className={inputCls}
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls}>Expires (optional)</label>
          <input
            className={inputCls}
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>

        <div>
          <label className={labelCls}>Campaign / tracking (optional)</label>
          <input
            className={inputCls}
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="salon10"
          />
        </div>

        <label className="flex items-center gap-2 sm:col-span-2 lg:col-span-2 text-sm">
          <input
            type="checkbox"
            checked={oncePerMember}
            onChange={(e) => setOncePerMember(e.target.checked)}
            className="h-4 w-4 accent-[#c9a96e]"
          />
          <span>Limit to one redemption per member</span>
        </label>

        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <Button type="submit" loading={submitting} className="w-full">
            Create code
          </Button>
        </div>

        {formError && (
          <p className="sm:col-span-2 lg:col-span-3 text-sm text-red-700">{formError}</p>
        )}
      </form>

      {/* Manage table */}
      <div className="rounded-2xl border border-[#e5e2dc] bg-white overflow-hidden">
        <div className="p-4 border-b border-[#e5e2dc]">
          <p className="text-sm font-semibold">All codes</p>
          <p className="text-xs text-muted-foreground">
            {loading ? 'Loading…' : `${codes.length} code${codes.length === 1 ? '' : 's'}`}
          </p>
        </div>
        {!loading && codes.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No codes yet. Create one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#faf9f6] text-left">
                <tr>
                  {['Code', 'Discount', 'Used', 'Campaign', 'Window', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 font-medium text-[#6b6b6b] text-xs uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className="border-t border-[#f3f1ed]">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold">{c.code}</td>
                    <td className="px-4 py-2.5">
                      {discountDisplay(c)}
                      {c.once_per_member && (
                        <span className="block text-[10px] text-[#6b6b6b] font-normal">1× per member</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {c.redemption_count}
                      {c.max_redemptions != null ? ` / ${c.max_redemptions}` : ' / ∞'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#6b6b6b]">{c.campaign || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-[#6b6b6b] whitespace-nowrap">
                      {c.starts_at ? formatStudioDate(c.starts_at, 'MMM d') : 'now'}
                      {' → '}
                      {c.expires_at ? formatStudioDate(c.expires_at, 'MMM d') : '∞'}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusPill c={c} />
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleActive(c)}
                        className="text-xs text-[#6b6b6b] underline hover:no-underline mr-3"
                      >
                        {c.is_active ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCode(c)}
                        className="text-xs text-red-700 underline hover:no-underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function StatusPill({ c }: { c: CodeRow }) {
  const exhausted = c.max_redemptions != null && c.redemption_count >= c.max_redemptions;
  const expired = c.expires_at != null && new Date(c.expires_at).getTime() < Date.now();
  const pending = c.starts_at != null && new Date(c.starts_at).getTime() > Date.now();

  let label = 'Active';
  let cls = 'bg-emerald-50 text-emerald-700';
  if (!c.is_active) {
    label = 'Paused';
    cls = 'bg-slate-100 text-slate-600';
  } else if (exhausted) {
    label = 'Used up';
    cls = 'bg-slate-100 text-slate-600';
  } else if (expired) {
    label = 'Expired';
    cls = 'bg-slate-100 text-slate-600';
  } else if (pending) {
    label = 'Scheduled';
    cls = 'bg-amber-50 text-amber-700';
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${cls} text-[11px] font-medium px-2 py-1`}
    >
      {label}
    </span>
  );
}
