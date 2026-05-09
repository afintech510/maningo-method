'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DayPicker } from './DayPicker';
import { ClassCard } from './ClassCard';
import { Skeleton } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { STUDIO_TIMEZONE, formatStudioTime, formatStudioDate } from '@/lib/timezone';

interface ClassData {
  id: string;
  title: string;
  description?: string;
  starts_at: string;
  duration_minutes: number;
  max_capacity: number;
  spots_remaining: number;
}

interface ClassScheduleProps {
  isAuthenticated: boolean;
  hasCredits: boolean;
  credits?: number;
  /** class_id → booking_id for the current user's confirmed bookings. */
  bookingsByClassId?: Record<string, string>;
}

const HORIZON_DAYS = 90;
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

export function ClassSchedule({
  isAuthenticated,
  hasCredits,
  credits,
  bookingsByClassId = {},
}: ClassScheduleProps) {
  const searchParams = useSearchParams();
  const [view, setView] = useState<'calendar' | 'filter'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const dateParam = searchParams?.get('date');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [y, m, d] = dateParam.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      if (!isNaN(dt.getTime())) return dt;
    }
    return new Date();
  });
  const [allClasses, setAllClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter view state
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
  const [dayFilter, setDayFilter] = useState<number[]>([]);
  const [timeFilter, setTimeFilter] = useState<string[]>([]);

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

  const months = useMemo(() => nextThreeMonths(), []);

  const timeOptions = useMemo(() => {
    const map = new Map<string, string>();
    allClasses.forEach((c) => {
      const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
      const key = format(z, 'HH:mm');
      if (!map.has(key)) map.set(key, formatStudioTime(c.starts_at));
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, label]) => ({ key, label }));
  }, [allClasses]);

  // Calendar view: classes for the selected day
  const dayClasses = useMemo(() => {
    const dayKey = format(selectedDate, 'yyyy-MM-dd');
    return allClasses.filter((c) => {
      const z = toZonedTime(new Date(c.starts_at), STUDIO_TIMEZONE);
      return format(z, 'yyyy-MM-dd') === dayKey;
    });
  }, [allClasses, selectedDate]);

  // Filter view: classes matching chip filters
  const filteredClasses = useMemo(() => {
    return allClasses.filter((c) => {
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
  }, [allClasses, monthFilter, dayFilter, timeFilter]);

  const renderClassCard = (cls: ClassData) => (
    <ClassCard
      key={cls.id}
      classData={cls}
      isAuthenticated={isAuthenticated}
      hasCredits={hasCredits}
      credits={credits}
      bookingId={bookingsByClassId[cls.id]}
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
            onSelectDate={setSelectedDate}
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
          {/* Filter chips */}
          <div className="rounded-2xl border border-[#e5e2dc] bg-white p-3 sm:p-4 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] uppercase tracking-wider text-[#6b6b6b] font-medium">Month</p>
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
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#6b6b6b] font-medium mb-1.5">Day of week</p>
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS.map((label, idx) => {
                  const on = dayFilter.includes(idx);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        setDayFilter((f) =>
                          f.includes(idx) ? f.filter((k) => k !== idx) : [...f, idx]
                        )
                      }
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

          <p className="text-[11px] text-muted-foreground mt-2 mb-3">
            {filteredClasses.length} of {allClasses.length} classes match
          </p>

          <div className="space-y-3">
            {loading ? (
              <>
                <Skeleton variant="card" />
                <Skeleton variant="card" />
              </>
            ) : filteredClasses.length === 0 ? (
              <EmptyState
                title="Nothing matches"
                description="Try clearing or relaxing your filters."
              />
            ) : (
              filteredClasses.map((cls) => (
                <div key={cls.id}>
                  <p className="text-base sm:text-lg font-bold text-[#1a1a1a] mb-1.5">
                    {formatStudioDate(cls.starts_at, 'EEE, MMM d')}
                  </p>
                  {renderClassCard(cls)}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
