'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Input } from '@/components/ui/Input';
import { formatCents } from '@/lib/pricing';

interface Student {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  credits: number;
  lifetime_spend_cents: number;
}

type SortKey = 'name' | 'credits' | 'spend' | 'created';
type SortDir = 'asc' | 'desc';

export default function AdminMembersPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adjustTarget, setAdjustTarget] = useState<Student | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('created');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/students');
    const data = await res.json();
    setStudents(data.students || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? students.filter(
          (s) =>
            (s.full_name || '').toLowerCase().includes(q) ||
            (s.email || '').toLowerCase().includes(q) ||
            (s.phone || '').toLowerCase().includes(q),
        )
      : students.slice();

    rows.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'name':
          return (a.full_name || '').localeCompare(b.full_name || '') * dir;
        case 'credits':
          return ((a.credits || 0) - (b.credits || 0)) * dir;
        case 'spend':
          return ((a.lifetime_spend_cents || 0) - (b.lifetime_spend_cents || 0)) * dir;
        case 'created':
        default:
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      }
    });
    return rows;
  }, [students, search, sortKey, sortDir]);

  function setSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      // Default direction: name asc, others desc
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  }

  function smsHref(phone: string): string {
    const clean = phone.replace(/[^\d+]/g, '');
    return `sms:${clean}`;
  }
  function telHref(phone: string): string {
    const clean = phone.replace(/[^\d+]/g, '');
    return `tel:${clean}`;
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Members</h1>
        <Skeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">Members</p>
        <h1 className="text-2xl sm:text-3xl font-bold">All members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {students.length} total &middot; tap a member to adjust credits. Phone &amp; email open your phone&rsquo;s SMS / mail app.
        </p>
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, email, phone"
        />
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-2">
        {filtered.map((s) => (
          <div key={s.id} className="rounded-2xl border border-[#e5e2dc] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{s.full_name || '(no name)'}</p>
                <a href={`mailto:${s.email}`} className="text-sm text-[#c9a96e] hover:underline break-all">
                  {s.email}
                </a>
                {s.phone && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    <a href={telHref(s.phone)} className="text-xs text-[#c9a96e] hover:underline">
                      {s.phone}
                    </a>
                    <a href={smsHref(s.phone)} className="text-xs text-[#c9a96e] hover:underline">
                      &middot; SMS
                    </a>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end shrink-0">
                <p className="text-xs text-muted-foreground">Credits</p>
                <p className="text-2xl font-bold leading-none">{s.credits}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs">
              <span className="text-muted-foreground">
                Lifetime: <strong className="text-[#2d2d2d]">{formatCents(s.lifetime_spend_cents)}</strong>
              </span>
              <Button size="sm" variant="ghost" onClick={() => setAdjustTarget(s)}>
                Adjust
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block rounded-2xl border border-[#e5e2dc] bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#faf9f6] text-xs uppercase tracking-wider text-[#6b6b6b]">
            <tr>
              <Th label="Name" k="name" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <Th label="Credits" k="credits" sortKey={sortKey} sortDir={sortDir} setSort={setSort} align="right" />
              <Th label="Lifetime spend" k="spend" sortKey={sortKey} sortDir={sortDir} setSort={setSort} align="right" />
              <Th label="Joined" k="created" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-t border-[#e5e2dc] hover:bg-[#faf9f6]/50">
                <td className="px-4 py-3 font-medium">{s.full_name || '(no name)'}</td>
                <td className="px-4 py-3">
                  <a href={`mailto:${s.email}`} className="text-[#c9a96e] hover:underline">
                    {s.email}
                  </a>
                </td>
                <td className="px-4 py-3">
                  {s.phone ? (
                    <span className="space-x-2">
                      <a href={telHref(s.phone)} className="text-[#c9a96e] hover:underline">
                        {s.phone}
                      </a>
                      <a
                        href={smsHref(s.phone)}
                        className="text-xs text-[#6b6b6b] hover:text-[#1a1a1a]"
                        title="Send SMS"
                      >
                        SMS
                      </a>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">&mdash;</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{s.credits}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCents(s.lifetime_spend_cents)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setAdjustTarget(s)}>
                    Adjust
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No members match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adjustTarget && (
        <AdjustModal
          student={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onSaved={async () => {
            setAdjustTarget(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function Th({
  label,
  k,
  sortKey,
  sortDir,
  setSort,
  align,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  setSort: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = sortKey === k;
  return (
    <th className={`px-4 py-3 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => setSort(k)}
        className={`inline-flex items-center gap-1 hover:text-[#1a1a1a] ${active ? 'text-[#1a1a1a]' : ''}`}
      >
        <span>{label}</span>
        {active && <span aria-hidden>{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}

function AdjustModal({
  student,
  onClose,
  onSaved,
}: {
  student: Student;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [delta, setDelta] = useState('1');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const deltaNum = parseInt(delta, 10);
    if (!Number.isInteger(deltaNum) || deltaNum === 0) {
      setError('Delta must be a non-zero integer.');
      return;
    }
    if (reason.trim().length < 3) {
      setError('A short reason is required.');
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/admin/students/${student.id}/credits`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: deltaNum, reason: reason.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message || 'Could not adjust credits.');
      setSubmitting(false);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-[#e5e2dc] p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Adjust credits for</p>
            <p className="font-semibold">{student.full_name}</p>
            <p className="text-xs text-muted-foreground">
              Current: {student.credits} credit{student.credits === 1 ? '' : 's'}
            </p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Change by</label>
            <div className="flex flex-wrap gap-2">
              {(['-1', '1', '5', '10'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDelta(v)}
                  className="min-h-[44px] px-3 rounded-lg border border-[#e5e2dc] text-sm hover:border-[#c9a96e]"
                >
                  {v.startsWith('-') ? v : `+${v}`}
                </button>
              ))}
              <input
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="±N"
                className="flex-1 min-w-[80px] h-12 px-3 rounded-lg border border-[#e5e2dc] focus:outline-none focus:ring-2 focus:ring-[#c9a96e]"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              New balance: {student.credits + (parseInt(delta, 10) || 0)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Reason (required)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={3}
              maxLength={280}
              rows={3}
              placeholder="e.g. Cash payment for 5-pack"
              className="w-full px-3 py-2 rounded-lg border border-[#e5e2dc] bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              Save adjustment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
