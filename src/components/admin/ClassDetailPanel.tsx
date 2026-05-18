'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/feedback/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { formatStudioDateTime, STUDIO_TIMEZONE } from '@/lib/timezone';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { ClassRoster, type Enrollment } from './ClassRoster';
import { ClassEmailForm } from './ClassEmailForm';
import type { ScheduleCreatorSeed } from './ScheduleCreatorForm';

interface ClassData {
  id: string;
  class_title: string;
  starts_at: string;
  duration_minutes: number;
  max_capacity: number;
  status: string;
}

interface Props {
  classId: string;
  initialStatus: string;
  /** Called whenever an action mutates the underlying class (edit, cancel, roster add/remove). */
  onChanged: () => void;
  onDuplicate: (seed: ScheduleCreatorSeed) => void;
}

type Section = 'details' | 'roster' | 'email' | 'actions';

export function ClassDetailPanel({ classId, initialStatus, onChanged, onDuplicate }: Props) {
  const [data, setData] = useState<ClassData | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSection, setOpenSection] = useState<Section>('roster');

  // Editing
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStartsAt, setEditStartsAt] = useState('');
  const [editDuration, setEditDuration] = useState(50);
  const [editCapacity, setEditCapacity] = useState(20);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Cancel
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useMemo(() => async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/classes/${classId}/enrollments`);
    const payload = await res.json();
    if (res.ok) {
      const next: ClassData = {
        id: payload.class_id,
        class_title: payload.class_title,
        starts_at: payload.starts_at,
        duration_minutes: payload.duration_minutes ?? 50,
        max_capacity: payload.max_capacity,
        status: initialStatus,
      };
      setData(next);
      setEnrollments(payload.enrollments || []);
      const z = toZonedTime(new Date(next.starts_at), STUDIO_TIMEZONE);
      setEditTitle(next.class_title);
      setEditStartsAt(format(z, "yyyy-MM-dd'T'HH:mm"));
      setEditDuration(next.duration_minutes);
      setEditCapacity(next.max_capacity);
    }
    setLoading(false);
  }, [classId, initialStatus]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!data) return;
    setSaveError(null);
    if (!editTitle.trim()) return setSaveError('Title is required.');
    if (editDuration < 10 || editDuration > 240) return setSaveError('Duration must be 10–240 min.');
    if (editCapacity < 1 || editCapacity > 200) return setSaveError('Capacity must be 1–200.');
    if (editCapacity < enrollments.length) {
      return setSaveError(`Capacity can't be below current enrollment (${enrollments.length}).`);
    }
    let startsAtIso: string;
    try {
      const utc = fromZonedTime(editStartsAt, STUDIO_TIMEZONE);
      if (isNaN(utc.getTime())) throw new Error('bad date');
      startsAtIso = utc.toISOString();
    } catch {
      return setSaveError('Invalid date/time.');
    }
    setSaving(true);
    const res = await fetch(`/api/admin/classes/${classId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle.trim(),
        starts_at: startsAtIso,
        duration_minutes: editDuration,
        max_capacity: editCapacity,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSaveError(body?.error?.message || 'Failed to save.');
      return;
    }
    setEditing(false);
    await load();
    onChanged();
  }

  async function handleCancel() {
    setCancelling(true);
    const res = await fetch(`/api/admin/classes/${classId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    setCancelling(false);
    setShowCancel(false);
    if (res.ok) {
      onChanged();
    }
  }

  function handleDuplicate() {
    if (!data) return;
    const z = toZonedTime(new Date(data.starts_at), STUDIO_TIMEZONE);
    const weekday = z.getDay();
    const hhmm = format(z, 'HH:mm');
    // Next occurrence of that weekday from today (studio TZ).
    const todayZ = toZonedTime(new Date(), STUDIO_TIMEZONE);
    const todayDow = todayZ.getDay();
    const delta = (weekday - todayDow + 7) % 7 || 7; // skip "today" → at least a week out
    const next = new Date(todayZ);
    next.setDate(next.getDate() + delta);
    const startsOn = format(next, 'yyyy-MM-dd');
    onDuplicate({
      mode: 'recurring',
      title: data.class_title,
      duration_minutes: data.duration_minutes,
      max_capacity: data.max_capacity,
      days_of_week: [weekday],
      times_of_day: [hhmm],
      starts_on: startsOn,
      horizon_weeks: 4,
    });
  }

  if (loading || !data) {
    return (
      <div className="rounded-2xl border border-[#e5e2dc] bg-white p-4">
        <Skeleton variant="card" />
      </div>
    );
  }

  const isCancelled = data.status === 'cancelled';

  return (
    <div className="rounded-2xl border border-[#e5e2dc] bg-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#e5e2dc] bg-[#faf9f6]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-[#c9a96e] font-medium mb-0.5">
              Selected class
            </p>
            <h2 className="text-lg font-bold leading-tight">{data.class_title}</h2>
            <p className="text-sm text-muted-foreground">{formatStudioDateTime(data.starts_at)}</p>
            <p className="text-xs text-muted-foreground">
              {data.duration_minutes} min &middot; {enrollments.length}/{data.max_capacity} booked
            </p>
          </div>
          <Badge variant={isCancelled ? 'error' : data.status === 'scheduled' ? 'success' : 'neutral'}>
            {data.status}
          </Badge>
        </div>
      </div>

      {/* Sections */}
      <Section
        title="Details"
        open={openSection === 'details'}
        onToggle={() => setOpenSection((s) => (s === 'details' ? 'actions' : 'details'))}
      >
        {!editing ? (
          <div className="space-y-2 text-sm">
            <Row label="Title" value={data.class_title} />
            <Row label="Starts" value={formatStudioDateTime(data.starts_at)} />
            <Row label="Duration" value={`${data.duration_minutes} min`} />
            <Row label="Max capacity" value={String(data.max_capacity)} />
            <div className="pt-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)} disabled={isCancelled}>
                Edit
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">Title</span>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1 w-full h-11 rounded-lg border border-[#e5e2dc] px-3 text-sm bg-white"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">
                Date &amp; time (studio time, ET)
              </span>
              <input
                type="datetime-local"
                value={editStartsAt}
                onChange={(e) => setEditStartsAt(e.target.value)}
                className="mt-1 w-full h-11 rounded-lg border border-[#e5e2dc] px-3 text-sm bg-white"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">Duration (min)</span>
                <input
                  type="number"
                  min={10}
                  max={240}
                  value={editDuration}
                  onChange={(e) => setEditDuration(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 w-full h-11 rounded-lg border border-[#e5e2dc] px-3 text-sm bg-white"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">Max capacity</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 w-full h-11 rounded-lg border border-[#e5e2dc] px-3 text-sm bg-white"
                />
              </label>
            </div>
            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {saveError}
              </p>
            )}
            <div className="flex gap-3">
              <Button onClick={handleSave} loading={saving}>
                Save changes
              </Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>
                Discard
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Section
        title={`Roster (${enrollments.length}/${data.max_capacity})`}
        open={openSection === 'roster'}
        onToggle={() => setOpenSection((s) => (s === 'roster' ? 'actions' : 'roster'))}
      >
        {isCancelled ? (
          <p className="text-sm text-muted-foreground">This class is cancelled — roster is frozen.</p>
        ) : (
          <ClassRoster
            classId={classId}
            capacity={data.max_capacity}
            enrollments={enrollments}
            onChange={() => {
              load();
              onChanged();
            }}
          />
        )}
      </Section>

      <Section
        title="Email this class"
        open={openSection === 'email'}
        onToggle={() => setOpenSection((s) => (s === 'email' ? 'actions' : 'email'))}
      >
        <ClassEmailForm classId={classId} recipientCount={enrollments.length} />
      </Section>

      <Section
        title="Actions"
        open={openSection === 'actions'}
        onToggle={() => setOpenSection((s) => (s === 'actions' ? 'details' : 'actions'))}
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={handleDuplicate}>
            Duplicate
          </Button>
          <a
            href={`/admin/classes/${classId}/attendance`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-9 px-4 rounded-full border border-[#e5e2dc] bg-white text-sm font-medium text-[#1a1a1a] hover:border-[#c9a96e] transition-colors"
          >
            Print attendance
          </a>
          <Button
            variant="destructive"
            size="sm"
            disabled={isCancelled}
            onClick={() => setShowCancel(true)}
          >
            Cancel class
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Cancelling notifies every booked student and triggers a drop-in refund report.
        </p>
      </Section>

      <Modal open={showCancel} onClose={() => setShowCancel(false)} title="Cancel class?">
        <p className="text-sm text-muted-foreground mb-4">
          This will cancel all bookings and notify students. Drop-in students will receive a refund report.
        </p>
        <div className="flex gap-3">
          <Button variant="destructive" className="flex-1" onClick={handleCancel} loading={cancelling}>
            Cancel class
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => setShowCancel(false)}>
            Keep class
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#e5e2dc] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#faf9f6] transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold">{title}</span>
        <span className={`text-lg leading-none transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[#f3f1ed] last:border-b-0 py-1.5">
      <span className="text-xs uppercase tracking-wider text-[#6b6b6b] font-medium">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  );
}
