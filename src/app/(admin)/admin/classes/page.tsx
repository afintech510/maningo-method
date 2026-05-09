'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { formatStudioDateTime } from '@/lib/timezone';

interface ClassItem {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  max_capacity: number;
  status: string;
  booked_count: number;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface MonthOpt {
  key: string; // 'YYYY-MM'
  label: string; // 'May 2026'
}

function nextThreeMonths(): MonthOpt[] {
  const now = new Date();
  const out: MonthOpt[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
    });
  }
  return out;
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState<string[]>([]); // empty = all
  const [dayFilter, setDayFilter] = useState<number[]>([]); // empty = all
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResults, setBulkResults] = useState<{
    ok: number;
    failed: Array<{ title: string; reason: string }>;
  } | null>(null);

  const months = useMemo(() => nextThreeMonths(), []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/classes');
    const data = await res.json();
    setClasses(data.classes || []);
    setSelected(new Set());
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function toggleMonth(key: string) {
    setMonthFilter((m) => (m.includes(key) ? m.filter((k) => k !== key) : [...m, key]));
  }
  function toggleDay(d: number) {
    setDayFilter((days) => (days.includes(d) ? days.filter((k) => k !== d) : [...days, d]));
  }

  const filtered = useMemo(() => {
    return classes.filter((c) => {
      const start = new Date(c.starts_at);
      if (monthFilter.length > 0) {
        const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
        if (!monthFilter.includes(monthKey)) return false;
      }
      if (dayFilter.length > 0) {
        if (!dayFilter.includes(start.getDay())) return false;
      }
      return true;
    });
  }, [classes, monthFilter, dayFilter]);

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectAllVisible() {
    setSelected(new Set(filtered.map((c) => c.id)));
  }
  function clearSelection() {
    setSelected(new Set());
  }

  async function runBulkDelete() {
    setBulkRunning(true);
    const ids = Array.from(selected);
    const failed: Array<{ title: string; reason: string }> = [];
    let ok = 0;
    for (const id of ids) {
      const target = classes.find((c) => c.id === id);
      try {
        const res = await fetch(`/api/admin/classes/${id}`, { method: 'DELETE' });
        if (res.ok) {
          ok += 1;
        } else {
          const data = await res.json().catch(() => ({}));
          failed.push({
            title: target?.title || id,
            reason: data?.error?.message || `HTTP ${res.status}`,
          });
        }
      } catch (err) {
        failed.push({ title: target?.title || id, reason: (err as Error).message });
      }
    }
    setBulkResults({ ok, failed });
    setBulkRunning(false);
    await load();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">Classes</p>
        <h1 className="text-2xl sm:text-3xl font-bold">Manage classes</h1>
      </div>

      {/* Create actions */}
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <Link
          href="/admin/schedule"
          className="rounded-2xl border-2 border-[#c9a96e] bg-[#c9a96e]/5 p-4 hover:bg-[#c9a96e]/10 transition-colors"
        >
          <p className="text-[10px] font-medium uppercase tracking-wider text-[#c9a96e] mb-1">Create</p>
          <p className="font-semibold">Schedule classes</p>
          <p className="text-xs text-muted-foreground">
            Recurring weekly OR one-off &mdash; one form, batch generate.
          </p>
        </Link>
        <Link
          href="/admin/classes/new"
          className="rounded-2xl border border-[#e5e2dc] bg-white p-4 hover:border-[#c9a96e] transition-colors"
        >
          <p className="text-[10px] font-medium uppercase tracking-wider text-[#6b6b6b] mb-1">Create</p>
          <p className="font-semibold">Single class (legacy form)</p>
          <p className="text-xs text-muted-foreground">Quick add a one-off class with the simple form.</p>
        </Link>
      </div>

      {/* Manage header + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6b6b6b]">Manage</h2>
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {classes.length}
        </span>
        {(monthFilter.length > 0 || dayFilter.length > 0) && (
          <button
            type="button"
            onClick={() => {
              setMonthFilter([]);
              setDayFilter([]);
            }}
            className="text-xs text-[#c9a96e] hover:underline ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-[#e5e2dc] bg-white p-3 sm:p-4 mb-4 space-y-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#6b6b6b] font-medium mb-1.5">Month</p>
          <div className="flex flex-wrap gap-1.5">
            {months.map((m) => {
              const on = monthFilter.includes(m.key);
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => toggleMonth(m.key)}
                  aria-pressed={on}
                  className={`min-h-[36px] px-3 rounded-full text-xs font-medium border transition-colors ${
                    on
                      ? 'bg-[#2d2d2d] text-white border-[#2d2d2d]'
                      : 'bg-white text-[#6b6b6b] border-[#e5e2dc] hover:border-[#c9a96e]'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#6b6b6b] font-medium mb-1.5">Day of week</p>
          <div className="flex flex-wrap gap-1.5">
            {DAY_LABELS.map((label, idx) => {
              const on = dayFilter.includes(idx);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  aria-pressed={on}
                  className={`min-h-[36px] min-w-[44px] px-2 rounded-full text-xs font-medium border transition-colors ${
                    on
                      ? 'bg-[#2d2d2d] text-white border-[#2d2d2d]'
                      : 'bg-white text-[#6b6b6b] border-[#e5e2dc] hover:border-[#c9a96e]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
          <button
            type="button"
            onClick={selected.size === filtered.length ? clearSelection : selectAllVisible}
            className="text-xs text-[#c9a96e] hover:underline"
          >
            {selected.size === filtered.length ? 'Clear selection' : 'Select all visible'}
          </button>
          {selected.size > 0 && (
            <>
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              <Button
                size="sm"
                variant="destructive"
                className="ml-auto"
                onClick={() => {
                  setBulkResults(null);
                  setBulkOpen(true);
                }}
              >
                Delete selected
              </Button>
            </>
          )}
        </div>
      )}

      {loading ? (
        <>
          <Skeleton variant="card" />
          <Skeleton variant="card" className="mt-3" />
        </>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={classes.length === 0 ? 'No classes yet' : 'Nothing matches the filters'}
          description={
            classes.length === 0
              ? 'Create your first class to get started.'
              : 'Try clearing or relaxing your filters.'
          }
          ctaLabel={classes.length === 0 ? 'Schedule classes' : undefined}
          ctaHref={classes.length === 0 ? '/admin/schedule' : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((cls) => {
            const isSelected = selected.has(cls.id);
            return (
              <div
                key={cls.id}
                className={`flex items-stretch gap-2 rounded-2xl border bg-white transition-colors ${
                  isSelected ? 'border-[#c9a96e] bg-[#c9a96e]/5' : 'border-[#e5e2dc]'
                }`}
              >
                <label className="flex items-center pl-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(cls.id)}
                    aria-label={`Select ${cls.title}`}
                    className="h-5 w-5 rounded border-[#e5e2dc] text-[#c9a96e] focus:ring-[#c9a96e]"
                  />
                </label>
                <Link href={`/admin/classes/${cls.id}`} className="flex-1 min-w-0 p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{cls.title}</p>
                      <p className="text-sm text-muted-foreground">{formatStudioDateTime(cls.starts_at)}</p>
                      <p className="text-xs text-muted-foreground">
                        {cls.booked_count}/{cls.max_capacity} booked
                      </p>
                    </div>
                    <Badge
                      variant={
                        cls.status === 'scheduled'
                          ? 'success'
                          : cls.status === 'cancelled'
                            ? 'error'
                            : 'neutral'
                      }
                    >
                      {cls.status}
                    </Badge>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={bulkOpen}
        onClose={() => {
          if (bulkRunning) return;
          setBulkOpen(false);
          if (bulkResults) setBulkResults(null);
        }}
        title="Delete selected classes?"
      >
        {!bulkResults ? (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              Permanently delete <strong className="text-foreground">{selected.size}</strong>{' '}
              class{selected.size === 1 ? '' : 'es'}? Classes with active (pending or confirmed) bookings can&rsquo;t be deleted &mdash;
              cancel them first instead.
            </p>
            <div className="flex gap-3">
              <Button variant="destructive" className="flex-1" onClick={runBulkDelete} loading={bulkRunning}>
                Yes, delete
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setBulkOpen(false)}
                disabled={bulkRunning}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 mb-3 text-sm text-emerald-800">
              Deleted {bulkResults.ok} class{bulkResults.ok === 1 ? '' : 'es'}.
            </div>
            {bulkResults.failed.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-3 text-sm text-amber-900">
                <p className="font-semibold mb-1">{bulkResults.failed.length} could not be deleted:</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  {bulkResults.failed.map((f, i) => (
                    <li key={i}>
                      <span className="font-medium">{f.title}</span> &mdash; {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              className="w-full"
              onClick={() => {
                setBulkOpen(false);
                setBulkResults(null);
              }}
            >
              Done
            </Button>
          </>
        )}
      </Modal>
    </div>
  );
}
