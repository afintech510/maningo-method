'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { STUDIO_TIMEZONE } from '@/lib/timezone';
import { fromZonedTime } from 'date-fns-tz';

const DAYS: Array<{ idx: number; short: string; label: string }> = [
  { idx: 0, short: 'Sun', label: 'Sunday' },
  { idx: 1, short: 'Mon', label: 'Monday' },
  { idx: 2, short: 'Tue', label: 'Tuesday' },
  { idx: 3, short: 'Wed', label: 'Wednesday' },
  { idx: 4, short: 'Thu', label: 'Thursday' },
  { idx: 5, short: 'Fri', label: 'Friday' },
  { idx: 6, short: 'Sat', label: 'Saturday' },
];

type Mode = 'recurring' | 'single';

export interface ScheduleCreatorSeed {
  mode?: Mode;
  title?: string;
  description?: string;
  duration_minutes?: number;
  max_capacity?: number;
  days_of_week?: number[];
  times_of_day?: string[];
  starts_on?: string;
  horizon_weeks?: number;
}

interface Props {
  seed?: ScheduleCreatorSeed;
  /** Called after a successful create. If omitted, the form navigates to /admin/classes. */
  onSuccess?: () => void;
}

export function ScheduleCreatorForm({ seed, onSuccess }: Props) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [mode, setMode] = useState<Mode>(seed?.mode ?? 'recurring');
  const [title, setTitle] = useState(seed?.title ?? 'Mat Pilates × Sculpt');
  const [description, setDescription] = useState(seed?.description ?? '');
  const [duration, setDuration] = useState(seed?.duration_minutes ?? 50);
  const [capacity, setCapacity] = useState(seed?.max_capacity ?? 20);
  const [days, setDays] = useState<number[]>(seed?.days_of_week ?? [2, 3, 4, 6]);
  const [times, setTimes] = useState<string[]>(seed?.times_of_day ?? ['07:00']);
  const [startsOn, setStartsOn] = useState(seed?.starts_on ?? today);
  const [horizonWeeks, setHorizonWeeks] = useState(seed?.horizon_weeks ?? 8);
  const [singleDate, setSingleDate] = useState(today);
  const [singleTime, setSingleTime] = useState('07:00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (idx: number) =>
    setDays((d) => (d.includes(idx) ? d.filter((x) => x !== idx) : [...d, idx].sort()));

  const updateTime = (i: number, val: string) => setTimes((t) => t.map((x, j) => (i === j ? val : x)));
  const addTime = () => setTimes((t) => [...t, '08:00']);
  const removeTime = (i: number) => setTimes((t) => t.filter((_, j) => j !== i));

  const previewCount = useMemo(() => {
    if (days.length === 0 || times.length === 0) return 0;
    return days.length * times.length * horizonWeeks;
  }, [days.length, times.length, horizonWeeks]);

  const endsOn = useMemo(() => {
    const d = new Date(startsOn);
    d.setDate(d.getDate() + horizonWeeks * 7 - 1);
    return d.toISOString().slice(0, 10);
  }, [startsOn, horizonWeeks]);

  function done() {
    if (onSuccess) onSuccess();
    else router.push('/admin/classes/manage');
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (mode === 'single') {
      if (!singleDate || !singleTime) {
        setError('Pick a date and a time.');
        return;
      }
      const localIso = `${singleDate}T${singleTime}:00`;
      const utc = fromZonedTime(localIso, STUDIO_TIMEZONE);
      if (utc.getTime() <= Date.now()) {
        setError('Class start must be in the future.');
        return;
      }
      setSubmitting(true);
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          starts_at: utc.toISOString(),
          duration_minutes: Number(duration),
          max_capacity: Number(capacity),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Could not create class.');
        setSubmitting(false);
        return;
      }
      done();
      return;
    }

    // recurring
    if (days.length === 0) {
      setError('Pick at least one day of the week.');
      return;
    }
    if (times.length === 0) {
      setError('Add at least one time of day.');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/admin/classes/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: description || null,
        duration_minutes: Number(duration),
        max_capacity: Number(capacity),
        days_of_week: days,
        times_of_day: times,
        starts_on: startsOn,
        horizon_weeks: Number(horizonWeeks),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message || 'Could not create the schedule.');
      setSubmitting(false);
      return;
    }
    done();
  }

  return (
    <div>
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <button
          type="button"
          onClick={() => setMode('recurring')}
          className={`min-h-[64px] rounded-xl border-2 p-3 text-left transition-colors ${
            mode === 'recurring' ? 'border-[#c9a96e] bg-[#c9a96e]/5' : 'border-[#e5e2dc] bg-white hover:border-[#c9a96e]/50'
          }`}
        >
          <p className="font-semibold text-sm">Recurring weekly</p>
          <p className="text-xs text-muted-foreground">Days × times × horizon weeks</p>
        </button>
        <button
          type="button"
          onClick={() => setMode('single')}
          className={`min-h-[64px] rounded-xl border-2 p-3 text-left transition-colors ${
            mode === 'single' ? 'border-[#c9a96e] bg-[#c9a96e]/5' : 'border-[#e5e2dc] bg-white hover:border-[#c9a96e]/50'
          }`}
        >
          <p className="font-semibold text-sm">Single class</p>
          <p className="text-xs text-muted-foreground">One date and time</p>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Mat Pilates × Sculpt"
        />
        <Input
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What students should expect"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Duration (min)"
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            min={15}
            max={180}
            required
          />
          <Input
            label="Max capacity"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            min={1}
            max={30}
            required
          />
        </div>

        {mode === 'recurring' ? (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Days of week</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => {
                  const on = days.includes(d.idx);
                  return (
                    <button
                      key={d.idx}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleDay(d.idx)}
                      className={`min-h-[44px] px-4 rounded-full text-sm font-medium border transition-colors ${
                        on
                          ? 'bg-[#2d2d2d] text-white border-[#2d2d2d]'
                          : 'bg-white text-[#6b6b6b] border-[#e5e2dc] hover:border-[#c9a96e]'
                      }`}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Times of day</label>
                <button
                  type="button"
                  onClick={addTime}
                  className="text-xs text-[#c9a96e] hover:underline min-h-[44px] px-2"
                >
                  + Add time
                </button>
              </div>
              <div className="space-y-2">
                {times.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={t}
                      onChange={(e) => updateTime(i, e.target.value)}
                      className="flex-1 h-12 px-3 rounded-lg border border-[#e5e2dc] bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent"
                    />
                    {times.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTime(i)}
                        aria-label="Remove time"
                        className="min-w-[44px] min-h-[44px] rounded-lg border border-[#e5e2dc] text-[#6b6b6b] hover:border-[#c9a96e] flex items-center justify-center"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Starts on"
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                required
              />
              <Input
                label="Horizon (weeks)"
                type="number"
                value={horizonWeeks}
                onChange={(e) => setHorizonWeeks(Number(e.target.value))}
                min={1}
                max={52}
                required
              />
            </div>

            <div className="rounded-xl border border-[#e5e2dc] bg-[#faf9f6] p-4 text-sm">
              <p className="font-medium">
                {previewCount === 0
                  ? 'Set days and times to see a preview.'
                  : `Will create ${previewCount} class${previewCount === 1 ? '' : 'es'} between ${startsOn} and ${endsOn}.`}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Date"
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                required
              />
              <div>
                <label className="block text-sm font-medium mb-1.5">Time</label>
                <input
                  type="time"
                  value={singleTime}
                  onChange={(e) => setSingleTime(e.target.value)}
                  required
                  className="w-full h-12 px-3 text-base rounded-lg border border-[#e5e2dc] bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent"
                />
              </div>
            </div>
            <div className="rounded-xl border border-[#e5e2dc] bg-[#faf9f6] p-4 text-sm">
              <p className="font-medium">
                Will create 1 class on {singleDate} at {singleTime}.
              </p>
            </div>
          </>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>
        )}

        <Button type="submit" loading={submitting} className="w-full">
          {mode === 'single' ? 'Create class' : 'Create classes'}
        </Button>
      </form>
    </div>
  );
}
