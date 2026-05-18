'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatStudioTime, STUDIO_TIMEZONE } from '@/lib/timezone';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ClassDetailPanel } from './ClassDetailPanel';
import { ScheduleCreatorDrawer } from './ScheduleCreatorDrawer';
import type { ScheduleCreatorSeed } from './ScheduleCreatorForm';

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

export function ClassManager() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
  const [dayFilter, setDayFilter] = useState<number[]>([]);
  const [timeFilter, setTimeFilter] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<'upcoming' | 'latest' | 'oldest'>('upcoming');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSeed, setDrawerSeed] = useState<ScheduleCreatorSeed | undefined>(undefined);
  const [drawerTitle, setDrawerTitle] = useState('Schedule classes');

  const detailRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/classes');
    const data = await res.json();
    setClasses(data.classes || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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

  const timeOptions = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach((c) => {
      const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
      if (monthFilter.length > 0) {
        const monthKey = `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}`;
        if (!monthFilter.includes(monthKey)) return;
      }
      if (dayFilter.length > 0 && !dayFilter.includes(z.getDay())) return;
      const key = format(z, 'HH:mm');
      if (!map.has(key)) map.set(key, formatStudioTime(c.starts_at));
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, label]) => ({ key, label }));
  }, [classes, monthFilter, dayFilter]);

  useEffect(() => {
    if (timeFilter.length === 0) return;
    const valid = new Set(timeOptions.map((t) => t.key));
    const next = timeFilter.filter((t) => valid.has(t));
    if (next.length !== timeFilter.length) setTimeFilter(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeOptions]);

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
      const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
      if (monthFilter.length > 0) {
        const monthKey = `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}`;
        if (!monthFilter.includes(monthKey)) return false;
      }
      if (dayFilter.length > 0 && !dayFilter.includes(z.getDay())) return false;
      if (timeFilter.length > 0) {
        const timeKey = format(z, 'HH:mm');
        if (!timeFilter.includes(timeKey)) return false;
      }
      return true;
    });
  }, [classes, monthFilter, dayFilter, timeFilter]);

  const sorted = useMemo(() => {
    const arr = filtered.slice();
    if (sortMode === 'latest') {
      arr.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
    } else if (sortMode === 'oldest') {
      arr.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    } else {
      // upcoming: future first asc, then past desc
      const now = Date.now();
      const future = arr.filter((c) => new Date(c.starts_at).getTime() >= now)
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
      const past = arr.filter((c) => new Date(c.starts_at).getTime() < now)
        .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
      return [...future, ...past];
    }
    return arr;
  }, [filtered, sortMode]);

  const selected = useMemo(
    () => classes.find((c) => c.id === selectedId) || null,
    [classes, selectedId],
  );

  function selectClass(id: string) {
    setSelectedId(id);
    // Smooth-scroll the detail panel into view on mobile.
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }

  function openCreate() {
    setDrawerSeed(undefined);
    setDrawerTitle('Schedule classes');
    setDrawerOpen(true);
  }

  function openDuplicate(seed: ScheduleCreatorSeed) {
    setDrawerSeed(seed);
    setDrawerTitle('Duplicate class series');
    setDrawerOpen(true);
  }

  function handleCreated() {
    setDrawerOpen(false);
    load();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#c9a96e] mb-1">Classes</p>
          <h1 className="text-2xl sm:text-3xl font-bold">Class manager</h1>
          <p className="text-sm text-muted-foreground">
            Filter, select, edit details, manage roster, email the class — all in one place.
          </p>
        </div>
        <Button onClick={openCreate}>
          <span className="hidden sm:inline">Create classes — one-off or weekly series</span>
          <span className="sm:hidden">+ Create</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: filters + list */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6b6b6b]">
              {sorted.length} of {classes.length}
            </h2>
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
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#e5e2dc] bg-white p-3 space-y-3">
            {months.length > 0 && (
              <Chips
                label="Month"
                options={months.map((m) => ({ key: m.key, label: m.label }))}
                active={monthFilter}
                onToggle={toggleMonth}
              />
            )}
            {dayOptions.length > 0 && (
              <Chips
                label="Day"
                options={dayOptions.map((d) => ({ key: String(d.idx), label: d.label }))}
                active={dayFilter.map(String)}
                onToggle={(k) => toggleDay(Number(k))}
              />
            )}
            {timeOptions.length > 0 && (
              <Chips
                label="Time"
                options={timeOptions}
                active={timeFilter}
                onToggle={toggleTime}
              />
            )}
          </div>

          {loading ? (
            <>
              <Skeleton variant="card" />
              <Skeleton variant="card" className="mt-3" />
            </>
          ) : sorted.length === 0 ? (
            <EmptyState
              title={classes.length === 0 ? 'No classes yet' : 'Nothing matches the filters'}
              description={
                classes.length === 0
                  ? 'Create your first class to get started.'
                  : 'Try clearing or relaxing your filters.'
              }
            />
          ) : (
            <div className="space-y-2 max-h-[70vh] lg:max-h-[75vh] overflow-y-auto pr-1">
              {sorted.map((cls) => {
                const isActive = cls.id === selectedId;
                const z = toZonedTime(new Date(cls.starts_at), STUDIO_TIMEZONE);
                const dayLine = format(z, 'EEE, MMM d');
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => selectClass(cls.id)}
                    className={`w-full text-left rounded-2xl border bg-white p-3 transition-colors ${
                      isActive ? 'border-[#c9a96e] bg-[#c9a96e]/5' : 'border-[#e5e2dc] hover:border-[#c9a96e]/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wider text-[#6b6b6b]">{dayLine}</p>
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
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        <div ref={detailRef} className="lg:col-span-3">
          <div className="lg:sticky lg:top-4">
            {selected ? (
              <ClassDetailPanel
                key={selected.id}
                classId={selected.id}
                initialStatus={selected.status}
                onChanged={load}
                onDuplicate={openDuplicate}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-[#e5e2dc] bg-[#faf9f6] p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Pick a class on the left to edit details, manage the roster, or email the class.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ScheduleCreatorDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCreated={handleCreated}
        seed={drawerSeed}
        title={drawerTitle}
      />
    </div>
  );
}

function Chips({
  label,
  options,
  active,
  onToggle,
}: {
  label: string;
  options: Array<{ key: string; label: string }>;
  active: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-[#6b6b6b] font-medium mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = active.includes(o.key);
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onToggle(o.key)}
              aria-pressed={on}
              className={`min-h-[36px] px-3 rounded-full text-xs font-medium border transition-colors ${
                on
                  ? 'bg-[#2d2d2d] text-white border-[#2d2d2d]'
                  : 'bg-white text-[#6b6b6b] border-[#e5e2dc] hover:border-[#c9a96e]'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
