'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Input } from '@/components/ui/Input';
import { formatCents } from '@/lib/pricing';
import { BulkMemberEmailModal } from '@/components/admin/BulkMemberEmailModal';
import { MemberHistoryModal } from '@/components/admin/MemberHistoryModal';

interface Student {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  credits: number;
  lifetime_spend_cents: number;
  waiver_signed_at: string | null;
  last_attended_at: string | null;
  classes_attended: number;
}

type SortKey = 'name' | 'credits' | 'spend' | 'created' | 'waiver' | 'last_attended' | 'classes_attended';
type SortDir = 'asc' | 'desc';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'created', label: 'Joined' },
  { value: 'name', label: 'Name' },
  { value: 'credits', label: 'Credits' },
  { value: 'spend', label: 'Lifetime spend' },
  { value: 'waiver', label: 'Waiver' },
  { value: 'last_attended', label: 'Last class' },
  { value: 'classes_attended', label: 'Classes attended' },
];

export default function AdminMembersPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adjustTarget, setAdjustTarget] = useState<Student | null>(null);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Student | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('created');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() {
    setSelected(new Set());
  }

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
        case 'waiver': {
          // Signed first when asc, unsigned first when desc — toggleable
          const av = a.waiver_signed_at ? 1 : 0;
          const bv = b.waiver_signed_at ? 1 : 0;
          return (av - bv) * dir;
        }
        case 'last_attended': {
          // Sort by most-recent attendance. Never-attended (null) sorts last.
          const at = a.last_attended_at ? new Date(a.last_attended_at).getTime() : 0;
          const bt = b.last_attended_at ? new Date(b.last_attended_at).getTime() : 0;
          return (at - bt) * dir;
        }
        case 'classes_attended':
          return ((a.classes_attended || 0) - (b.classes_attended || 0)) * dir;
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
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Members</h1>
        <Skeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">Members</p>
        <h1 className="text-2xl sm:text-3xl font-bold">All members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {students.length} total &middot; tap a name for full history, Adjust for credits, Edit for profile fields.
        </p>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-0 z-20 -mx-4 px-4 mb-4 py-3 bg-[#c9a96e]/10 border-y border-[#c9a96e]/30 flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-[#1a1a1a]">
            {selected.size} member{selected.size === 1 ? '' : 's'} selected
          </p>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              Clear
            </Button>
            <Button size="sm" onClick={() => setBulkEmailOpen(true)}>
              Email {selected.size} selected
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 sm:gap-3 sm:items-end">
        <Input
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, email, phone"
        />
        {/* Mobile-only sort controls (desktop uses sortable table headers) */}
        <div className="lg:hidden">
          <label className="block text-sm font-medium mb-1.5">Sort by</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="w-full h-12 px-3 rounded-lg border border-[#e5e2dc] bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a96e]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="lg:hidden">
          <label className="block text-sm font-medium mb-1.5">&nbsp;</label>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            aria-label={`Sort direction ${sortDir}`}
            className="w-full h-12 px-3 rounded-lg border border-[#e5e2dc] bg-white text-sm font-medium hover:border-[#c9a96e]"
          >
            {sortDir === 'asc' ? '↑ Ascending' : '↓ Descending'}
          </button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden">
        {filtered.length > 0 && (
          <label className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#e5e2dc] text-[#c9a96e]"
              checked={filtered.length > 0 && filtered.every((s) => selected.has(s.id))}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelected(new Set(filtered.map((s) => s.id)));
                } else {
                  clearSelection();
                }
              }}
            />
            Select all visible ({filtered.length})
          </label>
        )}
        <div className="space-y-2">
        {filtered.map((s) => (
          <div
            key={s.id}
            className={`rounded-2xl border bg-white p-4 ${selected.has(s.id) ? 'border-[#c9a96e]' : 'border-[#e5e2dc]'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <input
                  type="checkbox"
                  aria-label={`Select ${s.full_name || s.email}`}
                  checked={selected.has(s.id)}
                  onChange={() => toggleSelected(s.id)}
                  className="mt-1 h-4 w-4 rounded border-[#e5e2dc] text-[#c9a96e] flex-shrink-0"
                />
                <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHistoryTarget(s)}
                    className="font-medium text-left text-[#1a1a1a] hover:text-[#c9a96e] hover:underline"
                  >
                    {s.full_name || '(no name)'}
                  </button>
                  <WaiverPill signed={!!s.waiver_signed_at} />
                </div>
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
              </div>
              <div className="flex flex-col items-end shrink-0">
                <p className="text-xs text-muted-foreground">Credits</p>
                <p className="text-2xl font-bold leading-none">{s.credits}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs">
              <span className="text-muted-foreground">
                Classes: <strong className="text-[#2d2d2d]">{s.classes_attended}</strong>
                {' · '}
                Lifetime: <strong className="text-[#2d2d2d]">{formatCents(s.lifetime_spend_cents)}</strong>
                {' · '}
                Last class: <strong className="text-[#2d2d2d]">{formatLastAttended(s.last_attended_at)}</strong>
              </span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditTarget(s)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdjustTarget(s)}>
                  Adjust
                </Button>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block rounded-2xl border border-[#e5e2dc] bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-[#faf9f6] text-xs uppercase tracking-wider text-[#6b6b6b]">
            <tr>
              <th className="px-3 py-3 text-left font-medium w-8">
                <input
                  type="checkbox"
                  aria-label="Select all visible"
                  className="h-4 w-4 rounded border-[#e5e2dc] text-[#c9a96e]"
                  checked={filtered.length > 0 && filtered.every((s) => selected.has(s.id))}
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(filtered.map((s) => s.id)));
                    else clearSelection();
                  }}
                />
              </th>
              <Th label="Name" k="name" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <Th label="Waiver" k="waiver" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
              <Th label="Credits" k="credits" sortKey={sortKey} sortDir={sortDir} setSort={setSort} align="right" />
              <Th label="Classes" k="classes_attended" sortKey={sortKey} sortDir={sortDir} setSort={setSort} align="right" />
              <Th label="Lifetime spend" k="spend" sortKey={sortKey} sortDir={sortDir} setSort={setSort} align="right" />
              <Th label="Last class" k="last_attended" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
              <Th label="Joined" k="created" sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr
                key={s.id}
                className={`border-t border-[#e5e2dc] hover:bg-[#faf9f6]/50 ${selected.has(s.id) ? 'bg-[#c9a96e]/5' : ''}`}
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${s.full_name || s.email}`}
                    checked={selected.has(s.id)}
                    onChange={() => toggleSelected(s.id)}
                    className="h-4 w-4 rounded border-[#e5e2dc] text-[#c9a96e]"
                  />
                </td>
                <td className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => setHistoryTarget(s)}
                    className="text-left text-[#1a1a1a] hover:text-[#c9a96e] hover:underline"
                  >
                    {s.full_name || '(no name)'}
                  </button>
                </td>
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
                <td className="px-4 py-3">
                  <WaiverPill signed={!!s.waiver_signed_at} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{s.credits}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.classes_attended}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCents(s.lifetime_spend_cents)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatLastAttended(s.last_attended_at)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditTarget(s)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAdjustTarget(s)}>
                      Adjust
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
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

      {editTarget && (
        <EditMemberModal
          student={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={async () => {
            setEditTarget(null);
            await load();
          }}
        />
      )}

      {historyTarget && (
        <MemberHistoryModal
          memberId={historyTarget.id}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {bulkEmailOpen && (
        <BulkMemberEmailModal
          members={students
            .filter((s) => selected.has(s.id))
            .map((s) => ({
              id: s.id,
              full_name: s.full_name,
              email: s.email,
              credits: s.credits,
              last_attended_at: s.last_attended_at,
            }))}
          onClose={() => setBulkEmailOpen(false)}
        />
      )}
    </div>
  );
}

function formatLastAttended(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (days <= 0) return `Today (${datePart})`;
  if (days === 1) return `Yesterday (${datePart})`;
  if (days < 14) return `${days}d ago (${datePart})`;
  const weeks = Math.floor(days / 7);
  if (weeks < 12) return `${weeks}w ago (${datePart})`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function WaiverPill({ signed }: { signed: boolean }) {
  return signed ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span aria-hidden>✓</span>Waiver
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      No waiver
    </span>
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

function EditMemberModal({
  student,
  onClose,
  onSaved,
}: {
  student: Student;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(student.full_name || '');
  const [email, setEmail] = useState(student.email || '');
  const [phone, setPhone] = useState(student.phone || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetState, setResetState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resetError, setResetError] = useState<string | null>(null);

  async function handleSendReset() {
    if (!window.confirm(`Send a password reset email to ${student.email}?`)) return;
    setResetState('sending');
    setResetError(null);
    const res = await fetch(`/api/admin/students/${student.id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setResetError(body?.error?.message || 'Could not send reset email.');
      setResetState('error');
      return;
    }
    setResetState('sent');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload: Record<string, unknown> = {};
    if (fullName.trim() && fullName.trim() !== student.full_name) payload.full_name = fullName.trim();
    if (email.trim() && email.trim() !== student.email) payload.email = email.trim();
    const phoneTrim = phone.trim();
    if (phoneTrim !== (student.phone || '')) payload.phone = phoneTrim || null;

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    setSubmitting(true);
    const res = await fetch(`/api/admin/students/${student.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message || 'Could not save changes.');
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
            <p className="text-xs text-muted-foreground">Edit member</p>
            <p className="font-semibold">{student.full_name}</p>
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
          <Input
            label="Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="off"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            inputMode="email"
            autoComplete="off"
          />
          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="(631) 555-1234"
            autoComplete="off"
          />

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              Save changes
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Changing email updates their login. They can still use their existing password.
          </p>
        </form>

        {/* Account access — send a password reset link */}
        <div className="mt-6 pt-5 border-t border-[#e5e2dc]">
          <p className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium mb-1">
            Account access
          </p>
          <p className="text-sm text-muted-foreground mb-3">
            Send a password reset email to <strong className="text-[#2d2d2d] break-all">{student.email}</strong>.
            They&rsquo;ll click the link to set a new password.
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={handleSendReset}
            loading={resetState === 'sending'}
            disabled={resetState === 'sending'}
            className="w-full"
          >
            {resetState === 'sent' ? 'Sent ✓' : 'Send reset link'}
          </Button>
          {resetState === 'sent' && (
            <p className="text-xs text-emerald-700 mt-2">
              Sent — link expires in 1 hour. They can request another anytime.
            </p>
          )}
          {resetState === 'error' && resetError && (
            <p className="text-xs text-red-700 mt-2">{resetError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
