'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DayPicker } from './DayPicker';
import { ClassCard } from './ClassCard';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { STUDIO_TIMEZONE, formatStudioTime } from '@/lib/timezone';

interface ClassData {
  id: string;
  title: string;
  description?: string;
  starts_at: string;
  duration_minutes: number;
  max_capacity: number;
  spots_remaining: number;
  bookable?: boolean;
  bookable_from?: string;
}

interface ClassScheduleProps {
  isAuthenticated: boolean;
  hasCredits: boolean;
  credits?: number;
  /** class_id → booking_id for the current user's confirmed bookings. */
  bookingsByClassId?: Record<string, string>;
  /** class_id → { id, position } for the current user's active waitlist entries. */
  waitlistByClassId?: Record<string, { id: string; position: number }>;
}

const HORIZON_DAYS = 90;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ClassSchedule({
  isAuthenticated,
  hasCredits,
  credits,
  bookingsByClassId = {},
  waitlistByClassId = {},
}: ClassScheduleProps) {
  const searchParams = useSearchParams();
  const [view, setView] = useState<'calendar' | 'filter'>('calendar');
  // Track whether the user has explicitly picked a day. If a ?date= came in on
  // mount we honor it; otherwise we'll auto-advance to the next day that has
  // classes once the fetch lands. Once the user clicks a day in the picker the
  // flag flips and we leave their choice alone.
  const initialDateParam = searchParams?.get('date');
  const hadDateParam = !!(initialDateParam && /^\d{4}-\d{2}-\d{2}$/.test(initialDateParam));
  const [userPickedDate, setUserPickedDate] = useState<boolean>(hadDateParam);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (hadDateParam) {
      const [y, m, d] = initialDateParam!.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      if (!isNaN(dt.getTime())) return dt;
    }
    return new Date();
  });
  const [allClasses, setAllClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  function handleSelectDate(d: Date) {
    setUserPickedDate(true);
    setSelectedDate(d);
  }

  // Filter view state
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
  const [dayFilter, setDayFilter] = useState<number[]>([]);
  const [timeFilter, setTimeFilter] = useState<string[]>([]);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Prune the time selection when its options disappear (e.g. user picked 7 AM,
  // then narrowed by Thursday which has no 7 AM class).
  useEffect(() => {
    if (timeFilter.length === 0) return;
    const stillValid = new Set<string>();
    allClasses.forEach((c) => {
      const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
      if (monthFilter.length > 0) {
        const monthKey = `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}`;
        if (!monthFilter.includes(monthKey)) return;
      }
      if (dayFilter.length > 0 && !dayFilter.includes(z.getDay())) return;
      stillValid.add(format(z, 'HH:mm'));
    });
    const next = timeFilter.filter((t) => stillValid.has(t));
    if (next.length !== timeFilter.length) setTimeFilter(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter, dayFilter, allClasses]);

  // Single fetch covering 90 days; both views slice this in memory.
  useEffect(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setDate(to.getDate() + HORIZON_DAYS);
    to.setHours(23, 59, 59, 999);

    setLoading(true);
    fetch(`/api/classes?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((res) => res.json())
      .then((data) => {
        setAllClasses(data.classes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const datesWithClasses = useMemo(() => {
    const set = new Set<string>();
    allClasses.forEach((c) => {
      const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
      set.add(format(z, 'yyyy-MM-dd'));
    });
    return set;
  }, [allClasses]);

  // After classes load, if the user landed on /schedule with no date param and
  // today happens to have no classes, jump to the next day that does. The
  // request: "View Schedule / Book" should always open on the day with the next
  // available class — sold-out classes still count.
  useEffect(() => {
    if (loading || userPickedDate) return;
    const todayKey = format(toZonedTime(new Date(), STUDIO_TIMEZONE), 'yyyy-MM-dd');
    if (datesWithClasses.has(todayKey)) return;
    const next = Array.from(datesWithClasses)
      .filter((k) => k >= todayKey)
      .sort()[0];
    if (!next) return;
    const [y, m, d] = next.split('-').map(Number);
    setSelectedDate(new Date(y, m - 1, d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, datesWithClasses]);

  // Only surface filter chips for months that actually have classes posted.
  const months = useMemo(() => {
    const map = new Map<string, string>(); // 'YYYY-MM' → 'May 2026'
    allClasses.forEach((c) => {
      const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
      const key = `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, format(z, 'MMM yyyy'));
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, label]) => ({ key, label }));
  }, [allClasses]);

  // Days of week that have classes in the current dataset.
  const dayOptions = useMemo(() => {
    const present = new Set<number>();
    allClasses.forEach((c) => {
      const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
      present.add(z.getDay());
    });
    return Array.from(present)
      .sort((a, b) => a - b)
      .map((idx) => ({ idx, label: DAY_LABELS[idx] }));
  }, [allClasses]);

  // Time chips narrow as the month / day filters narrow — selecting "Thursday"
  // when classes run 8:30 and 9:30 AM on Thursdays drops every other time chip.
  const timeOptions = useMemo(() => {
    const map = new Map<string, string>();
    allClasses.forEach((c) => {
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
  }, [allClasses, monthFilter, dayFilter]);

  // Calendar view: classes for the selected day
  const dayClasses = useMemo(() => {
    const dayKey = format(selectedDate, 'yyyy-MM-dd');
    return allClasses.filter((c) => {
      const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
      return format(z, 'yyyy-MM-dd') === dayKey;
    });
  }, [allClasses, selectedDate]);

  // Filter view: classes matching chip filters, sorted by chosen direction.
  const filteredClasses = useMemo(() => {
    const matched = allClasses.filter((c) => {
      const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
      if (monthFilter.length > 0) {
        const monthKey = `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}`;
        if (!monthFilter.includes(monthKey)) return false;
      }
      if (dayFilter.length > 0) {
        if (!dayFilter.includes(z.getDay())) return false;
      }
      if (timeFilter.length > 0) {
        if (!timeFilter.includes(format(z, 'HH:mm'))) return false;
      }
      return true;
    });
    matched.sort((a, b) => {
      const ta = new Date(a.starts_at).getTime();
      const tb = new Date(b.starts_at).getTime();
      return sortDir === 'asc' ? ta - tb : tb - ta;
    });
    return matched;
  }, [allClasses, monthFilter, dayFilter, timeFilter, sortDir]);

  const renderClassCard = (cls: ClassData) => (
    <ClassCard
      key={cls.id}
      classData={cls}
      isAuthenticated={isAuthenticated}
      hasCredits={hasCredits}
      credits={credits}
      bookingId={bookingsByClassId[cls.id]}
      waitlistEntry={waitlistByClassId[cls.id]}
    />
  );

  return (
    <div>
      {/* View toggle */}
      <div role="tablist" aria-label="Schedule view" className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'calendar'}
          onClick={() => setView('calendar')}
          className={`min-h-[44px] rounded-xl border-2 px-4 text-sm font-medium transition-colors ${
            view === 'calendar'
              ? 'border-[#c9a96e] bg-[#c9a96e]/5 text-[#1a1a1a]'
              : 'border-[#e5e2dc] bg-white text-[#6b6b6b] hover:border-[#c9a96e]/50'
          }`}
        >
          Calendar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'filter'}
          onClick={() => setView('filter')}
          className={`min-h-[44px] rounded-xl border-2 px-4 text-sm font-medium transition-colors ${
            view === 'filter'
              ? 'border-[#c9a96e] bg-[#c9a96e]/5 text-[#1a1a1a]'
              : 'border-[#e5e2dc] bg-white text-[#6b6b6b] hover:border-[#c9a96e]/50'
          }`}
        >
          Filter
        </button>
      </div>

      {view === 'calendar' ? (
        <>
          <DayPicker
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            datesWithClasses={datesWithClasses}
          />
          <p className="text-[11px] text-muted-foreground mt-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle mr-1.5" />
            Days with scheduled classes
          </p>
          <div className="mt-4 space-y-3">
            {loading ? (
              <>
                <Skeleton variant="card" />
                <Skeleton variant="card" />
              </>
            ) : dayClasses.length === 0 ? (
              <EmptyState
                title={`No classes on ${format(selectedDate, 'EEEE')}`}
                description="Check another day!"
              />
            ) : (
              dayClasses.map(renderClassCard)
            )}
          </div>
        </>
      ) : (
        <>
          {/* Filter chips — Month + Day of week share a row */}
          <div className="rounded-2xl border border-[#e5e2dc] bg-white p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-end -mb-1">
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
                          onClick={() =>
                            setMonthFilter((f) =>
                              f.includes(m.key) ? f.filter((k) => k !== m.key) : [...f, m.key]
                            )
                          }
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
                          onClick={() =>
                            setDayFilter((f) =>
                              f.includes(d.idx) ? f.filter((k) => k !== d.idx) : [...f, d.idx]
                            )
                          }
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
                        onClick={() =>
                          setTimeFilter((f) =>
                            f.includes(t.key) ? f.filter((k) => k !== t.key) : [...f, t.key]
                          )
                        }
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

          <div className="flex items-center justify-between mt-2 mb-3 gap-3">
            <p className="text-[11px] text-muted-foreground">
              {filteredClasses.length} of {allClasses.length} classes match
            </p>
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[#e5e2dc] bg-white text-xs font-medium text-[#1a1a1a] hover:border-[#c9a96e] transition-colors"
              aria-label={`Sort ${sortDir === 'asc' ? 'newest first' : 'oldest first'}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {sortDir === 'asc' ? (
                  <>
                    <path d="M3 6h13" /><path d="M3 12h9" /><path d="M3 18h5" /><path d="M18 8v13" /><path d="m15 18 3 3 3-3" />
                  </>
                ) : (
                  <>
                    <path d="M3 6h13" /><path d="M3 12h9" /><path d="M3 18h5" /><path d="M18 21V8" /><path d="m15 11 3-3 3 3" />
                  </>
                )}
              </svg>
              {sortDir === 'asc' ? 'Soonest first' : 'Latest first'}
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          ) : filteredClasses.length === 0 ? (
            <EmptyState
              title="Nothing matches"
              description="Try clearing or relaxing your filters."
            />
          ) : (
            <FilteredByDay
              classes={filteredClasses}
              sortDir={sortDir}
              renderCard={renderClassCard}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * Renders filter-view classes grouped into per-day columns. On mobile this is
 * one column of stacked classes; on wider screens the grid expands so multiple
 * days sit side-by-side for a denser overview.
 */
function FilteredByDay({
  classes,
  sortDir,
  renderCard,
}: {
  classes: ClassData[];
  sortDir: 'asc' | 'desc';
  renderCard: (cls: ClassData) => React.ReactNode;
}) {
  const days = useMemo(() => {
    const map = new Map<string, ClassData[]>();
    classes.forEach((c) => {
      const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
      const key = format(z, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    const keys = Array.from(map.keys()).sort((a, b) =>
      sortDir === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
    );
    return keys.map((day) => {
      const [yy, mm, dd] = day.split('-').map(Number);
      const headerLabel = format(new Date(yy, (mm || 1) - 1, dd || 1), 'EEE, MMM d');
      const items = map.get(day)!.slice().sort((a, b) => {
        const ta = new Date(a.starts_at).getTime();
        const tb = new Date(b.starts_at).getTime();
        return ta - tb;
      });
      return { day, headerLabel, items };
    });
  }, [classes, sortDir]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {days.map(({ day, headerLabel, items }) => (
        <div key={day} className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-[#6b6b6b]">
            {headerLabel}
          </p>
          {items.map((cls) => renderCard(cls))}
        </div>
      ))}
    </div>
  );
}
