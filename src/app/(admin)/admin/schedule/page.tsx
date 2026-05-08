'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const DAYS: Array<{ idx: number; short: string; label: string }> = [
  { idx: 0, short: 'Sun', label: 'Sunday' },
  { idx: 1, short: 'Mon', label: 'Monday' },
  { idx: 2, short: 'Tue', label: 'Tuesday' },
  { idx: 3, short: 'Wed', label: 'Wednesday' },
  { idx: 4, short: 'Thu', label: 'Thursday' },
  { idx: 5, short: 'Fri', label: 'Friday' },
  { idx: 6, short: 'Sat', label: 'Saturday' },
];

export default function AdminSchedulePage() {
  const router = useRouter();
  const [title, setTitle] = useState('Mat Pilates/Sculpt');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(50);
  const [capacity, setCapacity] = useState(20);
  const [days, setDays] = useState<number[]>([2, 3, 4, 6]); // Tue Wed Thu Sat
  const [times, setTimes] = useState<string[]>(['07:00']);
  const today = new Date().toISOString().slice(0, 10);
  const [startsOn, setStartsOn] = useState(today);
  const [horizonWeeks, setHorizonWeeks] = useState(8);
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
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
    router.push('/admin/classes');
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Schedule classes</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Pick days and times, set a horizon, and we&rsquo;ll generate every class in one go. They&rsquo;re grouped so you can manage them as a series later.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Mat Pilates/Sculpt"
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
            min={10}
            max={240}
            required
          />
          <Input
            label="Max capacity"
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            min={1}
            max={200}
            required
          />
        </div>

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
                    &times;
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

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{error}</div>
        )}

        <Button type="submit" loading={submitting} className="w-full">
          Create classes
        </Button>
      </form>
    </div>
  );
}
