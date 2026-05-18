'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { formatStudioTime, STUDIO_TIMEZONE } from '@/lib/timezone';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

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

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState<string[]>([]); // empty = all
  const [dayFilter, setDayFilter] = useState<number[]>([]); // empty = all
  const [timeFilter, setTimeFilter] = useState<string[]>([]); // empty = all; values are 'HH:mm' studio-local
  // 'upcoming' = next future class on top, past classes below (default)
  // 'latest' = strict descending by date — newest scheduled class on top
  // 'oldest' = strict ascending by date — oldest first
  const [sortMode, setSortMode] = useState<'upcoming' | 'latest' | 'oldest'>('upcoming');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResults, setBulkResults] = useState<{
    ok: number;
    failed: Array<{ title: string; reason: string }>;
  } | null>(null);

  // Only months with classes actually posted.
  const months = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach((c) => {
      const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
      const key = `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, format(z, 'MMM yyyy'));
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, label]) => ({ key, label }));
  }, [classes]);

  // Days of week with at least one class.
  const dayOptions = useMemo(() => {
    const present = new Set<number>();
    classes.forEach((c) => {
      const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
      present.add(z.getDay());
    });
    return Array.from(present)
      .sort((a, b) => a - b)
      .map((idx) => ({ idx, label: DAY_LABELS[idx] }));
  }, [classes]);

  // Time chips narrow as month / day filters narrow.
  const timeOptions = useMemo(() => {
    const map = new Map<string, string>(); // 'HH:mm' -> 'h:mm a'
    classes.forEach((c) => {
      const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
      if (monthFilter.length > 0) {
        const monthKey = `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}`;
        if (!monthFilter.includes(monthKey)) return;
      }
      if (dayFilter.length > 0 && !dayFilter.includes(z.getDay())) return;
      const key = format(z, 'HH:mm');
      if (!map.has(key)) {
        map.set(key, formatStudioTime(c.starts_at));
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, label]) => ({ key, label }));
  }, [classes, monthFilter, dayFilter]);

  // Drop any selected times that are no longer offered after narrowing.
  useEffect(() => {
    if (timeFilter.length === 0) return;
    const valid = new Set(timeOptions.map((t) => t.key));
    const next = timeFilter.filter((t) => valid.has(t));
    if (next.length !== timeFilter.length) setTimeFilter(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeOptions]);

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
  function toggleTime(t: string) {
    setTimeFilter((times) => (times.includes(t) ? times.filter((k) => k !== t) : [...times, t]));
  }

  const filtered = useMemo(() => {
    return classes.filter((c) => {
      const start = new Date(c.starts_at);
      const z = toZonedTime(start, STUDIO_TIMEZONE);
      if (monthFilter.length > 0) {
        const monthKey = `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}`;
        if (!monthFilter.includes(monthKey)) return false;
      }
      if (dayFilter.length > 0) {
        if (!dayFilter.includes(z.getDay())) return false;
      }
      if (timeFilter.length > 0) {
        const timeKey = format(z, 'HH:mm');
        if (!timeFilter.includes(timeKey)) return false;
      }
      return true;
    });
  }, [classes, monthFilter, dayFilter, timeFilter]);

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
      <div className="mb-3">
        <Link href="/admin/classes/manage" className="text-sm text-[#c9a96e] hover:underline">
          Try the new manager &rarr;
        </Link>
      </div>
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">Classes</p>
        <h1 className="text-2xl sm:text-3xl font-bold">Manage classes</h1>
      </div>

      {/* Create actions */}
      <Link
        href="/admin/schedule"
        className="block rounded-2xl border-2 border-[#c9a96e] bg-[#c9a96e]/5 p-4 hover:bg-[#c9a96e]/10 transition-colors mb-6"
      >
        <p className="text-[10px] font-medium uppercase tracking-wider text-[#c9a96e] mb-1">Create</p>
        <p className="font-semibold">Schedule classes</p>
        <p className="text-xs text-muted-foreground">
          Recurring weekly OR one-off &mdash; one form, batch generate.
        </p>
      </Link>

      {/* Manage header + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6b6b6b]">Manage</h2>
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {classes.length}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-wider text-[#6b6b6b] font-medium">Sort</label>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as 'upcoming' | 'latest' | 'oldest')}
            className="h-8 px-2 rounded-lg border border-[#e5e2dc] bg-white text-xs font-medium text-[#1a1a1a] focus:border-[#c9a96e] outline-none"
          >
            <option value="upcoming">Upcoming first</option>
            <option value="latest">Latest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          {(monthFilter.length > 0 || dayFilter.length > 0 || timeFilter.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setMonthFilter([]);
                setDayFilter([]);
                setTimeFilter([]);
              }}
              className="text-xs text-[#c9a96e] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[#e5e2dc] bg-white p-3 sm:p-4 mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:gap-6 gap-3">
          {months.length > 0 && (
            <div className="min-w-0">
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
          )}
          {dayOptions.length > 0 && (
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-[#6b6b6b] font-medium mb-1.5">Day of week</p>
              <div className="flex flex-wrap gap-1.5">
                {dayOptions.map((d) => {
                  const on = dayFilter.includes(d.idx);
                  return (
                    <button
                      key={d.idx}
                      type="button"
                      onClick={() => toggleDay(d.idx)}
                      aria-pressed={on}
                      className={`min-h-[36px] min-w-[44px] px-2 rounded-full text-xs font-medium border transition-colors ${
                        on
                          ? 'bg-[#2d2d2d] text-white border-[#2d2d2d]'
                          : 'bg-white text-[#6b6b6b] border-[#e5e2dc] hover:border-[#c9a96e]'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {timeOptions.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#6b6b6b] font-medium mb-1.5">Starting time</p>
            <div className="flex flex-wrap gap-1.5">
              {timeOptions.map((t) => {
                const on = timeFilter.includes(t.key);
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => toggleTime(t.key)}
                    aria-pressed={on}
                    className={`min-h-[36px] px-3 rounded-full text-xs font-medium border transition-colors ${
                      on
                        ? 'bg-[#2d2d2d] text-white border-[#2d2d2d]'
                        : 'bg-white text-[#6b6b6b] border-[#e5e2dc] hover:border-[#c9a96e]'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
        <FilteredByDay
          classes={filtered}
          selected={selected}
          onToggleSelect={toggleSelect}
          sortMode={sortMode}
        />
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

/**
 * Renders the class list grouped into per-day columns. The grid widens with
 * screen size so an admin can see more days at a glance on desktop.
 */
function FilteredByDay({
  classes,
  selected,
  onToggleSelect,
  sortMode = 'upcoming',
}: {
  classes: ClassItem[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  sortMode?: 'upcoming' | 'latest' | 'oldest';
}) {
  const days = useMemo(() => {
    const map = new Map<string, ClassItem[]>();
    classes.forEach((c) => {
      const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
      const key = format(z, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    const dayKeys = Array.from(map.keys());

    // 'upcoming' splits the list at today: future days ascending (closest
    // class first), then past days descending (most-recent past below the
    // future, oldest at the very bottom). 'latest' / 'oldest' are strict
    // chronological orders.
    const todayKey = format(toZonedTime(new Date(), STUDIO_TIMEZONE), 'yyyy-MM-dd');
    let ordered: string[];
    if (sortMode === 'upcoming') {
      const future = dayKeys.filter((k) => k >= todayKey).sort();
      const past = dayKeys.filter((k) => k < todayKey).sort().reverse();
      ordered = [...future, ...past];
    } else if (sortMode === 'latest') {
      ordered = dayKeys.slice().sort().reverse();
    } else {
      ordered = dayKeys.slice().sort();
    }

    return ordered.map((day) => {
      const [yy, mm, dd] = day.split('-').map(Number);
      const headerLabel = format(new Date(yy, (mm || 1) - 1, dd || 1), 'EEE, MMM d');
      const items = map
        .get(day)!
        .slice()
        .sort(
          (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        );
      return { day, headerLabel, items };
    });
  }, [classes, sortMode]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {days.map(({ day, headerLabel, items }) => (
        <div key={day} className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-[#6b6b6b]">
            {headerLabel}
          </p>
          {items.map((cls) => {
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
                    onChange={() => onToggleSelect(cls.id)}
                    aria-label={`Select ${cls.title}`}
                    className="h-5 w-5 rounded border-[#e5e2dc] text-[#c9a96e] focus:ring-[#c9a96e]"
                  />
                </label>
                <Link href={`/admin/classes/${cls.id}`} className="flex-1 min-w-0 p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{cls.title}</p>
                      <p className="text-sm text-muted-foreground">{formatStudioTime(cls.starts_at)}</p>
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
      ))}
    </div>
  );
}
